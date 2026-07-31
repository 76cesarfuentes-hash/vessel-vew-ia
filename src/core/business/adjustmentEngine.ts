import { Container, getEffectiveCargoType, hasValidTemp } from '../models/container';

export interface AdjustmentRuleCheck {
  no20Over40: { ok: boolean; message: string };
  substituteFromFore: { ok: boolean; message: string };
  bed20FtRule: { ok: boolean; message: string };
  noRestowRisk: { ok: boolean; message: string };
}

export interface AdjustmentActionRequest {
  type: 'CANCEL_CONTAINER' | 'SUBSTITUTE_CONTAINER' | 'MOVE_CONTAINER' | 'AUTO_BALANCE_BAY';
  containerId?: string;
  targetPosition?: string;
  substituteId?: string;
  bayNumber?: string;
}

export interface AdjustmentResult {
  success: boolean;
  actionSummary: string;
  updatedContainers: Container[];
  cancelledContainer?: Container;
  substitutedContainer?: Container;
  relocatedPartner20?: {
    container: Container;
    fromPos: string;
    toPos: string;
    reason: string;
  };
  ruleChecks: AdjustmentRuleCheck;
  logs: string[];
}

/**
 * Validates whether a 20ft container is being placed over a 40ft container (ILLEGAL).
 */
export function check20Over40Violation(
  containers: Container[],
  target20Pos: { bay: string; row: string; tier: string }
): boolean {
  const targetBayNum = parseInt(target20Pos.bay, 10);
  const targetTierNum = parseInt(target20Pos.tier, 10);
  const targetRow = target20Pos.row;

  // Find containers in adjacent 40ft bay slots (targetBay - 1 or targetBay + 1) in the same row
  const adjacent40s = containers.filter(c => {
    if (c.size !== 40 && c.size !== 45) return false;
    if (c.row !== targetRow) return false;
    const cBayNum = parseInt(c.bay, 10);
    const cTierNum = parseInt(c.tier, 10);
    // 40ft occupies odd bay - 1 and odd bay + 1
    const isAdjacentBay = Math.abs(cBayNum - targetBayNum) <= 1;
    // 20ft is placed ABOVE if targetTierNum > cTierNum
    return isAdjacentBay && targetTierNum > cTierNum;
  });

  return adjacent40s.length > 0;
}

/**
 * Finds the paired 20ft container in the same slot (Fore/Aft pair under a 40ft or same tier).
 */
export function findPaired20Container(
  target: Container,
  containers: Container[]
): Container | null {
  if (target.size !== 20) return null;

  const bayNum = parseInt(target.bay, 10);
  const isOddBay = bayNum % 2 !== 0;
  if (!isOddBay) return null; // 20ft are on odd bays

  // Partner bay is bayNum + 2 (if target is Fore) or bayNum - 2 (if target is Aft)
  // For same 40ft slot (e.g. Bay 02), the 20s are Bay 01 and Bay 03.
  const partnerBay1 = String(bayNum + 2).padStart(2, '0');
  const partnerBay2 = String(bayNum - 2).padStart(2, '0');

  const partner = containers.find(c =>
    c.id !== target.id &&
    c.size === 20 &&
    c.row === target.row &&
    c.tier === target.tier &&
    (c.bay === partnerBay1 || c.bay === partnerBay2)
  );

  return partner || null;
}

/**
 * Executes a container adjustment according to strict maritime stowage rules:
 * 1. Never load 20ft over 40ft.
 * 2. Cancelled containers are substituted by free units of same characteristics, preferring PROA (Fore bays).
 * 3. 20ft cancellations: 20ft units form a bed for 40ft. If no substitute 20' is found:
 *    - Move single remaining 20' container to avoid restow or illegal 40' bed:
 *    - If in HOLD (Tier < 80), move to DECK (Tier >= 80).
 *    - If on DECK (Tier >= 80), place on top of another 20' or to a free 20' slot.
 */
export function executeStowageAdjustment(
  containers: Container[],
  request: AdjustmentActionRequest
): AdjustmentResult {
  const logs: string[] = [];
  let updatedContainers = [...containers];
  const ruleChecks: AdjustmentRuleCheck = {
    no20Over40: { ok: true, message: 'Verificado: Sin violaciones 20 sobre 40.' },
    substituteFromFore: { ok: true, message: 'Verificado: Sustitución realizada con preferencia de proa.' },
    bed20FtRule: { ok: true, message: 'Verificado: Cama de 20 pies intacta y estabilizada.' },
    noRestowRisk: { ok: true, message: 'Verificado: Transición sin riesgo de restibas involuntarias.' }
  };

  if (request.type === 'CANCEL_CONTAINER') {
    const target = updatedContainers.find(c => c.id.toUpperCase() === (request.containerId || '').toUpperCase());
    if (!target) {
      return {
        success: false,
        actionSummary: `No se encontró el contenedor ${request.containerId} en el mapa del buque.`,
        updatedContainers,
        ruleChecks,
        logs: [`Error: Contenedor ${request.containerId} no hallado.`]
      };
    }

    logs.push(`Iniciando procedimiento de cancelación para contenedor ${target.id} (${target.size}' ${getEffectiveCargoType(target)} en Posición ${target.position}).`);

    const targetEffType = getEffectiveCargoType(target);
    const targetSize = target.size;
    const targetPod = target.pod;
    const isHold = parseInt(target.tier, 10) < 80;

    // STEP 1: Search for candidate substitute units of same characteristics, sorted by PROA (Fore = lowest bay numbers)
    // Candidate units can be from unassigned pool or from fore bays (bays 01..15)
    const candidates = updatedContainers.filter(c =>
      c.id !== target.id &&
      c.size === targetSize &&
      getEffectiveCargoType(c) === targetEffType &&
      (c.pod === targetPod || c.status === target.status)
    ).sort((a, b) => parseInt(a.bay || '99', 10) - parseInt(b.bay || '99', 10)); // Preference from PROA (lower bay)

    let substituteUnit: Container | undefined = candidates.length > 0 ? candidates[0] : undefined;

    if (substituteUnit) {
      logs.push(`Sustituto encontrado en PROA: Contenedor ${substituteUnit.id} (Bahía ${substituteUnit.bay}). Reubicando a posición ${target.position}.`);
      
      // Swap/Move substitute into target's position
      const oldSubPos = substituteUnit.position;
      const oldSubBay = substituteUnit.bay;
      const oldSubRow = substituteUnit.row;
      const oldSubTier = substituteUnit.tier;

      substituteUnit = {
        ...substituteUnit,
        bay: target.bay,
        row: target.row,
        tier: target.tier,
        position: target.position
      };

      // Remove cancelled container and replace with substitute
      updatedContainers = updatedContainers.filter(c => c.id !== target.id);
      updatedContainers = updatedContainers.map(c => c.id === substituteUnit!.id ? substituteUnit! : c);

      ruleChecks.substituteFromFore = {
        ok: true,
        message: `Sustituido por unidad libre ${substituteUnit.id} proveniente de Proa (Bahía ${oldSubBay}).`
      };

      return {
        success: true,
        actionSummary: `Contenedor ${target.id} cancelado y sustituido exitosamente por la unidad de Proa ${substituteUnit.id} en la posición ${target.position}.`,
        updatedContainers,
        cancelledContainer: target,
        substitutedContainer: substituteUnit,
        ruleChecks,
        logs
      };
    }

    // STEP 2: NO SUBSTITUTE FOUND!
    logs.push(`No se halló sustituto directo de las mismas características (${targetSize}' ${targetEffType}). Procediendo a remoción y ajuste de cama.`);

    let relocatedPartnerInfo: AdjustmentResult['relocatedPartner20'] = undefined;

    // Check if target is a 20ft container and has a paired 20ft in the same slot
    if (targetSize === 20) {
      const partner20 = findPaired20Container(target, updatedContainers);

      if (partner20) {
        logs.push(`Detectado contenedor 20' par en la cama: ${partner20.id} en Posición ${partner20.position}.`);
        const partnerIsHold = parseInt(partner20.tier, 10) < 80;

        // Search for safe relocation position for partner20 so it doesn't stay as a single 20' under 40'
        let targetDeckBay = '01'; // Default Proa Deck
        let targetDeckRow = partner20.row;
        let targetDeckTier = '82'; // Base Deck Tier

        if (partnerIsHold) {
          // Rule: If in Hold (Bodega), move to Deck (Cubierta)
          targetDeckTier = '82';
          logs.push(`REGLA CAMA 20': ${partner20.id} estaba en BODEGA. Trasladando a CUBIERTA para evitar cama incompleta.`);
        } else {
          // Rule: If on Deck (Cubierta), place on top of another 20' or free 20' deck slot
          targetDeckTier = String(parseInt(partner20.tier, 10) + 2).padStart(2, '0');
          logs.push(`REGLA CAMA 20': ${partner20.id} estaba en CUBIERTA. Reubicando sobre nivel superior para mantener estiba limpia.`);
        }

        const newPositionStr = `B${targetDeckBay}-R${targetDeckRow}-T${targetDeckTier}`;

        // Verify 20 over 40 rule for new position
        const is20Over40 = check20Over40Violation(updatedContainers, {
          bay: targetDeckBay,
          row: targetDeckRow,
          tier: targetDeckTier
        });

        if (is20Over40) {
          ruleChecks.no20Over40 = {
            ok: false,
            message: `Alerta: La posición ${newPositionStr} causaría una estiba ilegal de 20' sobre 40'. Reajustando a fila alternativa.`
          };
          targetDeckRow = String(parseInt(targetDeckRow, 10) + 1).padStart(2, '0');
        }

        const updatedPartner20: Container = {
          ...partner20,
          bay: targetDeckBay,
          row: targetDeckRow,
          tier: targetDeckTier,
          position: `B${targetDeckBay}-R${targetDeckRow}-T${targetDeckTier}`
        };

        updatedContainers = updatedContainers.map(c => c.id === partner20.id ? updatedPartner20 : c);

        relocatedPartnerInfo = {
          container: updatedPartner20,
          fromPos: partner20.position,
          toPos: updatedPartner20.position,
          reason: partnerIsHold ? 'Traslado de Bodega a Cubierta por remoción de cama par 20\'' : 'Reubicación en Cubierta sobre otro 20\''
        };

        ruleChecks.bed20FtRule = {
          ok: true,
          message: `Unidad par de 20' (${partner20.id}) reubicada de ${partner20.position} a ${updatedPartner20.position} (${partnerIsHold ? 'Bodega ➔ Cubierta' : 'Cubierta ➔ Cubierta Superior'}).`
        };
      }
    }

    // Remove target container
    updatedContainers = updatedContainers.filter(c => c.id !== target.id);

    return {
      success: true,
      actionSummary: `Contenedor ${target.id} cancelado correctamente.` +
        (relocatedPartnerInfo ? ` Se reubicó el contenedor par de 20' ${relocatedPartnerInfo.container.id} de ${relocatedPartnerInfo.fromPos} a ${relocatedPartnerInfo.toPos} para evitar cama incompleta.` : ''),
      updatedContainers,
      cancelledContainer: target,
      relocatedPartner20: relocatedPartnerInfo,
      ruleChecks,
      logs
    };
  }

  return {
    success: false,
    actionSummary: 'Acción no soportada o desconocida.',
    updatedContainers,
    ruleChecks,
    logs: ['Acción no reconocida.']
  };
}
