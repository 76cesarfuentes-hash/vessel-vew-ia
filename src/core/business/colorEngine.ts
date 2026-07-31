import { TERMINAL_PROFILES } from '../models/terminal';
import { normalizePortCode, NO_DATA } from '../parser/portNormalizer';
import { Container } from '../models/container';
import { checkIsDischargeContainer } from './restowEngine';

// Colors defined in Business Rules
export const IMPORT_ORANGE = '#F97316'; // Naranja (Importación)
export const TRANSIT_GRAY = '#6B7280';   // Gris (Tránsito)
export const RESTOW_RED = '#EF4444';     // Rojo (Restiba)

// Specific port colors for Export (Carga)
export const PORT_COLORS: Record<string, string> = {
  'MXVER': '#3B82F6', // Azul (Veracruz / ICAVE)
  'VER': '#3B82F6',
  'MXZLO': '#10B981', // Verde (Manzanillo / TIMSA)
  'ZLO': '#10B981',
  'MXLZC': '#EAB308', // Amarillo (Lázaro Cárdenas)
  'LZC': '#EAB308',
  'SHA': '#EC4899',   // Rosa (Shanghai)
  'CNSHA': '#EC4899',
  'HKG': '#00E5FF',   // Celeste (Hong Kong)
  'HKHKG': '#00E5FF',
  'MXESE': '#8B5CF6', // Púrpura (Ensenada)
  'ETI': '#8B5CF6',
  'CLSAI': '#0EA5E9', // Azul Cielo (San Antonio)
  'CLVAP': '#14B8A6', // Turquesa (Valparaíso)
  'PECLL': '#84CC16', // Verde Lima (Callao)
  'ECMEC': '#F43F5E'  // Rosa Rojo (Manta/Guayaquil)
};

// Reserved HSL hue band to strictly avoid collision with Orange (0-50 deg)
const ORANGE_MIN_HUE = 0;
const ORANGE_MAX_HUE = 50;

// High-contrast, vibrant palette of distinct non-orange colors for non-import PODs
const PALETTE_COLORS = [
  '#00E5FF', // Vivid Cyan
  '#10B981', // Emerald
  '#3B82F6', // Cobalt Blue
  '#A855F7', // Bright Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#84CC16', // Lime Green
  '#6366F1', // Indigo
  '#F43F5E', // Rose Red
  '#0EA5E9', // Sky Blue
  '#D946EF', // Fuchsia
  '#8B5CF6', // Violet
  '#06B6D4'  // Dark Cyan
];

const podColorMap: Record<string, string> = {};

/**
 * Reset color assignments when switching terminal or new BAPLIE loaded
 */
export function resetPodColors() {
  Object.keys(podColorMap).forEach(k => delete podColorMap[k]);
}

/**
 * Helper to obtain the specific color assigned to a Port for Exportation
 */
export function getPortColor(portCode: string): string {
  if (!portCode || portCode === NO_DATA) return '#3B82F6';
  const norm = normalizePortCode(portCode);
  if (PORT_COLORS[norm]) return PORT_COLORS[norm];
  if (PORT_COLORS[portCode.toUpperCase()]) return PORT_COLORS[portCode.toUpperCase()];

  if (podColorMap[norm]) return podColorMap[norm];

  const usedColors = new Set(Object.values(podColorMap));
  for (const pColor of PALETTE_COLORS) {
    if (!usedColors.has(pColor)) {
      podColorMap[norm] = pColor;
      return pColor;
    }
  }

  return '#3B82F6';
}

/**
 * Classification Result according to Business Rules
 */
export type MiniPlanClassification = 'RESTIBA' | 'IMPORTACIÓN' | 'EXPORTACIÓN' | 'TRÁNSITO';

export interface ClassificationResult {
  type: MiniPlanClassification;
  color: string;
  label: string;
}

/**
 * REGLAS DE NEGOCIO - PRIORIDAD DE RENDER DE CLASIFICACIÓN Y COLORES:
 * 1. ¿Es Restiba? -> SI -> ROJO (#EF4444)
 * 2. ¿La operación es Descarga?
 *    SI -> ¿POD == PuertoOperativo?
 *          SI -> IMPORTACIÓN -> NARANJA (#F97316)
 *          NO -> TRÁNSITO -> GRIS (#6B7280)
 * 3. ¿La operación es Carga?
 *    SI -> ¿POD == PuertoOperativo? (o es de Carga / Exportación)
 *          SI -> EXPORTACIÓN -> COLOR DEL PUERTO (Ej: MXVER=Azul, MXZLO=Verde, etc.)
 *          NO -> TRÁNSITO -> GRIS (#6B7280)
 */
export function getMiniPlanClassificationAndColor(
  container: Container,
  operation: 'DESCARGA' | 'CARGA',
  activeTerminalKey: string,
  isRestow: boolean = false
): ClassificationResult {
  // 1. ¿Es Restiba?
  if (isRestow) {
    return {
      type: 'RESTIBA',
      color: RESTOW_RED,
      label: 'RESTIBA'
    };
  }

  const isDischargeAtPort = checkIsDischargeContainer(container, activeTerminalKey);

  // 2. ¿La operación es Descarga?
  if (operation === 'DESCARGA') {
    if (isDischargeAtPort) {
      return {
        type: 'IMPORTACIÓN',
        color: IMPORT_ORANGE,
        label: 'IMPORTACIÓN'
      };
    } else {
      return {
        type: 'TRÁNSITO',
        color: TRANSIT_GRAY,
        label: 'TRÁNSITO'
      };
    }
  }

  // 3. ¿La operación es Carga?
  if (operation === 'CARGA') {
    // Para Carga, la terminal define el PuertoOperativo de carga
    const isExport = container.operation === 'LOAD' || isDischargeAtPort || container.pol === activeTerminalKey;
    if (isExport) {
      const pColor = getPortColor(container.pod || activeTerminalKey);
      return {
        type: 'EXPORTACIÓN',
        color: pColor,
        label: 'EXPORTACIÓN'
      };
    } else {
      return {
        type: 'TRÁNSITO',
        color: TRANSIT_GRAY,
        label: 'TRÁNSITO'
      };
    }
  }

  return {
    type: 'TRÁNSITO',
    color: TRANSIT_GRAY,
    label: 'TRÁNSITO'
  };
}

/**
 * Returns the exact operational color for a container based on its POD and active terminal.
 */
export function getContainerColor(
  pod: string | undefined | null,
  activeTerminalKey: string
): string {
  if (!pod || pod === NO_DATA) return '#374151';

  const normalizedPod = pod.trim().toUpperCase();
  const profile = TERMINAL_PROFILES[activeTerminalKey] || TERMINAL_PROFILES.VER;
  const isImport = profile.homePorts.some(hp => hp.toUpperCase() === normalizedPod) ||
                   activeTerminalKey.toUpperCase() === normalizedPod;

  // RULE: Orange is ONLY for Discharge/Import
  if (isImport) {
    return IMPORT_ORANGE;
  }

  if (PORT_COLORS[normalizedPod]) {
    return PORT_COLORS[normalizedPod];
  }

  if (podColorMap[normalizedPod]) {
    return podColorMap[normalizedPod];
  }

  const usedColors = new Set(Object.values(podColorMap));
  for (const pColor of PALETTE_COLORS) {
    if (!usedColors.has(pColor)) {
      podColorMap[normalizedPod] = pColor;
      return pColor;
    }
  }

  let seed = 0;
  for (let i = 0; i < normalizedPod.length; i++) {
    seed = (seed * 31 + normalizedPod.charCodeAt(i)) >>> 0;
  }

  let hue = (seed % 310) + 51;
  let guard = 0;

  const existingHues = Object.values(podColorMap)
    .map(c => {
      const m = c.match(/hsl\(([\d.]+)/);
      return m ? parseFloat(m[1]) : null;
    })
    .filter((h): h is number => h !== null);

  while (
    ((hue >= ORANGE_MIN_HUE && hue <= ORANGE_MAX_HUE) ||
     existingHues.some(h => Math.abs(h - hue) < 25)) &&
    guard < 360
  ) {
    hue = (hue + 28) % 360;
    if (hue <= ORANGE_MAX_HUE) hue += 51;
    guard++;
  }

  const assigned = `hsl(${Math.round(hue)}, 85%, 45%)`;
  podColorMap[normalizedPod] = assigned;
  return assigned;
}

/**
 * Determines text contrast color (white or black) based on background hex or hsl color.
 */
export function getContrastTextColor(bgColor: string): '#FFFFFF' | '#000000' {
  if (!bgColor) return '#FFFFFF';
  
  if (bgColor.startsWith('#')) {
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#000000' : '#FFFFFF';
  }

  if (bgColor.startsWith('hsl')) {
    const m = bgColor.match(/hsl\(\s*[\d.]+\s*,\s*[\d.]+%?\s*,\s*([\d.]+)%?\s*\)/i);
    if (m) {
      const lightness = parseFloat(m[1]);
      return lightness >= 55 ? '#000000' : '#FFFFFF';
    }
  }

  return '#FFFFFF';
}

