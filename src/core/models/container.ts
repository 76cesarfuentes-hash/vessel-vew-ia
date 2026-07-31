export type CargoType = 'DC' | 'RF' | 'DG' | 'OS' | 'MT' | 'TK';

export type ContainerStatus = 'FULL' | 'EMPTY' | '4' | '5'; // '4' = empty, '5' = full in EDIFACT

/**
 * Checks if a container has a valid active temperature specified.
 */
export function hasValidTemp(temp?: string | null): boolean {
  if (!temp) return false;
  const t = temp.trim().toUpperCase();
  if (
    !t ||
    t === 'DRY' ||
    t === 'N/A' ||
    t === '-' ||
    t === 'DATO NO DISPONIBLE' ||
    t === 'NONE' ||
    t === 'NO' ||
    t === 'OFF' ||
    t === 'AMB' ||
    t === 'AMBIENT'
  ) {
    return false;
  }
  return true;
}

/**
 * Returns the effective cargo type according to rules:
 * - Reefers without temperature are NOT 'RF'. If empty -> 'MT', if full -> 'DC'.
 * - Reefers WITH temperature are 'RF'.
 * - DG containers remain 'DG'.
 * - Empty containers remain 'MT'.
 * - OOG containers remain 'OS'.
 */
export function getEffectiveCargoType(c: Container): CargoType {
  const isEmpty = c.status === 'EMPTY' || (c.cargoType as string) === 'MT';

  // Check if it's marked as RF or has temp field
  const isReeferUnit = c.cargoType === 'RF' || hasValidTemp(c.temp);

  if (isReeferUnit) {
    if (hasValidTemp(c.temp)) {
      return 'RF'; // Only if it has temperature specified!
    } else {
      // Reefer unit without temperature:
      return isEmpty ? 'MT' : 'DC';
    }
  }

  if (c.cargoType === 'DG' || (c.imoClass && c.imoClass !== 'Dato no disponible' && c.imoClass !== '-' && c.imoClass !== 'NONE' && c.imoClass !== 'NO HAZMAT')) {
    return 'DG';
  }

  if (isEmpty) {
    return 'MT';
  }

  if (c.cargoType === 'OS' || c.hasDim || Boolean(c.oogDim && c.oogDim !== 'Dato no disponible' && c.oogDim !== '-')) {
    return 'OS';
  }

  if (c.cargoType === 'TK') {
    return 'TK';
  }

  return c.cargoType || 'DC';
}

export interface OOGDimensions {
  top?: number;
  right?: number;
  left?: number;
  front?: number;
  back?: number;
  rawText?: string;
}

export interface Container {
  id: string; // Container Number (e.g. MSKU1234567 or "Dato no disponible")
  iso: string; // ISO Code (e.g. 2210, 4510)
  position: string; // 7-char bay-row-tier (e.g. 0140282)
  bay: string; // 2 or 3 digit bay string (e.g. "14" or "014")
  row: string; // 2 digit row string (e.g. "02")
  tier: string; // 2 digit tier string (e.g. "82")
  size: 20 | 40 | 45;
  status: 'FULL' | 'EMPTY';
  pol: string; // Port of Loading (3-letter normalized, e.g. "VER")
  pod: string; // Port of Discharge (3-letter normalized, e.g. "HOU")
  operator: string; // Shipping Line / Carrier Code
  cargoType: CargoType;
  weight: string; // Weight in KG or "Dato no disponible"
  weightKg?: number;
  imoClass: string; // e.g. "3" or "Dato no disponible"
  unNumber: string; // e.g. "1203" or "Dato no disponible"
  temp: string; // e.g. "-18.0°C" or "DRY" or "Dato no disponible"
  ventilation?: string;
  hasDim: boolean;
  oogTop?: boolean;
  oogLeft?: boolean;
  oogRight?: boolean;
  oogFront?: boolean;
  oogBack?: boolean;
  oogDim?: string;
  // Dynamic or simulated fields
  matched?: boolean;
  source?: 'BAPLIE' | 'MOVINS' | 'EXCEL' | 'BOTH';
  operation?: 'DISCHARGE' | 'LOAD' | 'NO MOVE' | 'RESTOW';
  isRestow?: boolean;
  originalDischargePosition?: string;
  autoAssignedPosition?: boolean;
  restowReason?: string;
}

export interface BayPosition {
  bay: string;
  row: string;
  tier: string;
  isHold: boolean;
}
