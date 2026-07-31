import { Container } from '../models/container';
import { TERMINAL_PROFILES } from '../models/terminal';
import { normalizePortCode, NO_DATA } from '../parser/portNormalizer';

export interface ParsedPos {
  rawPos: string;
  bayNum: number;
  oddBay: number;
  rowNum: number;
  rowStr: string;
  tierNum: number;
  tierStr: string;
  isHold: boolean;
  isDeck: boolean;
}

export function parsePosition(
  posStr: string,
  bayAlt?: string,
  rowAlt?: string,
  tierAlt?: string
): ParsedPos {
  let pos = (posStr || '').replace(/\D/g, '');
  let b = (bayAlt || '').trim();
  let r = (rowAlt || '').trim();
  let t = (tierAlt || '').trim();

  if (pos.length === 6) {
    if (!b || b === NO_DATA) b = pos.substring(0, 2);
    if (!r || r === NO_DATA) r = pos.substring(2, 4);
    if (!t || t === NO_DATA) t = pos.substring(4, 6);
  } else if (pos.length === 7) {
    if (!b || b === NO_DATA) b = pos.substring(0, 3);
    if (!r || r === NO_DATA) r = pos.substring(3, 5);
    if (!t || t === NO_DATA) t = pos.substring(5, 7);
  } else if (pos.length === 5) {
    pos = pos.padStart(6, '0');
    if (!b || b === NO_DATA) b = pos.substring(0, 2);
    if (!r || r === NO_DATA) r = pos.substring(2, 4);
    if (!t || t === NO_DATA) t = pos.substring(4, 6);
  }

  const bayNum = parseInt(b, 10) || 0;
  const rowNum = parseInt(r, 10) || 0;
  const tierNum = parseInt(t, 10) || 0;

  const oddBay = bayNum % 2 === 0 && bayNum > 0 ? bayNum - 1 : bayNum;

  return {
    rawPos: posStr,
    bayNum,
    oddBay,
    rowNum,
    rowStr: rowNum.toString().padStart(2, '0'),
    tierNum,
    tierStr: tierNum.toString().padStart(2, '0'),
    isHold: tierNum < 70,
    isDeck: tierNum >= 70
  };
}

export function checkIsDischargeContainer(c: Container, activeTerminalKey: string): boolean {
  const terminalProfile = TERMINAL_PROFILES[activeTerminalKey] || TERMINAL_PROFILES.VER;
  const homePorts = terminalProfile.homePorts.map(p => normalizePortCode(p));
  const activeNorm = normalizePortCode(activeTerminalKey);
  const cPodNorm = normalizePortCode(c.pod);
  return cPodNorm === activeNorm || homePorts.includes(cPodNorm);
}

export interface RestowItem {
  id: string; // Restow container ID
  container: Container;
  restowType: 'STACK_BLOCK' | 'HATCH_BLOCK';
  restowTypeLabel: string;
  reason: string;
  blockedContainerId: string;
  blockedContainerPos: string;
  blockedContainerPod: string;
}

/**
 * Section Bay calculation helper:
 * Maps 20ft bays (e.g. 61, 63) and 40ft bays (e.g. 62) to the single 40ft Section Bay ID (e.g. 62).
 */
export function getSectionBay(bayNum: number): number {
  if (bayNum <= 0) return 0;
  if (bayNum % 2 === 0) return bayNum;
  if ((bayNum + 1) % 4 === 2) return bayNum + 1;
  return bayNum - 1;
}

/**
 * Detects all restows (shifting units) required at the current terminal.
 * STRICT RULE: Restows occur EXCLUSIVELY when non-importation containers
 * sit directly ABOVE a discharge/importation container (Orange) in the same stack
 * (same row, higher tier).
 */
export function detectRestows(
  containers: Container[],
  activeTerminalKey: string
): RestowItem[] {
  if (!containers || containers.length === 0) return [];

  // Group containers by physical stack: sectionBay | rowStr
  const stackMap = new Map<string, { container: Container; pos: ParsedPos }[]>();

  containers.forEach(c => {
    const pos = parsePosition(c.position, c.bay, c.row, c.tier);
    const secBay = getSectionBay(pos.bayNum);
    const key = `${secBay}|${pos.rowStr}`;

    if (!stackMap.has(key)) {
      stackMap.set(key, []);
    }
    stackMap.get(key)!.push({ container: c, pos });
  });

  const restowMap = new Map<string, RestowItem>();

  // Iterate over every stack sorted by tier ascending (bottom to top)
  stackMap.forEach((stackItems) => {
    stackItems.sort((a, b) => a.pos.tierNum - b.pos.tierNum);

    for (let i = 0; i < stackItems.length; i++) {
      const lower = stackItems[i];
      const lowerIsDischarge = checkIsDischargeContainer(lower.container, activeTerminalKey);

      // RESTOW MANDATE: Lower container MUST be a Discharge / Importation container (Orange)
      if (lowerIsDischarge) {
        // Any non-discharge container located ABOVE this Orange container in the same stack is a Restow!
        for (let j = i + 1; j < stackItems.length; j++) {
          const upper = stackItems[j];
          if (upper.pos.tierNum > lower.pos.tierNum) {
            const upperIsDischarge = checkIsDischargeContainer(upper.container, activeTerminalKey);

            if (!upperIsDischarge) {
              const restowKey = upper.container.id;
              if (!restowMap.has(restowKey)) {
                restowMap.set(restowKey, {
                  id: upper.container.id,
                  container: upper.container,
                  restowType: 'STACK_BLOCK',
                  restowTypeLabel: 'Bloqueo Directo en Stack',
                  reason: `Unidad en Nivel ${upper.pos.tierStr} sobrepuesta directamente sobre el contenedor de Importación (Naranja) ${lower.container.id} (${lower.container.position})`,
                  blockedContainerId: lower.container.id,
                  blockedContainerPos: lower.container.position,
                  blockedContainerPod: lower.container.pod
                });
              }
            }
          }
        }
      }
    }
  });

  return Array.from(restowMap.values());
}

export type WeightCategory = 'PESADO' | 'MEDIANO' | 'LIGERO / VACÍO';

export interface WeightViolationItem {
  id: string;
  bay: string;
  row: string;
  topContainer: Container;
  topWeightKg: number;
  topCategory: WeightCategory;
  topTier: string;
  bottomContainer: Container;
  bottomWeightKg: number;
  bottomCategory: WeightCategory;
  bottomTier: string;
  severity: 'CRÍTICO' | 'ADVERTENCIA';
  description: string;
}

export function getWeightCategory(c: Container): { category: WeightCategory; weightKg: number; rank: number } {
  const isEmpty = c.status === 'EMPTY' || c.cargoType === 'MT';
  let wKg = c.weightKg ?? parseFloat(c.weight);
  if (isNaN(wKg)) wKg = 0;

  if (isEmpty || wKg < 10000) {
    return { category: 'LIGERO / VACÍO', weightKg: wKg, rank: 1 };
  } else if (wKg < 18000) {
    return { category: 'MEDIANO', weightKg: wKg, rank: 2 };
  } else {
    return { category: 'PESADO', weightKg: wKg, rank: 3 };
  }
}

/**
 * Analyzes vertical weight distribution in stacks according to the Rule of Good Stowage:
 * "Pesados abajo, Medianos siguiente, Ligeros arriba".
 * Detects weight inversion violations.
 */
export function analyzeWeightStowage(containers: Container[]): WeightViolationItem[] {
  if (!containers || containers.length === 0) return [];

  const stackMap = new Map<string, { container: Container; pos: ParsedPos }[]>();

  containers.forEach(c => {
    const pos = parsePosition(c.position, c.bay, c.row, c.tier);
    const key = `${pos.oddBay}|${pos.rowStr}`;
    if (!stackMap.has(key)) {
      stackMap.set(key, []);
    }
    stackMap.get(key)!.push({ container: c, pos });
  });

  const violations: WeightViolationItem[] = [];

  stackMap.forEach((stackItems, key) => {
    stackItems.sort((a, b) => a.pos.tierNum - b.pos.tierNum);

    for (let i = 0; i < stackItems.length; i++) {
      const lower = stackItems[i];
      const lowerWeight = getWeightCategory(lower.container);

      for (let j = i + 1; j < stackItems.length; j++) {
        const upper = stackItems[j];
        const upperWeight = getWeightCategory(upper.container);

        // Weight inversion violation if a heavier container is stacked on top of a lighter one
        if (upperWeight.rank > lowerWeight.rank && upperWeight.weightKg > lowerWeight.weightKg + 2000) {
          const isCritical = upperWeight.rank === 3 && lowerWeight.rank === 1;
          const [bay, row] = key.split('|');

          violations.push({
            id: `${upper.container.id}_VS_${lower.container.id}`,
            bay,
            row,
            topContainer: upper.container,
            topWeightKg: upperWeight.weightKg,
            topCategory: upperWeight.category,
            topTier: upper.pos.tierStr,
            bottomContainer: lower.container,
            bottomWeightKg: lowerWeight.weightKg,
            bottomCategory: lowerWeight.category,
            bottomTier: lower.pos.tierStr,
            severity: isCritical ? 'CRÍTICO' : 'ADVERTENCIA',
            description: `Contenedor ${upperWeight.category} (${(upperWeight.weightKg / 1000).toFixed(1)}t) en Nivel ${upper.pos.tierStr} apilado sobre contenedor ${lowerWeight.category} (${(lowerWeight.weightKg / 1000).toFixed(1)}t) en Nivel ${lower.pos.tierStr}`
          });
        }
      }
    }
  });

  return violations;
}
