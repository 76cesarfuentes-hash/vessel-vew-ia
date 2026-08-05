import { Container, CargoType } from '../models/container';
import { MovinsMovement } from '../parser/movinsParser';
import { checkIsDischargeContainer, parsePosition, ParsedPos } from './restowEngine';
import { normalizePortCode, NO_DATA } from '../parser/portNormalizer';
import { validateContainerStackingRules } from './adjustmentEngine';

export interface RestowDetail {
  id: string;
  originalPosition: string;
  newPosition: string;
  originalPod: string;
  newPod: string;
  iso: string;
  size: number;
  weight: string;
  autoAssignedPosition: boolean;
  restowReason: string;
  container: Container;
}

export interface MovinsProcessingResult {
  parsedDischargeContainers: Container[];
  parsedLoadContainers: Container[];
  restowsDetected: RestowDetail[];
  untouchedTransitContainers: Container[];
  alerts: Array<{
    severity: 'CRÍTICA' | 'ALTA' | 'INFO';
    title: string;
    message: string;
  }>;
}

/**
  Helper to format 7-digit position string (bay 3d, row 2d, tier 2d)
 */
export function formatPositionStr(bay: number, row: number, tier: number): string {
  const b = bay.toString().padStart(3, '0');
  const r = row.toString().padStart(2, '0');
  const t = tier.toString().padStart(2, '0');
  return `${b}${r}${t}`;
}

/**
 * Main MOVINS Processing Engine
 * 
 * Rules:
 * 1. BAPLIE is immutable -> parsedDischargeContainers = 100% BAPLIE.
 * 2. parsedLoadContainers = (BAPLIE Transit containers) + (MOVINS load containers).
 * 3. Restow Identification:
 *    - Case A: MOVINS container exists in BAPLIE (Transit or Importation).
 *    - Case B: MOVINS occupies a slot taken by a BAPLIE Transit container.
 * 4. Automatic Relocation Rules for forced restows without specified MOVINS position:
 *    1) Same POD
 *    2) Same Tier height preference
 *    3) Strict ISO/Size compatibility (20' only 20', 40' only 40'; 40' HC <-> 40' Std allowed; 20' <-> 40' forbidden)
 *    4) Compatible weight
 *    5) Deck vs Hold rule (Deck container CANNOT move to Hold)
 *    6) Top Tier preference
 */
export function processMovinsPlanning(
  baplieContainers: Container[],
  movinsMovements: MovinsMovement[],
  activeTerminalKey: string
): MovinsProcessingResult {
  const alerts: Array<{ severity: 'CRÍTICA' | 'ALTA' | 'INFO'; title: string; message: string }> = [];

  // 1. Immutable BAPLIE = Discharge View
  const parsedDischargeContainers = baplieContainers.map(c => ({
    ...c,
    source: (c.source || 'BAPLIE') as 'BAPLIE' | 'MOVINS' | 'EXCEL' | 'BOTH',
    operation: checkIsDischargeContainer(c, activeTerminalKey) ? 'DISCHARGE' as const : 'NO MOVE' as const
  }));

  // Separate BAPLIE into Importation vs Transit
  const baplieImportMap = new Map<string, Container>();
  const baplieTransitMap = new Map<string, Container>();

  baplieContainers.forEach(c => {
    if (checkIsDischargeContainer(c, activeTerminalKey)) {
      baplieImportMap.set(c.id.toUpperCase(), c);
    } else {
      baplieTransitMap.set(c.id.toUpperCase(), c);
    }
  });

  const baplieFullMap = new Map(baplieContainers.map(c => [c.id.toUpperCase(), c]));

  // Index occupied positions in load view
  // Key = position string (e.g. 0140282)
  const loadPositionMap = new Map<string, Container>();
  const restowsDetected: RestowDetail[] = [];
  const processedTransitIds = new Set<string>();

  // Map MOVINS movements by container ID
  const movinsMap = new Map(movinsMovements.map(m => [m.id.toUpperCase(), m]));

  // Build MOVINS container objects
  const movinsContainers: Container[] = movinsMovements.map(m => {
    const parsedPos = parsePosition(m.position);
    const size: 20 | 40 | 45 = parsedPos.bayNum % 2 === 0 ? 40 : 20;

    const existingInBaplie = baplieFullMap.get(m.id.toUpperCase());

    // Determine Full vs Empty status: 4 = EMPTY (MT), 5 = FULL
    const isMovinsEmpty = m.status === 'EMPTY' || m.rawStatus === '4';
    const finalStatus: 'FULL' | 'EMPTY' = isMovinsEmpty
      ? 'EMPTY'
      : (existingInBaplie ? existingInBaplie.status : 'FULL');

    let cargoType: CargoType = 'DC';
    if (finalStatus === 'EMPTY') {
      cargoType = 'MT';
    } else if (m.imoClass !== NO_DATA) {
      cargoType = 'DG';
    } else if (m.temp !== NO_DATA) {
      cargoType = 'RF';
    } else if (existingInBaplie) {
      cargoType = existingInBaplie.cargoType;
    }

    const defaultWeight = finalStatus === 'EMPTY' ? '2200' : '20000';
    const defaultWeightKg = finalStatus === 'EMPTY' ? 2200 : 20000;

    return {
      id: m.id,
      iso: m.iso !== NO_DATA ? m.iso : (existingInBaplie?.iso || '4210'),
      position: m.position,
      bay: parsedPos.bayNum.toString().padStart(3, '0'),
      row: parsedPos.rowStr,
      tier: parsedPos.tierStr,
      size: size,
      status: finalStatus,
      pol: m.pol !== NO_DATA ? m.pol : activeTerminalKey,
      pod: m.pod !== NO_DATA ? m.pod : 'DEST',
      operator: m.operator !== NO_DATA ? m.operator : (existingInBaplie?.operator || 'MSK'),
      cargoType: cargoType,
      weight: m.weight !== NO_DATA ? m.weight : (existingInBaplie?.weight || defaultWeight),
      weightKg: m.weight !== NO_DATA ? parseInt(m.weight, 10) : (existingInBaplie?.weightKg || defaultWeightKg),
      imoClass: m.imoClass,
      unNumber: NO_DATA,
      temp: m.temp,
      hasDim: m.hasDim,
      source: existingInBaplie ? 'BOTH' : 'MOVINS',
      operation: 'LOAD'
    };
  });

  // --------------------------------------------------------------------------
  // STEP A: Process MOVINS containers & Identify Restows (Case A & direct MOVINS)
  // --------------------------------------------------------------------------
  const loadList: Container[] = [];

  movinsContainers.forEach(mc => {
    const existing = baplieFullMap.get(mc.id.toUpperCase());

    if (existing) {
      // Case A: Container in MOVINS already exists in BAPLIE (Restow)
      const isImport = checkIsDischargeContainer(existing, activeTerminalKey);
      const reason = isImport
        ? 'Restiba de Importación – Recargado según MOVINS'
        : 'Restiba de Tránsito – Reubicación según MOVINS';

      const restowContainer: Container = {
        ...existing,
        position: mc.position,
        bay: mc.bay,
        row: mc.row,
        tier: mc.tier,
        pod: mc.pod !== 'DEST' && mc.pod !== NO_DATA ? mc.pod : existing.pod,
        pol: mc.pol !== activeTerminalKey && mc.pol !== NO_DATA ? mc.pol : existing.pol,
        source: 'BOTH',
        operation: 'RESTOW',
        isRestow: true,
        originalDischargePosition: existing.position,
        autoAssignedPosition: false,
        restowReason: reason
      };

      loadList.push(restowContainer);
      loadPositionMap.set(mc.position, restowContainer);
      processedTransitIds.add(existing.id.toUpperCase());

      restowsDetected.push({
        id: existing.id,
        originalPosition: existing.position,
        newPosition: mc.position,
        originalPod: existing.pod,
        newPod: restowContainer.pod,
        iso: existing.iso,
        size: existing.size,
        weight: existing.weight,
        autoAssignedPosition: false,
        restowReason: reason,
        container: restowContainer
      });

      // Mark visual restow flag on Discharge container as well
      const dischargeItem = parsedDischargeContainers.find(c => c.id.toUpperCase() === existing.id.toUpperCase());
      if (dischargeItem) {
        dischargeItem.isRestow = true;
        dischargeItem.restowReason = 'Será cargado nuevamente (Restiba MOVINS)';
      }
    } else {
      // Pure new Load container from MOVINS
      loadList.push(mc);
      loadPositionMap.set(mc.position, mc);
    }
  });

  // --------------------------------------------------------------------------
  // STEP B: Process BAPLIE Transit Containers (Case B - Slot conflicts & Forced Restows)
  // --------------------------------------------------------------------------
  // Find Transit containers from BAPLIE not yet processed
  const remainingTransit = Array.from(baplieTransitMap.values()).filter(
    tc => !processedTransitIds.has(tc.id.toUpperCase())
  );

  // We need to check if any of remainingTransit's original position is occupied by MOVINS!
  const forcedRestowTransit: Container[] = [];
  const untouchedTransitContainers: Container[] = [];

  remainingTransit.forEach(tc => {
    const occupant = loadPositionMap.get(tc.position);
    if (occupant && occupant.id.toUpperCase() !== tc.id.toUpperCase()) {
      // Position is occupied by MOVINS -> Forced Restow!
      forcedRestowTransit.push(tc);
    } else {
      // Slot is free! Stays in original position
      loadList.push(tc);
      loadPositionMap.set(tc.position, tc);
      untouchedTransitContainers.push(tc);
    }
  });

  // --------------------------------------------------------------------------
  // STEP C: Automatic Relocation for Forced Restows (Section 4.2)
  // --------------------------------------------------------------------------
  forcedRestowTransit.forEach(tc => {
    const origPos = parsePosition(tc.position);

    // Calculate valid candidate position using the 6 rules
    const newPos = findAutoRelocationPosition(tc, origPos, loadPositionMap, baplieContainers);

    if (newPos) {
      const parsedNew = parsePosition(newPos.posStr);
      const isDiffTier = parsedNew.tierNum !== origPos.tierNum;

      const restowContainer: Container = {
        ...tc,
        position: newPos.posStr,
        bay: parsedNew.bayNum.toString().padStart(3, '0'),
        row: parsedNew.rowStr,
        tier: parsedNew.tierStr,
        operation: 'RESTOW',
        isRestow: true,
        originalDischargePosition: tc.position,
        autoAssignedPosition: true,
        restowReason: 'Restiba forzada – posición ocupada por MOVINS'
      };

      loadList.push(restowContainer);
      loadPositionMap.set(newPos.posStr, restowContainer);
      processedTransitIds.add(tc.id.toUpperCase());

      restowsDetected.push({
        id: tc.id,
        originalPosition: tc.position,
        newPosition: newPos.posStr,
        originalPod: tc.pod,
        newPod: tc.pod,
        iso: tc.iso,
        size: tc.size,
        weight: tc.weight,
        autoAssignedPosition: true,
        restowReason: 'Restiba forzada – posición ocupada por MOVINS',
        container: restowContainer
      });

      // Update Discharge view flag
      const dischargeItem = parsedDischargeContainers.find(c => c.id.toUpperCase() === tc.id.toUpperCase());
      if (dischargeItem) {
        dischargeItem.isRestow = true;
        dischargeItem.restowReason = 'Restiba forzada – posición ocupada por MOVINS';
      }

      if (isDiffTier) {
        alerts.push({
          severity: 'ALTA',
          title: 'REUBICACIÓN AUTOMÁTICA EN DIFERENTE NIVEL',
          message: `Contenedor de tránsito ${tc.id} (${tc.pod}) fue reubicado automáticamente de ${tc.position} (Nivel ${origPos.tierStr}) a ${newPos.posStr} (Nivel ${parsedNew.tierStr}) por conflicto con MOVINS.`
        });
      } else {
        alerts.push({
          severity: 'INFO',
          title: 'POSICIÓN ASIGNADA AUTOMÁTICAMENTE',
          message: `Contenedor de tránsito ${tc.id} (${tc.pod}) reubicado a ${newPos.posStr} por posición ocupada en MOVINS.`
        });
      }
    } else {
      // Critical Error: No position found!
      alerts.push({
        severity: 'CRÍTICA',
        title: 'ERROR CRÍTICO DE REUBICACIÓN DE RESTIBA',
        message: `No se encontró ninguna posición válida para la restiba forzada de ${tc.id} (${tc.size}', POD: ${tc.pod}, Pos original: ${tc.position}) bajo las 6 reglas de reubicación.`
      });

      // Fallback: Keep original with alert tag
      const fallbackRestow: Container = {
        ...tc,
        operation: 'RESTOW',
        isRestow: true,
        originalDischargePosition: tc.position,
        autoAssignedPosition: false,
        restowReason: 'ERROR CRÍTICO: Sin posición disponible para reubicación'
      };
      loadList.push(fallbackRestow);
    }
  });

  // Validate stacking / bed rules on the resulting load plan (BAPLIE + MOVINS)
  const stackingViolations = validateContainerStackingRules(loadList);
  stackingViolations.forEach(v => {
    alerts.push({
      severity: 'CRÍTICA',
      title: 'ALERTA DE ESTIBA EN MOVINS (REGLA DE CAMA)',
      message: v.message
    });
  });

  return {
    parsedDischargeContainers,
    parsedLoadContainers: loadList,
    restowsDetected,
    untouchedTransitContainers,
    alerts
  };
}

/**
 * Calculates candidate position according to 6 prioritized relocation rules:
 * 1. Mismo puerto de descarga (POD)
 * 2. Misma altura (Tier)
 * 3. Compatibilidad de ISO / Tamaño (20' only 20', 40' only 40'; 40' HC <-> 40' Std allowed; 20' <-> 40' forbidden)
 * 4. Pesos parecidos
 * 5. Regla Cubierta vs Bodega (Deck container CANNOT go to Hold)
 * 6. Último nivel (Top Tier)
 */
function findAutoRelocationPosition(
  targetContainer: Container,
  origPos: ParsedPos,
  occupiedMap: Map<string, Container>,
  allContainers: Container[]
): { posStr: string } | null {
  // Extract all bays where target POD is present in allContainers
  const samePodContainers = allContainers.filter(
    c => normalizePortCode(c.pod) === normalizePortCode(targetContainer.pod)
  );

  const candidateBays = Array.from(
    new Set(samePodContainers.map(c => parsePosition(c.position).bayNum))
  );

  if (candidateBays.length === 0) {
    candidateBays.push(origPos.bayNum);
  }

  // Determine allowed size (20' or 40')
  const targetSize = targetContainer.size;

  // Determine if original container was on Deck (tier >= 70)
  const origIsDeck = origPos.isDeck;

  const validCandidates: Array<{
    posStr: string;
    tierDiff: number;
    isTopTier: boolean;
    tierNum: number;
  }> = [];

  // Iterate over candidate bays
  candidateBays.forEach(bayNum => {
    // Check size compatibility: 20ft -> odd bay, 40ft -> even bay
    const isBay20 = bayNum % 2 !== 0;
    const isBay40 = bayNum % 2 === 0;

    if (targetSize === 20 && !isBay20) return; // Strict: 20ft only in odd bays
    if (targetSize >= 40 && !isBay40) return;  // Strict: 40ft only in even bays

    // Check rows (00 to 14) and tiers (02 to 92)
    for (let r = 0; r <= 14; r += 2) {
      // Tier range depending on deck vs hold rule
      const startTier = origIsDeck ? 70 : 2; // Rule 5: If deck, CANNOT go to hold (< 70)
      const endTier = 94;

      for (let t = startTier; t <= endTier; t += 2) {
        const testPosStr = formatPositionStr(bayNum, r, t);

        // Check if position is occupied in load map
        if (!occupiedMap.has(testPosStr)) {
          const tierDiff = Math.abs(t - origPos.tierNum);
          validCandidates.push({
            posStr: testPosStr,
            tierDiff,
            isTopTier: t >= 86,
            tierNum: t
          });
        }
      }
    }
  });

  if (validCandidates.length === 0) return null;

  // Sort candidates by priority:
  // 1) Smallest tierDiff (closest height)
  // 2) Top tier preference (higher tierNum)
  validCandidates.sort((a, b) => {
    if (a.tierDiff !== b.tierDiff) return a.tierDiff - b.tierDiff;
    return b.tierNum - a.tierNum; // prefer higher tier
  });

  return { posStr: validCandidates[0].posStr };
}
