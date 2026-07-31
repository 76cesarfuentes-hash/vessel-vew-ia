import { normalizePortCode, NO_DATA } from '../parser/portNormalizer';

export interface OptimizationSubMove {
  containerId: string;
  from: string;
  to: string;
}

export interface OptimizationAction {
  id: number | string;
  priority?: number;
  prio?: number;
  action?: 'MOVE' | 'SWAP' | 'SHIFT' | 'LOWER_STACK';
  type?: 'MOVE' | 'SWAP' | 'SHIFT' | 'LOWER_STACK';
  containerId?: string;
  container?: string;
  from?: string;
  to?: string;
  // SWAP specific
  containerId2?: string;
  container2?: string;
  to2?: string;
  from2?: string;
  // SHIFT / LOWER_STACK specific
  containers?: Array<{
    containerId?: string;
    container?: string;
    from: string;
    to: string;
  }>;
  reason?: string;
}

export interface OptimizationPlan {
  vessel?: string;
  voyage?: string;
  terminal?: string;
  instructions?: OptimizationAction[];
  actions?: OptimizationAction[];
}

export interface MovinsContainerRecord {
  containerId: string;
  segments: string[];
  loc147Index: number;
  originalPos: string;
  currentPos: string;
}

export interface MovinsExecutionReport {
  totalContainersRead: number;
  instructionsReceived: number;
  executedSuccessfully: number;
  failedInstructions: number;
  moveCount: number;
  swapCount: number;
  shiftCount: number;
  lowerStackCount: number;
  executionTimeSeconds: number;
  success: boolean;
  errorMessage?: string;
  errorDetails?: Array<{
    instructionId: string | number;
    actionType: string;
    containerId: string;
    reason: string;
  }>;
  outputMovinsContent?: string;
  logs: string[];
}

/**
 * Clean position string to 7-digit standard (e.g. "120282" -> "0120282")
 */
function cleanPos(posRaw: string | undefined | null): string {
  if (!posRaw) return '';
  const p = posRaw.trim().split(':')[0].trim();
  if (!p || p === NO_DATA) return '';
  return p.padStart(7, '0');
}

/**
 * Helper to parse raw MOVINS EDIFACT content into header segments, container records, and trailer segments
 */
export function parseMovinsForExecution(movinsText: string): {
  headerSegments: string[];
  containerRecords: Map<string, MovinsContainerRecord>;
  containerOrder: string[];
  trailerSegments: string[];
  originalSegmentDelimiter: string;
} {
  if (!movinsText || !movinsText.trim()) {
    throw new Error('El archivo MOVINS original está vacío.');
  }

  // Determine delimiter (default is `'` for EDIFACT)
  const originalSegmentDelimiter = "'";
  
  // Split segments preserving structure
  const rawSegments = movinsText
    .split(/['\r\n]+/)
    .map(s => s.trim())
    .filter(Boolean);

  const headerSegments: string[] = [];
  const trailerSegments: string[] = [];
  const containerRecords = new Map<string, MovinsContainerRecord>();
  const containerOrder: string[] = [];

  let isReadingContainers = false;
  let currentRecord: MovinsContainerRecord | null = null;

  for (let i = 0; i < rawSegments.length; i++) {
    const seg = rawSegments[i];
    const comp = seg.split('+');
    const tag = (comp[0] || '').toUpperCase();

    if (tag === 'EQD') {
      isReadingContainers = true;
      // Commit previous
      if (currentRecord) {
        containerRecords.set(currentRecord.containerId, currentRecord);
        containerOrder.push(currentRecord.containerId);
      }

      // Extract container ID from EQD
      // EQD+CN+MSKU1234567+...
      const cId = (comp[2] || comp[1] || '').trim().toUpperCase();
      currentRecord = {
        containerId: cId,
        segments: [seg],
        loc147Index: -1,
        originalPos: '',
        currentPos: ''
      };
    } else if (isReadingContainers && (tag === 'UNT' || tag === 'UNZ')) {
      // End of container block
      if (currentRecord) {
        containerRecords.set(currentRecord.containerId, currentRecord);
        containerOrder.push(currentRecord.containerId);
        currentRecord = null;
      }
      isReadingContainers = false;
      trailerSegments.push(seg);
    } else if (currentRecord) {
      currentRecord.segments.push(seg);
      if (tag === 'LOC' && comp[1] === '147') {
        currentRecord.loc147Index = currentRecord.segments.length - 1;
        const rawPos = (comp[2] || '').split(':')[0].trim();
        const pos = cleanPos(rawPos);
        currentRecord.originalPos = pos;
        currentRecord.currentPos = pos;
      }
    } else if (!isReadingContainers) {
      headerSegments.push(seg);
    } else {
      trailerSegments.push(seg);
    }
  }

  if (currentRecord) {
    containerRecords.set(currentRecord.containerId, currentRecord);
    containerOrder.push(currentRecord.containerId);
  }

  return {
    headerSegments,
    containerRecords,
    containerOrder,
    trailerSegments,
    originalSegmentDelimiter
  };
}

/**
 * Normalizes input optimization plan JSON into array of standardized actions
 */
export function normalizeOptimizationPlan(rawPlan: string | OptimizationPlan | OptimizationAction[]): OptimizationAction[] {
  let actions: OptimizationAction[] = [];

  if (typeof rawPlan === 'string') {
    try {
      const parsed = JSON.parse(rawPlan);
      if (Array.isArray(parsed)) {
        actions = parsed;
      } else if (parsed && typeof parsed === 'object') {
        actions = parsed.instructions || parsed.actions || [];
      }
    } catch (e) {
      throw new Error(`Error al interpretar optimization.json: ${(e as Error).message}`);
    }
  } else if (Array.isArray(rawPlan)) {
    actions = rawPlan;
  } else if (rawPlan && typeof rawPlan === 'object') {
    actions = rawPlan.instructions || rawPlan.actions || [];
  }

  if (!Array.isArray(actions) || actions.length === 0) {
    throw new Error('El archivo optimization.json no contiene instrucciones válidas.');
  }

  // Standardize each action
  const standardized: OptimizationAction[] = actions.map((a, index) => {
    const actType = (a.action || a.type || 'MOVE').toUpperCase() as any;
    const prio = a.priority ?? a.prio ?? 1;
    const id = a.id ?? (index + 1);

    return {
      ...a,
      id,
      priority: Number(prio),
      action: actType
    };
  });

  // Sort by priority ascending (1, 2, 3...) and then by id ascending
  standardized.sort((a, b) => {
    if ((a.priority || 1) !== (b.priority || 1)) {
      return (a.priority || 1) - (b.priority || 1);
    }
    return String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
  });

  return standardized;
}

/**
 * Main Execution Function for MOVINS Execution Engine
 */
export function executeMovinsPlan(
  baplieContent: string,
  movinsContent: string,
  optimizationJsonInput: string | OptimizationPlan | OptimizationAction[]
): MovinsExecutionReport {
  const startTime = performance.now();
  const logs: string[] = [];

  logs.push('Iniciando MOVINS Execution Engine...');
  logs.push('Paso 1: Lectura e indexación completa del MOVINS original.');

  let parsedMovins: ReturnType<typeof parseMovinsForExecution>;
  try {
    parsedMovins = parseMovinsForExecution(movinsContent);
  } catch (err) {
    const timeSec = Number(((performance.now() - startTime) / 1000).toFixed(2));
    return {
      totalContainersRead: 0,
      instructionsReceived: 0,
      executedSuccessfully: 0,
      failedInstructions: 1,
      moveCount: 0,
      swapCount: 0,
      shiftCount: 0,
      lowerStackCount: 0,
      executionTimeSeconds: timeSec,
      success: false,
      errorMessage: `Error al parsear MOVINS original: ${(err as Error).message}`,
      logs
    };
  }

  const { containerRecords, containerOrder, headerSegments, trailerSegments } = parsedMovins;
  const totalContainersRead = containerRecords.size;
  logs.push(`Contenedores leídos e indizados correctamente: ${totalContainersRead}`);

  // Create fast position lookup simulation state
  // posMap: cleanPos -> containerId
  // containerPosMap: containerId -> cleanPos
  const posMap = new Map<string, string>();
  const containerPosMap = new Map<string, string>();

  containerRecords.forEach((record, cId) => {
    if (record.currentPos) {
      posMap.set(record.currentPos, cId);
      containerPosMap.set(cId, record.currentPos);
    }
  });

  logs.push('Paso 2: Lectura y ordenamiento de optimization.json.');
  let actions: OptimizationAction[] = [];
  try {
    actions = normalizeOptimizationPlan(optimizationJsonInput);
  } catch (err) {
    const timeSec = Number(((performance.now() - startTime) / 1000).toFixed(2));
    return {
      totalContainersRead,
      instructionsReceived: 0,
      executedSuccessfully: 0,
      failedInstructions: 1,
      moveCount: 0,
      swapCount: 0,
      shiftCount: 0,
      lowerStackCount: 0,
      executionTimeSeconds: timeSec,
      success: false,
      errorMessage: (err as Error).message,
      logs
    };
  }

  logs.push(`Instrucciones recibidas: ${actions.length}. Ordenadas por prioridad e ID.`);

  // Counts for report
  let moveCount = 0;
  let swapCount = 0;
  let shiftCount = 0;
  let lowerStackCount = 0;
  let executedSuccessfully = 0;
  const errorDetails: Array<{ instructionId: string | number; actionType: string; containerId: string; reason: string }> = [];

  // Step 3: Validate and execute instructions in strict order
  logs.push('Paso 3: Validaciones pre-ejecución y aplicación determinista de acciones.');

  for (const act of actions) {
    const actType = act.action || 'MOVE';
    const actId = act.id;

    // Collect sub-moves for this action
    const subMoves: OptimizationSubMove[] = [];

    if (actType === 'MOVE') {
      const cId = (act.containerId || act.container || '').trim().toUpperCase();
      const from = cleanPos(act.from);
      const to = cleanPos(act.to);
      subMoves.push({ containerId: cId, from, to });
    } else if (actType === 'SWAP') {
      const c1 = (act.containerId || act.container || '').trim().toUpperCase();
      const from1 = cleanPos(act.from);
      const to1 = cleanPos(act.to || act.to2);

      const c2 = (act.containerId2 || act.container2 || '').trim().toUpperCase();
      const from2 = cleanPos(act.from2 || to1);
      const to2 = cleanPos(act.to2 || from1);

      subMoves.push({ containerId: c1, from: from1, to: to1 });
      subMoves.push({ containerId: c2, from: from2, to: to2 });
    } else if (actType === 'SHIFT' || actType === 'LOWER_STACK') {
      if (Array.isArray(act.containers) && act.containers.length > 0) {
        for (const item of act.containers) {
          subMoves.push({
            containerId: (item.containerId || item.container || '').trim().toUpperCase(),
            from: cleanPos(item.from),
            to: cleanPos(item.to)
          });
        }
      } else {
        const cId = (act.containerId || act.container || '').trim().toUpperCase();
        subMoves.push({
          containerId: cId,
          from: cleanPos(act.from),
          to: cleanPos(act.to)
        });
      }
    }

    if (subMoves.length === 0) {
      const reason = 'Instrucción sin contenedores ni posiciones válidas.';
      errorDetails.push({ instructionId: actId, actionType: actType, containerId: 'N/A', reason });
      logs.push(`[ERROR] Instrucción #${actId} (${actType}): ${reason}`);
      break;
    }

    // Validation phase for sub-moves of this action
    let actionFailed = false;
    const leavingPositions = new Set<string>(subMoves.map(m => m.from));

    for (const sm of subMoves) {
      // 1. Existencia
      if (!sm.containerId || !containerRecords.has(sm.containerId)) {
        const reason = `El contenedor '${sm.containerId || 'N/A'}' no existe en el archivo MOVINS original.`;
        errorDetails.push({ instructionId: actId, actionType: actType, containerId: sm.containerId || 'N/A', reason });
        logs.push(`[VALIDACIÓN FALLIDA] Instrucción #${actId} (${actType}): ${reason}`);
        actionFailed = true;
        break;
      }

      // 2. Posición
      const currentSimPos = containerPosMap.get(sm.containerId);
      if (currentSimPos !== sm.from) {
        const reason = `El contenedor '${sm.containerId}' ocupa la posición actual '${currentSimPos || 'DESCONOCIDA'}', pero la instrucción indica 'from: ${sm.from}'.`;
        errorDetails.push({ instructionId: actId, actionType: actType, containerId: sm.containerId, reason });
        logs.push(`[VALIDACIÓN FALLIDA] Instrucción #${actId} (${actType}): ${reason}`);
        actionFailed = true;
        break;
      }

      // 3. Destino
      if (!sm.to || sm.to.length < 6) {
        const reason = `La posición destino '${sm.to}' no es válida.`;
        errorDetails.push({ instructionId: actId, actionType: actType, containerId: sm.containerId, reason });
        logs.push(`[VALIDACIÓN FALLIDA] Instrucción #${actId} (${actType}): ${reason}`);
        actionFailed = true;
        break;
      }

      // 4. Disponibilidad (Posición libre o liberada por SWAP/SHIFT en la misma acción)
      const currentOccupant = posMap.get(sm.to);
      if (currentOccupant && currentOccupant !== sm.containerId) {
        if (!leavingPositions.has(sm.to)) {
          const reason = `La posición destino '${sm.to}' está ocupada por el contenedor '${currentOccupant}' y no se libera en esta acción.`;
          errorDetails.push({ instructionId: actId, actionType: actType, containerId: sm.containerId, reason });
          logs.push(`[VALIDACIÓN FALLIDA] Instrucción #${actId} (${actType}): ${reason}`);
          actionFailed = true;
          break;
        }
      }
    }

    if (actionFailed) {
      logs.push(`[STOP] Proceso detenido debido a fallo en instrucción #${actId}. No se generó el archivo MOVINS final.`);
      break;
    }

    // Apply sub-moves in simulation state and update container LOC+147
    for (const sm of subMoves) {
      posMap.delete(sm.from);
      containerPosMap.set(sm.containerId, sm.to);

      const record = containerRecords.get(sm.containerId)!;
      record.currentPos = sm.to;

      // Update LOC+147 segment in container segment block
      if (record.loc147Index >= 0 && record.loc147Index < record.segments.length) {
        const oldSeg = record.segments[record.loc147Index];
        const comp = oldSeg.split('+');
        if (comp.length >= 3) {
          // Preserve suffixes like ::5
          const oldLoc3 = comp[2];
          const newLoc3 = oldLoc3.replace(/^[^:]+/, sm.to);
          comp[2] = newLoc3;
          record.segments[record.loc147Index] = comp.join('+');
        } else {
          record.segments[record.loc147Index] = `LOC+147+${sm.to}'`;
        }
      }
    }

    for (const sm of subMoves) {
      posMap.set(sm.to, sm.containerId);
    }

    executedSuccessfully++;
    if (actType === 'MOVE') moveCount++;
    else if (actType === 'SWAP') swapCount++;
    else if (actType === 'SHIFT') shiftCount++;
    else if (actType === 'LOWER_STACK') lowerStackCount++;

    logs.push(`[OK] Instrucción #${actId} (${actType}) ejecutada correctamente.`);
  }

  // Check if any action failed
  if (errorDetails.length > 0 || executedSuccessfully < actions.length) {
    const timeSec = Number(((performance.now() - startTime) / 1000).toFixed(2));
    return {
      totalContainersRead,
      instructionsReceived: actions.length,
      executedSuccessfully,
      failedInstructions: actions.length - executedSuccessfully,
      moveCount,
      swapCount,
      shiftCount,
      lowerStackCount,
      executionTimeSeconds: timeSec,
      success: false,
      errorMessage: `Proceso detenido: ${errorDetails.length} instrucción(es) fallaron la validación.`,
      errorDetails,
      logs
    };
  }

  // Step 4: Final Validation Checks
  logs.push('Paso 4: Ejecutando validaciones finales del archivo MOVINS reensamblado...');

  // 1. Check duplicate positions
  const finalPosCheck = new Map<string, string>();
  let duplicateError = '';
  containerRecords.forEach((rec, cId) => {
    if (rec.currentPos) {
      if (finalPosCheck.has(rec.currentPos)) {
        duplicateError = `Posición duplicada detectada '${rec.currentPos}' entre contenedores '${cId}' y '${finalPosCheck.get(rec.currentPos)}'.`;
      } else {
        finalPosCheck.set(rec.currentPos, cId);
      }
    }
  });

  if (duplicateError) {
    const timeSec = Number(((performance.now() - startTime) / 1000).toFixed(2));
    return {
      totalContainersRead,
      instructionsReceived: actions.length,
      executedSuccessfully,
      failedInstructions: 1,
      moveCount,
      swapCount,
      shiftCount,
      lowerStackCount,
      executionTimeSeconds: timeSec,
      success: false,
      errorMessage: `Validación final fallida: ${duplicateError}`,
      logs
    };
  }

  // Reconstruct complete EDIFACT document
  const finalBodySegments: string[] = [];

  // Add header
  headerSegments.forEach(s => finalBodySegments.push(s));

  // Add all containers preserving exact order
  containerOrder.forEach(cId => {
    const rec = containerRecords.get(cId);
    if (rec) {
      rec.segments.forEach(s => finalBodySegments.push(s));
    }
  });

  // Handle trailer segments (UNT segment count recalculation)
  let untIndex = -1;
  trailerSegments.forEach((seg, idx) => {
    if (seg.startsWith('UNT+')) {
      untIndex = idx;
    }
  });

  // Calculate UNT segment count (number of segments from UNH to UNT inclusive)
  // Find UNH position in finalBodySegments
  let unhIndex = finalBodySegments.findIndex(s => s.startsWith('UNH+'));
  if (unhIndex === -1) unhIndex = 0;

  // Add trailer segments except UNT/UNZ first to get exact count
  const preUntTotal = finalBodySegments.length - unhIndex + 1; // +1 for UNT itself

  const updatedTrailerSegments = trailerSegments.map(seg => {
    if (seg.startsWith('UNT+')) {
      const comp = seg.split('+');
      if (comp.length >= 3) {
        comp[1] = String(preUntTotal);
        return comp.join('+');
      }
      return `UNT+${preUntTotal}+1'`;
    }
    return seg;
  });

  updatedTrailerSegments.forEach(s => finalBodySegments.push(s));

  // Build final EDIFACT string
  const outputMovinsContent = finalBodySegments
    .map(s => (s.endsWith("'") ? s : s + "'"))
    .join('\n');

  const timeSec = Number(((performance.now() - startTime) / 1000).toFixed(2));
  logs.push(`Validaciones finales superadas con éxito. Nuevo MOVINS generado.`);
  logs.push(`Tiempo total de ejecución: ${timeSec} segundos.`);

  return {
    totalContainersRead,
    instructionsReceived: actions.length,
    executedSuccessfully,
    failedInstructions: 0,
    moveCount,
    swapCount,
    shiftCount,
    lowerStackCount,
    executionTimeSeconds: timeSec,
    success: true,
    outputMovinsContent,
    logs
  };
}
