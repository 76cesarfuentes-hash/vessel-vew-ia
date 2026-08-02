import { Container } from '../models/container';
import { check40OverSingle20Violation, check20Over40Violation } from './adjustmentEngine';

export interface RelocationCandidateOption {
  id: string;
  type: 'COMPLETE_20_BED' | 'RELOCATE_40FT' | 'RELOCATE_20FT';
  title: string;
  description: string;
  targetContainerId: string;
  fromPosition: string;
  toPosition: string;
  bay: string;
  row: string;
  tier: string;
  confidence: number; // 0-100%
  reason: string;
  pod: string;
  zone: 'Hold (Bodega)' | 'Deck (Cubierta)';
  adjustmentRequest: {
    type: 'MOVE_CONTAINER' | 'CANCEL_CONTAINER';
    containerId: string;
    targetPosition?: string;
  };
}

export interface StackingFixSearchResult {
  violationType: '40_OVER_SINGLE_20' | '20_OVER_40' | 'NONE';
  targetContainer: Container;
  candidateBays: string[];
  options: RelocationCandidateOption[];
  message: string;
}

/**
 * Validates POD sequence discharge order.
 * Ensures a container is NOT stacked above an earlier discharge port,
 * nor stacked below a later discharge port.
 */
export function checkPodSequenceValidity(
  containers: Container[],
  targetPod: string,
  bay: string,
  row: string,
  tierNum: number,
  podSequence: string[],
  excludeContainerId?: string
): boolean {
  if (!podSequence || podSequence.length <= 1) return true;

  const podOrder: Record<string, number> = {};
  podSequence.forEach((p, i) => {
    if (p) podOrder[p.toUpperCase()] = i;
  });

  const targetPodUpper = (targetPod || '').toUpperCase();
  const targetRank = podOrder[targetPodUpper];
  if (targetRank === undefined) return true;

  const isDeck = tierNum >= 80;
  const targetBayNum = parseInt(bay, 10);

  // Filter containers in the same stack (same zone and adjacent/same bay, same row)
  const stackContainers = containers.filter(c => {
    if (c.id === excludeContainerId) return false;
    if (c.row !== row) return false;
    const cTierNum = parseInt(c.tier, 10);
    if (isNaN(cTierNum)) return false;

    const cIsDeck = cTierNum >= 80;
    if (cIsDeck !== isDeck) return false;

    const cBayNum = parseInt(c.bay, 10);
    return Math.abs(cBayNum - targetBayNum) <= 1;
  });

  // Check containers BELOW target position
  for (const cBelow of stackContainers) {
    const cTierNum = parseInt(cBelow.tier, 10);
    if (cTierNum < tierNum) {
      const belowPod = (cBelow.pod || '').toUpperCase();
      const belowRank = podOrder[belowPod];
      if (belowRank !== undefined && belowRank < targetRank) {
        // cBelow discharges BEFORE targetPod! Target is above an earlier discharge port.
        return false;
      }
    }
  }

  // Check containers ABOVE target position
  for (const cAbove of stackContainers) {
    const cTierNum = parseInt(cAbove.tier, 10);
    if (cTierNum > tierNum) {
      const abovePod = (cAbove.pod || '').toUpperCase();
      const aboveRank = podOrder[abovePod];
      if (aboveRank !== undefined && aboveRank > targetRank) {
        // cAbove discharges AFTER targetPod! Target is below a later discharge port.
        return false;
      }
    }
  }

  return true;
}

/**
 * Intelligent Stacking Conflict Resolver.
 * Searches for valid candidate bays and slots that satisfy BOTH:
 * 1. Stacking constraints (40ft supported by two 20ft containers or solid base).
 * 2. Discharge port segregation rules (POD sequence).
 */
export function findStackingFixProposals(
  target: Container,
  allContainers: Container[],
  podSequence: string[] = []
): StackingFixSearchResult {
  const options: RelocationCandidateOption[] = [];

  // Build map of occupied positions
  const occupiedPositions = new Set<string>();
  allContainers.forEach(c => {
    if (c.position) occupiedPositions.add(c.position.replace(/[^0-9]/g, ''));
    if (c.bay && c.row && c.tier) {
      const b = c.bay.padStart(2, '0');
      const r = c.row.padStart(2, '0');
      const t = c.tier.padStart(2, '0');
      occupiedPositions.add(`${b}${r}${t}`);
    }
  });

  // Extract vessel's known bays
  const knownBaysSet = new Set<string>();
  allContainers.forEach(c => {
    if (c.bay && !isNaN(parseInt(c.bay, 10))) {
      knownBaysSet.add(c.bay.padStart(2, '0'));
    }
  });
  // Add standard bay range if sparse
  for (let b = 1; b <= 40; b++) {
    knownBaysSet.add(String(b).padStart(2, '0'));
  }
  const allBaysSorted = Array.from(knownBaysSet).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  // Determine violation type
  const targetSize = target.size;
  let violationType: '40_OVER_SINGLE_20' | '20_OVER_40' | 'NONE' = 'NONE';

  if (targetSize === 40 || targetSize === 45) {
    const single20Violations = check40OverSingle20Violation(allContainers);
    const hasSingle20 = single20Violations.some(v => v.container40.id === target.id);
    if (hasSingle20) violationType = '40_OVER_SINGLE_20';
  } else if (targetSize === 20) {
    const isOver40 = check20Over40Violation(allContainers, {
      bay: target.bay,
      row: target.row,
      tier: target.tier
    });
    if (isOver40) violationType = '20_OVER_40';
  }

  // Fallback: check if target is near or affected by single 20
  if (violationType === 'NONE') {
    const single20Violations = check40OverSingle20Violation(allContainers);
    if (single20Violations.length > 0) {
      const v = single20Violations.find(v => v.single20.id === target.id || v.container40.id === target.id);
      if (v) violationType = '40_OVER_SINGLE_20';
    }
  }

  // ── STRATEGY 1: IF 40FT OVER SINGLE 20FT, SUGGEST COMPLETING 20FT BED ──
  if (violationType === '40_OVER_SINGLE_20' && (targetSize === 40 || targetSize === 45)) {
    const bay40Num = parseInt(target.bay, 10);
    const tier40Num = parseInt(target.tier, 10);
    const row40 = target.row.padStart(2, '0');
    const tierBelowNum = tier40Num - 2;

    if (tierBelowNum >= 2) {
      const foreBayStr = String(bay40Num - 1).padStart(2, '0');
      const aftBayStr = String(bay40Num + 1).padStart(2, '0');
      const tierBelowStr = String(tierBelowNum).padStart(2, '0');

      const forePos = `${foreBayStr}${row40}${tierBelowStr}`;
      const aftPos = `${aftBayStr}${row40}${tierBelowStr}`;

      const foreOccupied = occupiedPositions.has(forePos);
      const aftOccupied = occupiedPositions.has(aftPos);

      // Determine which 20ft slot is missing
      let missingBayStr = '';
      let missingPosStr = '';

      if (foreOccupied && !aftOccupied) {
        missingBayStr = aftBayStr;
        missingPosStr = aftPos;
      } else if (!foreOccupied && aftOccupied) {
        missingBayStr = foreBayStr;
        missingPosStr = forePos;
      }

      if (missingBayStr) {
        // Find a candidate 20ft container to move into missingPosStr
        const candidate20 = allContainers.find(c =>
          c.size === 20 &&
          c.id !== target.id &&
          c.pod === target.pod
        ) || allContainers.find(c => c.size === 20 && c.id !== target.id);

        if (candidate20) {
          const isValidPod = checkPodSequenceValidity(
            allContainers,
            candidate20.pod,
            missingBayStr,
            row40,
            tierBelowNum,
            podSequence,
            candidate20.id
          );

          if (isValidPod) {
            options.push({
              id: `FIX-BED-${candidate20.id}`,
              type: 'COMPLETE_20_BED',
              title: `Completar Cama de 20' con ${candidate20.id}`,
              description: `Mover contenedor de 20' ${candidate20.id} (POD: ${candidate20.pod}) a Posición B${missingBayStr}-R${row40}-T${tierBelowStr} para formar cama completa bajo ${target.id}.`,
              targetContainerId: candidate20.id,
              fromPosition: candidate20.position,
              toPosition: `B${missingBayStr}-R${row40}-T${tierBelowStr}`,
              bay: missingBayStr,
              row: row40,
              tier: tierBelowStr,
              confidence: 98,
              reason: 'Completa la cama de 2x 20ft requerida y cumple con la secuencia de puertos de descarga.',
              pod: candidate20.pod,
              zone: tierBelowNum >= 80 ? 'Deck (Cubierta)' : 'Hold (Bodega)',
              adjustmentRequest: {
                type: 'MOVE_CONTAINER',
                containerId: candidate20.id,
                targetPosition: `B${missingBayStr}-R${row40}-T${tierBelowStr}`
              }
            });
          }
        }
      }
    }
  }

  // ── STRATEGY 2: SEARCH FOR VALID CANDIDATE BAYS FOR RELOCATING TARGET CONTAINER ──
  const candidate40Bays = allBaysSorted.filter(b => parseInt(b, 10) % 2 === 0); // Even bays for 40ft
  const candidate20Bays = allBaysSorted.filter(b => parseInt(b, 10) % 2 !== 0); // Odd bays for 20ft

  const is40ftTarget = targetSize === 40 || targetSize === 45;
  const candidateBaysToScan = is40ftTarget ? candidate40Bays : candidate20Bays;

  const standardRows = ['00', '01', '02', '03', '04', '05', '06'];
  const holdTiers = [2, 4, 6, 8, 10, 12, 14, 16];
  const deckTiers = [82, 84, 86, 88, 90, 92];

  for (const bayStr of candidateBaysToScan) {
    const bayNum = parseInt(bayStr, 10);

    for (const rowStr of standardRows) {
      const allTiersToScan = [...holdTiers, ...deckTiers];

      for (const tierNum of allTiersToScan) {
        const tierStr = String(tierNum).padStart(2, '0');
        const posKey = `${bayStr}${rowStr}${tierStr}`;

        // Must be an EMPTY slot
        if (occupiedPositions.has(posKey)) continue;

        // Verify base stacking support
        const isHoldBottom = tierNum === 2;
        const isDeckBottom = tierNum === 82;
        let isBaseSupported = isHoldBottom || isDeckBottom;

        if (!isBaseSupported && tierNum > 2) {
          const tierBelowStr = String(tierNum - 2).padStart(2, '0');

          if (is40ftTarget) {
            // Below must be either a 40ft container OR two 20ft containers (Fore & Aft)
            const pos40Below = `${bayStr}${rowStr}${tierBelowStr}`;
            const fore20Pos = `${String(bayNum - 1).padStart(2, '0')}${rowStr}${tierBelowStr}`;
            const aft20Pos = `${String(bayNum + 1).padStart(2, '0')}${rowStr}${tierBelowStr}`;

            const has40Below = occupiedPositions.has(pos40Below);
            const has20Fore = occupiedPositions.has(fore20Pos);
            const has20Aft = occupiedPositions.has(aft20Pos);

            isBaseSupported = has40Below || (has20Fore && has20Aft);
          } else {
            // 20ft target: below must be a 20ft container (or bottom)
            const pos20Below = `${bayStr}${rowStr}${tierBelowStr}`;
            isBaseSupported = occupiedPositions.has(pos20Below);

            // Crucial: CANNOT sit over a 40ft container
            const isOver40 = check20Over40Violation(allContainers, {
              bay: bayStr,
              row: rowStr,
              tier: tierStr
            });
            if (isOver40) isBaseSupported = false;
          }
        }

        if (!isBaseSupported) continue;

        // Verify Discharge Port Segregation Rules (POD Sequence)
        const isValidPodSequence = checkPodSequenceValidity(
          allContainers,
          target.pod,
          bayStr,
          rowStr,
          tierNum,
          podSequence,
          target.id
        );

        if (!isValidPodSequence) continue; // Discard bay/slot if POD sequence is violated

        // Valid option found!
        const formattedPos = `B${bayStr}-R${rowStr}-T${tierStr}`;
        const zoneText = tierNum >= 80 ? 'Deck (Cubierta)' : 'Hold (Bodega)';

        options.push({
          id: `RELOCATE-${target.id}-${posKey}`,
          type: is40ftTarget ? 'RELOCATE_40FT' : 'RELOCATE_20FT',
          title: `Reubicar ${target.id} a Bahía ${bayStr}`,
          description: `Trasladar a Posición ${formattedPos} en ${zoneText}. Satisface estiba y secuencia de descarga.`,
          targetContainerId: target.id,
          fromPosition: target.position,
          toPosition: formattedPos,
          bay: bayStr,
          row: rowStr,
          tier: tierStr,
          confidence: 95,
          reason: `Cumple reglas de cama ${is40ftTarget ? '40\'' : '20\''} y no bloquea ningún puerto de descarga.`,
          pod: target.pod,
          zone: zoneText,
          adjustmentRequest: {
            type: 'MOVE_CONTAINER',
            containerId: target.id,
            targetPosition: formattedPos
          }
        });

        // Limit options per bay to keep suggestions clean & relevant
        const bayOptions = options.filter(o => o.bay === bayStr);
        if (bayOptions.length >= 2) break;
      }

      if (options.length >= 8) break;
    }

    if (options.length >= 8) break;
  }

  // Extract candidate bays
  const candidateBays = Array.from(new Set(options.map(o => o.bay))).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  return {
    violationType,
    targetContainer: target,
    candidateBays,
    options,
    message: options.length > 0
      ? `Se encontraron ${options.length} alternativas válidas en ${candidateBays.length} bahías candidatas.`
      : 'No se encontraron posiciones libres que cumplan simultáneamente las reglas de estiba y de puerto de descarga.'
  };
}
