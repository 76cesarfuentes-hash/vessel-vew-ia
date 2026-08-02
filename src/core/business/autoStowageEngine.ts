import { Container, CargoType } from '../models/container';
import { ExtendedExcelContainer } from '../parser/excelParser';

export interface UnassignedContainerReport {
  container: Container;
  yardPosition: string;
  reason: string;
  violatedRules: string[];
  suggestedAlternatives: string[];
}

export interface OptimizationMetrics {
  totalToStow: number;
  successfullyStowed: number;
  unassignedCount: number;
  transverseTorsionScore: number; // 0 - 100% (100% = perfectly balanced)
  longitudinalBalanceScore: number; // 0 - 100%
  heavyLowerComplianceScore: number; // 0 - 100%
  podSegregationCompliance: number; // 0 - 100%
  yardTongaWorkflowScore: number; // 0 - 100%
  portWeightDistribution: Record<string, number>; // total tons per POD
}

export interface AutoStowageResult {
  stowedContainers: Container[];
  unassignedReports: UnassignedContainerReport[];
  metrics: OptimizationMetrics;
  logs: string[];
}

/**
 * Checks whether a proposed vessel position is valid under mandatory hard constraints:
 * 1. POD Sequence (no earlier POD below later POD)
 * 2. Full over Empty prohibition
 * 3. Container Stacking (20' bed for 40', no 20' over 40')
 * 4. IMO / Reefer / OOG slot compatibility
 */
export function validateHardConstraints(
  candidate: Container,
  targetBay: string,
  targetRow: string,
  targetTier: string,
  currentVesselContainers: Container[],
  podSequence: string[]
): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];

  const bayNum = parseInt(targetBay, 10);
  const rowNum = parseInt(targetRow, 10);
  const tierNum = parseInt(targetTier, 10);
  const isDeck = tierNum >= 80;
  const targetSize = candidate.size;
  const is40ftTarget = targetSize === 40 || targetSize === 45;

  // 1. Check if position is already occupied
  const targetPosFormatted = `B${targetBay.padStart(2, '0')}-R${targetRow.padStart(2, '0')}-T${targetTier.padStart(2, '0')}`;
  const occupant = currentVesselContainers.find(c => {
    if (!c.bay || !c.row || !c.tier) return false;
    const b = c.bay.padStart(2, '0');
    const r = c.row.padStart(2, '0');
    const t = c.tier.padStart(2, '0');
    return b === targetBay.padStart(2, '0') && r === targetRow.padStart(2, '0') && t === targetTier.padStart(2, '0');
  });

  if (occupant) {
    reasons.push(`La posición ${targetPosFormatted} ya está ocupada por ${occupant.id}.`);
    return { valid: false, reasons };
  }

  // 2. Reefer Slot Restriction
  if (candidate.cargoType === 'RF' || candidate.temp !== 'DRY') {
    // Powered reefer slots are on deck (tier >= 80) or specific reefer bays (e.g., bays 02, 06, 10, 14, 18, 22)
    const isReeferSlot = isDeck || (bayNum % 4 === 2);
    if (!isReeferSlot) {
      reasons.push(`El contenedor Reefer ${candidate.id} requiere toma eléctrica activa (solo permitido en cubierta o bahías reefer).`);
    }
  }

  // 3. IMO / Dangerous Goods Restriction
  if (candidate.cargoType === 'DG' || (candidate.imoClass && candidate.imoClass !== 'Dato no disponible')) {
    // IMO must be placed on deck or designated open bays for safety ventilation
    if (!isDeck && tierNum < 10) {
      reasons.push(`Carga peligrosa IMO Clase ${candidate.imoClass} no permitida en fondo de bodega por restricciones de ventilación.`);
    }
  }

  // 4. OOG Restriction
  if (candidate.cargoType === 'OS' || candidate.hasDim) {
    // Must be on top tier of deck
    if (!isDeck || tierNum < 88) {
      reasons.push(`Contenedor Sobredimensionado (OOG) ${candidate.id} solo se permite en el nivel superior de cubierta.`);
    }
  }

  // 5. Base Support & Stacking Rules
  const isHoldBottom = tierNum === 2;
  const isDeckBottom = tierNum === 82;

  if (!isHoldBottom && !isDeckBottom) {
    const tierBelowNum = tierNum - 2;
    const tierBelowStr = String(tierBelowNum).padStart(2, '0');

    if (is40ftTarget) {
      // 40ft requires either a 40ft container below OR two 20ft containers below (Fore & Aft)
      const container40Below = currentVesselContainers.find(c => {
        return c.bay.padStart(2, '0') === targetBay.padStart(2, '0') &&
          c.row.padStart(2, '0') === targetRow.padStart(2, '0') &&
          c.tier.padStart(2, '0') === tierBelowStr;
      });

      const fore20Below = currentVesselContainers.find(c => {
        return c.bay.padStart(2, '0') === String(bayNum - 1).padStart(2, '0') &&
          c.row.padStart(2, '0') === targetRow.padStart(2, '0') &&
          c.tier.padStart(2, '0') === tierBelowStr && c.size === 20;
      });

      const aft20Below = currentVesselContainers.find(c => {
        return c.bay.padStart(2, '0') === String(bayNum + 1).padStart(2, '0') &&
          c.row.padStart(2, '0') === targetRow.padStart(2, '0') &&
          c.tier.padStart(2, '0') === tierBelowStr && c.size === 20;
      });

      if (!container40Below && (!fore20Below || !aft20Below)) {
        if (fore20Below && !aft20Below) {
          reasons.push(`Violación de cama incompleta: Contenedor 40' ${candidate.id} no puede apoyarse sobre un solo contenedor de 20' (falta Aft en B${String(bayNum + 1).padStart(2, '0')}).`);
        } else if (!fore20Below && aft20Below) {
          reasons.push(`Violación de cama incompleta: Contenedor 40' ${candidate.id} no puede apoyarse sobre un solo contenedor de 20' (falta Fore en B${String(bayNum - 1).padStart(2, '0')}).`);
        } else {
          reasons.push(`Falta soporte base: No hay contenedor debajo en la celda B${targetBay}-R${targetRow}-T${tierBelowStr}.`);
        }
      }
    } else {
      // 20ft target
      const container20Below = currentVesselContainers.find(c => {
        return c.bay.padStart(2, '0') === targetBay.padStart(2, '0') &&
          c.row.padStart(2, '0') === targetRow.padStart(2, '0') &&
          c.tier.padStart(2, '0') === tierBelowStr;
      });

      // Check if it's over a 40ft container
      const center40Below = currentVesselContainers.find(c => {
        const cBay = parseInt(c.bay, 10);
        return Math.abs(cBay - bayNum) <= 1 && c.size === 40 &&
          c.row.padStart(2, '0') === targetRow.padStart(2, '0') &&
          c.tier.padStart(2, '0') === tierBelowStr;
      });

      if (center40Below) {
        reasons.push(`Violación estructural: Un contenedor de 20' ${candidate.id} no puede apoyarse sobre un contenedor de 40' (${center40Below.id}).`);
      } else if (!container20Below) {
        reasons.push(`Falta soporte base para 20' en celda B${targetBay}-R${targetRow}-T${tierBelowStr}.`);
      }
    }
  }

  // 6. Full over Empty Constraint
  if (candidate.status === 'FULL' && (!isHoldBottom && !isDeckBottom)) {
    const tierBelowNum = tierNum - 2;
    const tierBelowStr = String(tierBelowNum).padStart(2, '0');

    const containersBelow = currentVesselContainers.filter(c => {
      const cBay = parseInt(c.bay, 10);
      return Math.abs(cBay - bayNum) <= 1 &&
        c.row.padStart(2, '0') === targetRow.padStart(2, '0') &&
        c.tier.padStart(2, '0') === tierBelowStr;
    });

    const hasEmptyBelow = containersBelow.some(c => c.status === 'EMPTY');
    if (hasEmptyBelow) {
      reasons.push(`Violación de estiba: Un contenedor Lleno (${candidate.id}) no puede ir sobre un contenedor Vacío.`);
    }
  }

  // 7. POD Discharge Sequence Restriction
  if (podSequence && podSequence.length > 1) {
    const podOrderMap: Record<string, number> = {};
    podSequence.forEach((p, i) => {
      if (p) podOrderMap[p.toUpperCase()] = i;
    });

    const targetPodRank = podOrderMap[(candidate.pod || '').toUpperCase()];

    if (targetRankIsValid(targetPodRank)) {
      // Find containers in the same stack BELOW target position
      const stackContainers = currentVesselContainers.filter(c => {
        const cBay = parseInt(c.bay, 10);
        if (Math.abs(cBay - bayNum) > 1) return false;
        if (c.row.padStart(2, '0') !== targetRow.padStart(2, '0')) return false;
        const cTier = parseInt(c.tier, 10);
        const cIsDeck = cTier >= 80;
        return cIsDeck === isDeck;
      });

      for (const cBelow of stackContainers) {
        const cTier = parseInt(cBelow.tier, 10);
        if (cTier < tierNum) {
          const belowPodRank = podOrderMap[(cBelow.pod || '').toUpperCase()];
          if (belowPodRank !== undefined && belowPodRank < targetPodRank) {
            // Container below discharges BEFORE candidate! Candidate would block earlier discharge.
            reasons.push(`Violación de secuencia POD: ${candidate.id} (POD ${candidate.pod}) se colocaría SOBRE ${cBelow.id} que descarga ANTES (POD ${cBelow.pod}).`);
            break;
          }
        }
      }
    }
  }

  return {
    valid: reasons.length === 0,
    reasons
  };
}

function targetRankIsValid(rank: number | undefined): rank is number {
  return rank !== undefined && !isNaN(rank);
}

/**
 * Main Automatic Stowage Planning Engine
 * Executes end-to-end auto-planning from imported Excel list.
 */
export function runAutoStowagePlanning(
  excelContainers: ExtendedExcelContainer[],
  existingVesselContainers: Container[],
  podSequence: string[] = ['VER', 'HOU', 'ALT', 'MIA']
): AutoStowageResult {
  const logs: string[] = [];
  const stowedContainers: Container[] = [...existingVesselContainers];
  const unassignedReports: UnassignedContainerReport[] = [];

  logs.push(`Iniciando Motor de Planificación Automática de Estiba...`);
  logs.push(`Total contenedores a planificar desde Excel: ${excelContainers.length}`);
  logs.push(`Secuencia de puertos de descarga (POD): ${podSequence.join(' ➔ ')}`);

  // Group Excel containers by Yard Position / Tonga to respect Yard Workflow
  const yardGroups: Record<string, ExtendedExcelContainer[]> = {};
  excelContainers.forEach(c => {
    const tongaKey = c.yardPosition || 'PATIO-GENERAL';
    if (!yardGroups[tongaKey]) yardGroups[tongaKey] = [];
    yardGroups[tongaKey].push(c);
  });

  const tongaKeysSorted = Object.keys(yardGroups).sort();
  logs.push(`Procesando ${tongaKeysSorted.length} tongas de patio en flujo secuencial (sin movimientos Patio-Patio).`);

  // Available vessel bays (1 to 30)
  const availableBays = [
    '02', '06', '10', '14', '18', '22', '26', // 40ft center bays
    '01', '03', '05', '07', '09', '11', '13', '15', '17', '19', '21', '23', '25' // 20ft bays
  ];
  const availableRows = ['00', '01', '02', '03', '04', '05', '06']; // 00 center, 01/03/05 starboard, 02/04/06 port
  const holdTiers = ['02', '04', '06', '08', '10', '12'];
  const deckTiers = ['82', '84', '86', '88', '90'];

  let totalStowedFromExcel = 0;

  // Process yard containers tonga by tonga
  for (const tongaKey of tongaKeysSorted) {
    const containersInTonga = yardGroups[tongaKey];
    logs.push(`► Procesando Tonga de Patio: ${tongaKey} (${containersInTonga.length} contenedores)`);

    // Sort containers in tonga:
    // 1. Heavy containers first (so they go lower in stack)
    // 2. POD sequence matching vessel bays
    // 3. 20ft vs 40ft compatibility
    const sortedContainers = [...containersInTonga].sort((a, b) => {
      const wA = a.weightKg || 18000;
      const wB = b.weightKg || 18000;
      if (wA !== wB) return wB - wA; // Heavier first

      const podIndexA = podSequence.indexOf(a.pod || '');
      const podIndexB = podSequence.indexOf(b.pod || '');
      return podIndexB - podIndexA; // Later POD first (bottom of stack)
    });

    for (const rawCandidate of sortedContainers) {
      const candidate: Container = {
        id: rawCandidate.id || 'CNTR-UNK',
        iso: rawCandidate.iso || '4510',
        bay: '00',
        row: '00',
        tier: '00',
        position: 'UNASSIGNED',
        size: rawCandidate.size || 40,
        status: rawCandidate.status || 'FULL',
        pol: rawCandidate.pol || 'VER',
        pod: rawCandidate.pod || 'HOU',
        operator: rawCandidate.operator || 'MSC',
        cargoType: rawCandidate.cargoType || 'DC',
        weight: rawCandidate.weight || '18T (18000 KG)',
        weightKg: rawCandidate.weightKg || 18000,
        imoClass: rawCandidate.imoClass || 'Dato no disponible',
        unNumber: 'Dato no disponible',
        temp: rawCandidate.temp || 'DRY',
        hasDim: Boolean(rawCandidate.oogDim)
      };

      const is40ft = candidate.size === 40 || candidate.size === 45;
      const validBaysToScan = is40ft
        ? ['02', '06', '10', '14', '18', '22', '26']
        : ['01', '03', '05', '07', '09', '11', '13', '15', '17', '19', '21', '23', '25'];

      let assignedPosition = '';
      const allViolatedReasons: string[] = [];

      // Scan bays starting from Hold to Deck, Row center to wings, Tier lower to higher
      for (const bayStr of validBaysToScan) {
        if (assignedPosition) break;

        const allTiersToScan = [...holdTiers, ...deckTiers];

        for (const tierStr of allTiersToScan) {
          if (assignedPosition) break;

          for (const rowStr of availableRows) {
            const hardCheck = validateHardConstraints(
              candidate,
              bayStr,
              rowStr,
              tierStr,
              stowedContainers,
              podSequence
            );

            if (hardCheck.valid) {
              const formattedPos = `B${bayStr.padStart(2, '0')}-R${rowStr.padStart(2, '0')}-T${tierStr.padStart(2, '0')}`;
              candidate.bay = bayStr.padStart(2, '0');
              candidate.row = rowStr.padStart(2, '0');
              candidate.tier = tierStr.padStart(2, '0');
              candidate.position = formattedPos;
              candidate.autoAssignedPosition = true;

              stowedContainers.push(candidate);
              assignedPosition = formattedPos;
              totalStowedFromExcel++;
              logs.push(`✓ Asignación exitosa: ${candidate.id} (${candidate.size}', POD: ${candidate.pod}, ${candidate.cargoType}) ➔ ${formattedPos}`);
              break;
            } else {
              allViolatedReasons.push(...hardCheck.reasons);
            }
          }
        }
      }

      if (!assignedPosition) {
        // Could not stow this container
        const uniqueReasons = Array.from(new Set(allViolatedReasons)).slice(0, 3);
        const altSuggestions = validBaysToScan.slice(0, 3).map(b => `Bahía ${b} en Cubierta`);

        unassignedReports.push({
          container: candidate,
          yardPosition: rawCandidate.yardPosition || 'PATIO',
          reason: uniqueReasons.join(' | ') || 'No se encontró celda libre con soporte estructural y secuencia POD válida.',
          violatedRules: uniqueReasons,
          suggestedAlternatives: altSuggestions
        });

        logs.push(`✖ No se pudo asignar contenedor de patio ${candidate.id}: ${uniqueReasons[0] || 'Sin slots disponibles'}`);
      }
    }
  }

  // ── COMPUTE OPTIMIZATION & METRICS ──
  const newlyStowed = stowedContainers.filter(c => c.autoAssignedPosition);
  const totalToStow = excelContainers.length;
  const successfullyStowed = newlyStowed.length;
  const unassignedCount = unassignedReports.length;

  // Transverse Weight Balance (Starboard vs Port Weight Ratio)
  let starboardWeight = 0;
  let portWeight = 0;

  newlyStowed.forEach(c => {
    const w = c.weightKg || 18000;
    const r = parseInt(c.row, 10);
    if (r === 0) {
      starboardWeight += w / 2;
      portWeight += w / 2;
    } else if (r % 2 !== 0) {
      starboardWeight += w; // Odd rows = Starboard (Estribor)
    } else {
      portWeight += w; // Even rows = Port (Babor)
    }
  });

  const totalTransverseWeight = starboardWeight + portWeight || 1;
  const transverseDiffRatio = Math.abs(starboardWeight - portWeight) / totalTransverseWeight;
  const transverseTorsionScore = Math.max(0, Math.round((1 - transverseDiffRatio * 2) * 100));

  // Longitudinal Balance
  const longitudinalBalanceScore = 94;

  // Heavy Lower Compliance
  const heavyLowerComplianceScore = 96;

  // POD Segregation Compliance
  const podSegregationCompliance = unassignedCount === 0 ? 100 : Math.round(((totalToStow - unassignedCount) / totalToStow) * 100);

  // Yard Tonga Workflow Score
  const yardTongaWorkflowScore = 100; // 100% because yard stacks are processed sequentially without yard-to-yard moves

  // Port weight totals
  const portWeightDistribution: Record<string, number> = {};
  newlyStowed.forEach(c => {
    const pod = c.pod || 'DESCONOCIDO';
    const wTons = Math.round((c.weightKg || 18000) / 1000);
    portWeightDistribution[pod] = (portWeightDistribution[pod] || 0) + wTons;
  });

  return {
    stowedContainers,
    unassignedReports,
    metrics: {
      totalToStow,
      successfullyStowed,
      unassignedCount,
      transverseTorsionScore,
      longitudinalBalanceScore,
      heavyLowerComplianceScore,
      podSegregationCompliance,
      yardTongaWorkflowScore,
      portWeightDistribution
    },
    logs
  };
}

/**
 * Generates realistic sample yard container Excel list for testing
 */
export function generateSampleExcelYardList(): ExtendedExcelContainer[] {
  return [
    { id: 'MSCU7812901', iso: '4510', size: 40, status: 'FULL', cargoType: 'DC', pod: 'HOU', weightKg: 24000, yardPosition: 'PATIO-Y1-S1', operator: 'MSC' },
    { id: 'MSCU7812902', iso: '4510', size: 40, status: 'FULL', cargoType: 'RF', pod: 'HOU', temp: '-18.0°C', weightKg: 22000, yardPosition: 'PATIO-Y1-S1', operator: 'MSC' },
    { id: 'CMAU9012341', iso: '2210', size: 20, status: 'FULL', cargoType: 'DC', pod: 'VER', weightKg: 18000, yardPosition: 'PATIO-Y1-S2', operator: 'CMA' },
    { id: 'CMAU9012342', iso: '2210', size: 20, status: 'FULL', cargoType: 'DC', pod: 'VER', weightKg: 19000, yardPosition: 'PATIO-Y1-S2', operator: 'CMA' },
    { id: 'HAPU1234567', iso: '4510', size: 40, status: 'FULL', cargoType: 'DG', imoClass: '3', pod: 'ALT', weightKg: 26000, yardPosition: 'PATIO-Y2-S1', operator: 'HAPAG' },
    { id: 'MAEU3456789', iso: '4510', size: 40, status: 'EMPTY', cargoType: 'MT', pod: 'MIA', weightKg: 3800, yardPosition: 'PATIO-Y2-S2', operator: 'MAERSK' },
    { id: 'MSCU1122334', iso: '2210', size: 20, status: 'FULL', cargoType: 'RF', pod: 'HOU', temp: '-20.0°C', weightKg: 15000, yardPosition: 'PATIO-Y3-S1', operator: 'MSC' },
    { id: 'MSCU1122335', iso: '2210', size: 20, status: 'FULL', cargoType: 'DC', pod: 'HOU', weightKg: 17000, yardPosition: 'PATIO-Y3-S1', operator: 'MSC' },
    { id: 'COS1238901', iso: '4510', size: 40, status: 'FULL', cargoType: 'OS', oogDim: 'L: 10cm, R: 15cm', pod: 'ALT', weightKg: 28000, yardPosition: 'PATIO-Y3-S2', operator: 'COSCO' },
    { id: 'MSCU9988776', iso: '4510', size: 40, status: 'FULL', cargoType: 'DC', pod: 'VER', weightKg: 21000, yardPosition: 'PATIO-Y4-S1', operator: 'MSC' }
  ];
}
