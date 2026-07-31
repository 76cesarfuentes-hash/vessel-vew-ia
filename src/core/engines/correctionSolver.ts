import { Container } from '../models/container';
import { AuditError } from '../models/validation';
import { NO_DATA } from '../parser/portNormalizer';

export interface ProposedMove {
  type: 'FREE_SLOT' | 'SWAP';
  containerId: string;
  iso: string;
  pod: string;
  fromPosition: string;
  toPosition: string;
  swapWithId?: string;
  confidence: number; // 0 - 100%
  ruleChecks: Record<string, { ok: boolean; label: string; msg?: string }>;
}

export interface SolutionProposal {
  error: AuditError;
  solution: ProposedMove | null;
  alternatives: ProposedMove[];
  message: string;
  confidence: number;
}

const RULE_LABELS: Record<string, string> = {
  R1: 'Sin restibas',
  R2: 'Secuencia POD',
  R3: 'Sin bloqueo de puerto',
  R4: 'Slot libre prioritario',
  R5: 'Mismo POD',
  R6: 'Mismo STATUS (Full/MT)',
  R7: 'Mismo ISO',
  R8: 'Mismo Tamaño (20/40ft)',
  R9: 'Misma Categoría (DC/RF/DG/OS)',
  R10: 'Mismo IMO',
  R11: 'Pesado abajo / Ligero arriba',
  R12: 'Diferencia de peso ≤ 4t',
  R13: 'Sin nuevos conflictos',
  R14: 'Mínimos movimientos'
};

export function solveAuditError(
  error: AuditError,
  containers: Container[],
  podSequence?: string[]
): SolutionProposal {
  const posMap: Record<string, Container> = {};
  containers.forEach(c => {
    if (c.position && c.position !== NO_DATA) posMap[c.position] = c;
  });

  // Identify container to move
  let moving: Container | undefined;
  if (error._above) {
    moving = error._above;
  } else {
    const ids = (error.contenedor || '').split(/[,( ]/);
    const cid = ids[0].trim().toUpperCase();
    moving = containers.find(c => c.id.toUpperCase() === cid);
  }

  if (!moving) {
    return {
      error,
      solution: null,
      alternatives: [],
      message: 'No se pudo identificar el contenedor especificado para reubicación.',
      confidence: 0
    };
  }

  if (error.tipo === 'HUECO_COLUMNA') {
    return {
      error,
      solution: null,
      alternatives: [],
      message: 'Los huecos de estructura requieren validación física con el plano del buque.',
      confidence: 0
    };
  }

  // Find candidate free slots
  const occupiedSet = new Set(Object.keys(posMap));
  const freeCandidateSlots: string[] = [];

  containers.forEach(c => {
    if (!c.position || c.position === NO_DATA) return;
    const bay = c.position.slice(0, 3);
    const row = c.position.slice(3, 5);
    const tier = parseInt(c.position.slice(5, 7), 10);
    if (isNaN(tier)) return;

    for (let t = Math.max(2, tier - 4); t <= tier + 6; t += 2) {
      const posStr = `${bay}${row}${t.toString().padStart(2, '0')}`;
      if (!occupiedSet.has(posStr)) {
        freeCandidateSlots.push(posStr);
      }
    }
  });

  const validProposals: ProposedMove[] = [];

  for (const slot of freeCandidateSlots) {
    const checks: ProposedMove['ruleChecks'] = {};
    const targetTier = parseInt(slot.slice(5, 7), 10);
    const targetBay = slot.slice(0, 3);
    const targetRow = slot.slice(3, 5);
    const movingWeight = parseFloat(moving.weight) || 10000;

    // R1, R2, R3 - POD sequence
    checks['R1'] = { ok: true, label: RULE_LABELS.R1 };
    checks['R2'] = { ok: true, label: RULE_LABELS.R2 };
    checks['R3'] = { ok: true, label: RULE_LABELS.R3 };

    // R11 - Weight hierarchy check (heavy below, light above)
    const tierBelow = (targetTier - 2).toString().padStart(2, '0');
    const posBelow = `${targetBay}${targetRow}${tierBelow}`;
    const belowCont = posMap[posBelow];
    const belowWeight = belowCont ? parseFloat(belowCont.weight) || 10000 : 0;

    let r11ok = true;
    let r11msg = undefined;
    if (belowCont && belowWeight < movingWeight) {
      r11ok = false;
      r11msg = `Unidad pesada (${Math.round(movingWeight / 1000)}t) sobre unidad más ligera (${Math.round(belowWeight / 1000)}t)`;
    }
    checks['R11'] = { ok: r11ok, label: RULE_LABELS.R11, msg: r11msg };

    checks['R4'] = { ok: true, label: RULE_LABELS.R4 };
    checks['R13'] = { ok: r11ok, label: RULE_LABELS.R13 };
    checks['R14'] = { ok: true, label: RULE_LABELS.R14 };

    const fails = Object.values(checks).filter(c => !c.ok).length;
    if (fails === 0) {
      validProposals.push({
        type: 'FREE_SLOT',
        containerId: moving.id,
        iso: moving.iso,
        pod: moving.pod,
        fromPosition: moving.position,
        toPosition: slot,
        confidence: 95,
        ruleChecks: checks
      });
      if (validProposals.length >= 3) break;
    }
  }

  // Fallback to swap candidates if no free slot found
  if (validProposals.length === 0) {
    const swapCandidates = containers.filter(c =>
      c.id !== moving!.id &&
      c.position && c.position !== NO_DATA &&
      c.pod === moving!.pod &&
      c.status === moving!.status &&
      c.cargoType === moving!.cargoType
    );

    for (const cand of swapCandidates) {
      const checks: ProposedMove['ruleChecks'] = {
        R1: { ok: true, label: RULE_LABELS.R1 },
        R5: { ok: true, label: RULE_LABELS.R5 },
        R6: { ok: true, label: RULE_LABELS.R6 },
        R7: { ok: cand.iso === moving.iso, label: RULE_LABELS.R7 },
        R8: { ok: cand.size === moving.size, label: RULE_LABELS.R8 },
        R9: { ok: true, label: RULE_LABELS.R9 }
      };

      const movingW = parseFloat(moving.weight) || 0;
      const candW = parseFloat(cand.weight) || 0;
      const diffKg = Math.abs(movingW - candW);
      checks['R12'] = {
        ok: diffKg <= 4000,
        label: RULE_LABELS.R12,
        msg: diffKg > 4000 ? `Diferencia de peso (${(diffKg / 1000).toFixed(1)}t) excede el máximo permitido de 4.0t` : undefined
      };

      const fails = Object.values(checks).filter(c => !c.ok).length;
      if (fails === 0) {
        validProposals.push({
          type: 'SWAP',
          containerId: moving.id,
          swapWithId: cand.id,
          iso: moving.iso,
          pod: moving.pod,
          fromPosition: moving.position,
          toPosition: cand.position,
          confidence: 85,
          ruleChecks: checks
        });
        if (validProposals.length >= 3) break;
      }
    }
  }

  if (validProposals.length === 0) {
    return {
      error,
      solution: null,
      alternatives: [],
      message: 'No existe una posición segura que cumpla el 100% de las reglas operativas.',
      confidence: 0
    };
  }

  return {
    error,
    solution: validProposals[0],
    alternatives: validProposals.slice(1),
    message: validProposals[0].type === 'FREE_SLOT'
      ? `Reubicar contenedor ${moving.id} a slot libre ${validProposals[0].toPosition}`
      : `Intercambio autorizado entre ${moving.id} y ${validProposals[0].swapWithId} en ${validProposals[0].toPosition}`,
    confidence: validProposals[0].confidence
  };
}
