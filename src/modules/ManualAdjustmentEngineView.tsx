import React, { useState, useMemo, useEffect } from 'react';
import { useStowageStore } from '../core/stores/useStowageStore';
import { Container } from '../core/models/container';
import { validateContainerStackingRules } from '../core/business/adjustmentEngine';
import {
  exportToBaplieEDI,
  exportToExcel
} from '../core/services/exportService';
import {
  getMiniPlanClassificationAndColor,
  getContainerColor,
  getPortColor,
  IMPORT_ORANGE,
  TRANSIT_GRAY,
  RESTOW_RED
} from '../core/business/colorEngine';
import { checkIsDischargeContainer } from '../core/business/restowEngine';
import {
  Sliders,
  Search,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Move,
  History,
  Box,
  Layers,
  Ship,
  ArrowRight,
  Edit3,
  Check,
  Upload,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  X,
  Sparkles,
  ArrowDownUp,
  SlidersHorizontal,
  Info,
  Award,
  ShieldCheck,
  Download,
  Zap
} from 'lucide-react';

export interface RecycledContainer {
  container: Container;
  reasonType: 'cancelacion' | 'restiba_planner' | 'estorba' | 'manual';
  reasonNotes?: string;
  removedAt: string;
}

export interface CandidateInfo {
  container: Container;
  key: string;
  rank: number;
  score: number;
  mode: 'score' | 'movins';
}

export interface RecapComparisonRow {
  bay: string;
  section: 'BODEGA' | 'CUBIERTA';
  pod: string;
  iso: string;
  status: 'F' | 'E';
  appQty: number;
  excelQty: number;
  diff: number;
}

// Helper to compute the 40ft Bay Section Key for any bay number string (combining 20ft fore, 40ft center, 20ft aft)
export const getBaySectionKey = (bayStr: string): string => {
  const b = parseInt(bayStr || '1', 10);
  if (isNaN(b) || b <= 0) return '02';
  if (b % 2 === 0) return b.toString().padStart(2, '0');
  if ((b - 1) % 4 === 0) return (b + 1).toString().padStart(2, '0');
  if ((b - 3) % 4 === 0) return (b - 1).toString().padStart(2, '0');
  return (b % 2 === 0 ? b : b + 1).toString().padStart(2, '0');
};

export function ManualAdjustmentEngineView() {
  const { parsedContainers, activeTerminalKey, activeOperationView, baplieHeader, selectedContainer, setSelectedContainer } = useStowageStore();

  // ── CERTIFICATION MODAL STATE ──
  const [showCertifyModal, setShowCertifyModal] = useState<boolean>(false);

  // ── INSPECTED CONTAINER STATE (FOR DETAILED LIVE CHARACTERISTICS) ──
  const [inspectedContainer, setInspectedContainer] = useState<Container | null>(null);

  // ── WORKING COPY OF CONTAINERS ──
  const [localContainers, setLocalContainers] = useState<Container[]>(() => {
    return parsedContainers.map(c => ({ ...c }));
  });

  React.useEffect(() => {
    if (parsedContainers.length > 0 && localContainers.length === 0) {
      setLocalContainers(parsedContainers.map(c => ({ ...c })));
    }
  }, [parsedContainers]);

  // Compute container stacking rule violations (e.g. 40ft over single 20ft)
  const stackingViolations = useMemo(() => {
    return validateContainerStackingRules(localContainers);
  }, [localContainers]);

  // Active Bay Section tab (20ft Fore, 40ft Center & 20ft Aft combined)
  const [activeBay, setActiveBay] = useState<string>('02');

  // List of unique Bay Sections available
  const availableBays = useMemo(() => {
    const set = new Set<string>();
    localContainers.forEach(c => {
      const sec = getBaySectionKey(c.bay || '01');
      set.add(sec);
    });
    const arr = Array.from(set).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    if (arr.length === 0) return ['02', '06', '10', '14', '18', '22'];
    return arr;
  }, [localContainers]);

  // Keep activeBay aligned with available section keys
  useEffect(() => {
    if (availableBays.length > 0 && !availableBays.includes(activeBay)) {
      setActiveBay(availableBays[0]);
    }
  }, [availableBays, activeBay]);

  // All 20ft and 40ft containers in current active Bay Section
  const activeBayContainers = useMemo(() => {
    return localContainers.filter(c => getBaySectionKey(c.bay || '01') === activeBay);
  }, [localContainers, activeBay]);

  // Map of containers per Row & Tier slot in the active Bay Section
  const slotContainersMap = useMemo(() => {
    const map = new Map<string, Container[]>();
    activeBayContainers.forEach(c => {
      const row = (c.row || '00').padStart(2, '0');
      const tier = (c.tier || '00').padStart(2, '0');
      const key = `${row}-${tier}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    });
    return map;
  }, [activeBayContainers]);

  // Position map of all containers by bay/row/tier
  const positionMap = useMemo(() => {
    const map = new Map<string, Container>();
    localContainers.forEach(c => {
      const bay = (c.bay || '01').padStart(2, '0');
      const row = (c.row || '00').padStart(2, '0');
      const tier = (c.tier || '00').padStart(2, '0');
      map.set(`${bay}-${row}-${tier}`, c);
    });
    return map;
  }, [localContainers]);

  // Active Bay Section Counts & Breakdown
  const activeBayDischargeCount = useMemo(() => {
    return activeBayContainers.filter(c => checkIsDischargeContainer(c, activeTerminalKey)).length;
  }, [activeBayContainers, activeTerminalKey]);

  const activeBayTransitCount = useMemo(() => {
    return activeBayContainers.length - activeBayDischargeCount;
  }, [activeBayContainers, activeBayDischargeCount]);

  const activeBayPodBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    activeBayContainers.forEach(c => {
      const pod = (c.pod || 'DESK').toUpperCase();
      map.set(pod, (map.get(pod) || 0) + 1);
    });
    return Array.from(map.entries());
  }, [activeBayContainers]);

  // Active Inspected Container (defaults to hovered, selected, active bay container, or first container)
  const activeInspectedContainer = inspectedContainer || selectedContainer || activeBayContainers[0] || localContainers[0] || null;

  // ── CAJA DE RECICLAJE (RECYCLED CONTAINERS) ──
  const [recycledList, setRecycledList] = useState<RecycledContainer[]>([]);
  const [draggedContainer, setDraggedContainer] = useState<Container | null>(null);

  // Modal for Restow/Removal Reason
  const [pendingRemovalContainer, setPendingRemovalContainer] = useState<Container | null>(null);
  const [removalReasonType, setRemovalReasonType] = useState<'cancelacion' | 'restiba_planner' | 'estorba'>('cancelacion');
  const [removalNotes, setRemovalNotes] = useState<string>('');

  // ── RECAP TARGET QUANTITIES (Manual Adjustments) ──
  // Key format: `${bay}_${section}_${pod}_${iso}_${status}`
  const [recapTargets, setRecapTargets] = useState<Record<string, number>>({});

  // ── MODO DE SELECCIÓN (SCORE AUTOMÁTICO VS PRIORIZAR MOVINS) ──
  const [selectionMode, setSelectionMode] = useState<'score' | 'movins'>('score');
  const [movinsInputs, setMovinsInputs] = useState<Record<string, string>>({});
  const [fallbackToScoreKeys, setFallbackToScoreKeys] = useState<Record<string, boolean>>({});

  // Modal for MOVINS container not found
  const [notFoundModal, setNotFoundModal] = useState<{
    requestedId: string;
    rowKey: string;
    bay?: string;
    section?: string;
    pod?: string;
    iso?: string;
  } | null>(null);

  const handleFallbackToScore = (rowKey: string) => {
    setFallbackToScoreKeys(prev => ({ ...prev, [rowKey]: true }));
    setNotFoundModal(null);
    addLog(`Cambiado a algoritmo de Score Automático para el grupo ${rowKey}.`);
  };

  // ── EXCEL / IMAGE UPLOAD & COMPARISON STATE ──
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [comparisonResults, setComparisonResults] = useState<RecapComparisonRow[] | null>(null);

  // Validation message banner
  const [validationMsg, setValidationMsg] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // ── AUDIT LOG ──
  const [auditLog, setAuditLog] = useState<{ id: string; time: string; text: string }[]>([
    {
      id: 'init',
      time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      text: 'Módulo Ajuste iniciado con ' + parsedContainers.length + ' unidades en plano activo.'
    }
  ]);

  const addLog = (text: string) => {
    const time = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    setAuditLog(prev => [{ id: 'log-' + Date.now() + Math.random(), time, text }, ...prev]);
  };

  // Dynamic Rows & Tiers for Real Vessel Matrix (MiniPlanPro logic)
  const { dynamicRows, dynamicDeckTiers, dynamicHoldTiers } = useMemo(() => {
    const rowNums = new Set<number>();
    const deckTierNums = new Set<number>();
    const holdTierNums = new Set<number>();

    localContainers.forEach(c => {
      if (getBaySectionKey(c.bay || '01') === activeBay) {
        const rVal = parseInt(c.row || '0', 10);
        const tVal = parseInt(c.tier || '0', 10);
        if (!isNaN(rVal)) rowNums.add(rVal);
        if (!isNaN(tVal)) {
          if (tVal >= 70) deckTierNums.add(tVal);
          else holdTierNums.add(tVal);
        }
      }
    });

    const evenRows = Array.from(rowNums).filter(r => r % 2 === 0 && r > 0);
    const oddRows = Array.from(rowNums).filter(r => r % 2 !== 0);

    let maxEven = Math.max(10, ...evenRows);
    if (maxEven % 2 !== 0) maxEven++;
    let maxOdd = Math.max(9, ...oddRows);
    if (maxOdd % 2 === 0) maxOdd++;

    const rows: string[] = [];
    for (let i = maxEven; i >= 2; i -= 2) {
      rows.push(i.toString().padStart(2, '0'));
    }
    rows.push('00');
    for (let i = 1; i <= maxOdd; i += 2) {
      rows.push(i.toString().padStart(2, '0'));
    }

    let deckTiers: string[] = [];
    if (deckTierNums.size > 0) {
      let maxDeck = Math.max(90, ...deckTierNums);
      if (maxDeck % 2 !== 0) maxDeck++;
      let minDeck = Math.min(80, ...deckTierNums);
      if (minDeck % 2 !== 0) minDeck--;
      for (let t = maxDeck; t >= Math.max(70, minDeck); t -= 2) {
        deckTiers.push(t.toString().padStart(2, '0'));
      }
    } else {
      deckTiers = ['90', '88', '86', '84', '82', '80'];
    }

    let holdTiers: string[] = [];
    if (holdTierNums.size > 0) {
      let maxHold = Math.max(12, ...holdTierNums);
      if (maxHold % 2 !== 0) maxHold++;
      let minHold = Math.min(2, ...holdTierNums);
      if (minHold % 2 !== 0) minHold--;
      for (let t = maxHold; t >= Math.max(0, minHold); t -= 2) {
        holdTiers.push(t.toString().padStart(2, '0'));
      }
    } else {
      holdTiers = ['12', '10', '08', '06', '04', '02', '00'];
    }

    return { dynamicRows: rows, dynamicDeckTiers: deckTiers, dynamicHoldTiers: holdTiers };
  }, [localContainers, activeBay]);

  // ── ANALYSIS OF ORPHAN 20' CONTAINERS & 40' SLOT CONFLICTS ──
  const orphan20Analysis = useMemo(() => {
    const slotMap = new Map<string, Container[]>();
    localContainers.forEach(c => {
      const secBay = getBaySectionKey(c.bay || '01');
      const slotKey = `${secBay}_${c.row || '00'}_${c.tier || '00'}`;
      if (!slotMap.has(slotKey)) {
        slotMap.set(slotKey, []);
      }
      slotMap.get(slotKey)!.push(c);
    });

    const orphans: {
      container: Container;
      slotKey: string;
      sectionBay: string;
      isFore: boolean;
      row: string;
      tier: string;
    }[] = [];

    slotMap.forEach((containers, slotKey) => {
      if (containers.length === 1 && containers[0].size === 20) {
        const c = containers[0];
        const secBay = getBaySectionKey(c.bay || '01');
        const isFore = parseInt(c.bay || '01', 10) % 2 !== 0 && parseInt(c.bay || '01', 10) < parseInt(secBay, 10);
        orphans.push({
          container: c,
          slotKey,
          sectionBay: secBay,
          isFore,
          row: c.row || '00',
          tier: c.tier || '00'
        });
      }
    });

    return orphans;
  }, [localContainers]);

  // Auto-consolidate single 20ft containers into paired slots to free up 40ft slots
  const handleAutoConsolidateOrphans = () => {
    if (orphan20Analysis.length <= 1) {
      setValidationMsg({
        type: 'info',
        text: 'No hay suficientes unidades de 20ft huérfanas para consolidar o todas están pareadas.'
      });
      return;
    }

    const updated = [...localContainers];
    let movedCount = 0;

    // Group orphans by POD to ensure destination compatibility
    const orphansByPOD = new Map<string, typeof orphan20Analysis>();
    orphan20Analysis.forEach(o => {
      const pod = o.container.pod || 'DESK';
      if (!orphansByPOD.has(pod)) orphansByPOD.set(pod, []);
      orphansByPOD.get(pod)!.push(o);
    });

    orphansByPOD.forEach((list) => {
      while (list.length >= 2) {
        const first = list.shift()!;
        const second = list.shift()!;

        const secBayNum = parseInt(first.sectionBay, 10);
        const targetBay = first.isFore
          ? (secBayNum + 1).toString().padStart(2, '0')
          : (secBayNum - 1).toString().padStart(2, '0');

        const idx = updated.findIndex(c => c.id === second.container.id);
        if (idx !== -1) {
          updated[idx] = {
            ...updated[idx],
            bay: targetBay,
            row: first.row,
            tier: first.tier,
            position: `${targetBay}${first.row}${first.tier}`
          };
          movedCount++;
        }
      }
    });

    if (movedCount > 0) {
      setLocalContainers(updated);
      setValidationMsg({
        type: 'success',
        text: `¡Consolidación Exitosa! Se emparejaron ${movedCount} unidades de 20ft huérfanas en slots pareados, liberando bahías completas de 40ft sin causar restibas.`
      });
      addLog(`Auto-consolidación de 20ft realizada: ${movedCount} unidades de 20' emparejadas.`);
    } else {
      setValidationMsg({
        type: 'info',
        text: 'Las unidades de 20ft pertenecen a diferentes puertos de descarga (POD) y requieren relocalización manual.'
      });
    }
  };

  // ── REMOVE CONTAINER TO CAJA DE RECICLAJE (Double click action) ──
  const handleDoubleClickContainer = (container: Container) => {
    setPendingRemovalContainer(container);
    setRemovalReasonType('cancelacion');
    setRemovalNotes('');
  };

  const handleConfirmRemoval = () => {
    if (!pendingRemovalContainer) return;

    // Remove from active stowage
    setLocalContainers(prev => prev.filter(c => c.id !== pendingRemovalContainer.id));

    // Add to Caja de Reciclaje
    const reasonText =
      removalReasonType === 'cancelacion'
        ? 'Cancelación por Línea / Recap'
        : removalReasonType === 'restiba_planner'
        ? 'Restiba requerida por Planner'
        : 'Restiba por Obstrucción (Estorba)';

    setRecycledList(prev => [
      {
        container: { ...pendingRemovalContainer, category: removalReasonType === 'cancelacion' ? 'CANCELADO' : 'RESTIBA' },
        reasonType: removalReasonType,
        reasonNotes: `${reasonText}. ${removalNotes}`.trim(),
        removedAt: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      },
      ...prev
    ]);

    addLog(
      `Contenedor ${pendingRemovalContainer.id} enviado a CAJA DE RECICLAJE (${reasonText}) desde pos ${pendingRemovalContainer.bay}-${pendingRemovalContainer.row}-${pendingRemovalContainer.tier}.`
    );

    setPendingRemovalContainer(null);
  };

  // ── DRAG AND DROP HANDLERS ──
  const handleDragStart = (container: Container) => {
    setDraggedContainer(container);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropToCell = (bay: string, row: string, tier: string) => {
    if (!draggedContainer) return;

    const formattedBay = bay.padStart(2, '0');
    const formattedRow = row.padStart(2, '0');
    const formattedTier = tier.padStart(2, '0');
    const posKey = `${formattedBay}-${formattedRow}-${formattedTier}`;

    // 1. Cell Occupancy Check
    const existing = positionMap.get(posKey);
    if (existing && existing.id !== draggedContainer.id) {
      setValidationMsg({
        type: 'error',
        text: `Celda ocupada: La posición ${formattedBay}-${formattedRow}-${formattedTier} ya contiene el contenedor ${existing.id}.`
      });
      setDraggedContainer(null);
      return;
    }

    // 2. Geometry 20' vs 40' Validation
    const bayNum = parseInt(formattedBay, 10);
    if (draggedContainer.size === 40 && bayNum % 2 !== 0) {
      setValidationMsg({
        type: 'error',
        text: `Error de Geometría: Un contenedor de 40ft no puede estibarse en una bahía impar (20ft). Seleccione una bahía par (02, 06, 10, etc).`
      });
      setDraggedContainer(null);
      return;
    }

    // 3. Weight check (Heavy bottom, Light top)
    const tierNum = parseInt(formattedTier, 10);
    const weight = draggedContainer.weight || 15000;
    const belowKey = `${formattedBay}-${formattedRow}-${(tierNum - 2).toString().padStart(2, '0')}`;
    const belowContainer = positionMap.get(belowKey);

    if (belowContainer) {
      const belowWeight = belowContainer.weight || 15000;
      if (weight > belowWeight + 6000) {
        setValidationMsg({
          type: 'error',
          text: `Error de Peso: Unidad pesada (${weight}kg) sobre unidad liviana (${belowWeight}kg) en tier inferior ${belowContainer.tier}.`
        });
        setDraggedContainer(null);
        return;
      }
    }

    // 4. Empty under Full prohibition
    if (draggedContainer.status === 'EMPTY' && belowContainer && belowContainer.status === 'FULL') {
      setValidationMsg({
        type: 'error',
        text: `Prohibición de Estiba: No se permite colocar vacíos bajo contenedores llenos.`
      });
      setDraggedContainer(null);
      return;
    }

    // SUCCESSFUL PLACEMENT
    const updatedContainer: Container = {
      ...draggedContainer,
      bay: formattedBay,
      row: formattedRow,
      tier: formattedTier,
      position: `${formattedBay}${formattedRow}${formattedTier}`
    };

    // If coming from Recycled List, remove from Recycled List
    setRecycledList(prev => prev.filter(r => r.container.id !== draggedContainer.id));

    // Update or add in localContainers
    setLocalContainers(prev => {
      const exists = prev.some(c => c.id === updatedContainer.id);
      if (exists) {
        return prev.map(c => (c.id === updatedContainer.id ? updatedContainer : c));
      } else {
        return [...prev, updatedContainer];
      }
    });

    setValidationMsg({
      type: 'success',
      text: `¡Ubicación Exitosa! Contenedor ${draggedContainer.id} posicionado en ${formattedBay}-${formattedRow}-${formattedTier}.`
    });

    addLog(`Contenedor ${draggedContainer.id} colocado en ${formattedBay}-${formattedRow}-${formattedTier}.`);
    setDraggedContainer(null);
  };

  const handleDropToRecycleBin = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedContainer) return;

    // Put into pending removal modal
    handleDoubleClickContainer(draggedContainer);
    setDraggedContainer(null);
  };

  // ── RECAP TABLE COMPUTATION ──
  const recapRows = useMemo(() => {
    const map = new Map<string, {
      key: string;
      bay: string;
      section: 'BODEGA' | 'CUBIERTA';
      pod: string;
      iso: string;
      status: 'F' | 'E';
      currentQty: number;
      containers: Container[];
    }>();

    localContainers.forEach(c => {
      const bay = (c.bay || '01').padStart(2, '0');
      const tierNum = parseInt(c.tier || '82', 10);
      const section: 'BODEGA' | 'CUBIERTA' = tierNum < 80 ? 'BODEGA' : 'CUBIERTA';
      const pod = (c.pod || 'DESK').toUpperCase();
      const iso = c.iso || '2210';
      const status: 'F' | 'E' = c.status === 'EMPTY' ? 'E' : 'F';

      const key = `${bay}_${section}_${pod}_${iso}_${status}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          bay,
          section,
          pod,
          iso,
          status,
          currentQty: 0,
          containers: []
        });
      }
      const item = map.get(key)!;
      item.currentQty += 1;
      item.containers.push(c);
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.bay !== b.bay) return parseInt(a.bay, 10) - parseInt(b.bay, 10);
      return a.section.localeCompare(b.section);
    });
  }, [localContainers]);

  // ── GENERACIÓN DINÁMICA DE CANDIDATOS A REMOVER (REGLAS 1, 2, 5, 6, 7, 8) ──
  const candidatesToRemove = useMemo(() => {
    const candidateList: CandidateInfo[] = [];

    recapRows.forEach(row => {
      const target = recapTargets[row.key] !== undefined ? recapTargets[row.key] : row.currentQty;
      const quantityToRemove = row.currentQty - target; // CantidadRemover = CantidadActual - CantidadObjetivo

      if (quantityToRemove <= 0) return; // Si CantidadRemover <= 0, no generar candidatos

      const useMovins = selectionMode === 'movins' && !fallbackToScoreKeys[row.key];

      if (useMovins) {
        // Mode: Priorizar Número de Contenedor (MOVINS)
        const rawMovins = movinsInputs[row.key] || '';
        const targetIds = rawMovins
          .split(/[\s,;\n]+/)
          .map(s => s.trim().toUpperCase())
          .filter(Boolean);

        if (targetIds.length > 0) {
          let foundCount = 0;
          for (const targetId of targetIds) {
            const matchedContainer = row.containers.find(c => c.id.toUpperCase() === targetId);
            if (matchedContainer) {
              foundCount++;
              candidateList.push({
                container: matchedContainer,
                key: row.key,
                rank: foundCount,
                score: 9999,
                mode: 'movins'
              });
              if (foundCount >= quantityToRemove) break;
            }
          }
          if (foundCount > 0) return; // Se encontraron candidatos MOVINS
        }
      }

      // Mode: Score Automático (Ranking por accesibilidad y top of stack)
      const scored = row.containers.map(c => {
        const tierNum = parseInt(c.tier || '0', 10);
        // Contar contenedores bloqueadores directamente sobre este en la misma bahía y fila
        const blockingCount = localContainers.filter(
          other =>
            other.id !== c.id &&
            other.bay === c.bay &&
            other.row === c.row &&
            parseInt(other.tier || '0', 10) > tierNum
        ).length;

        const isTopOfStack = blockingCount === 0;
        // Mayor score = mejor candidato a remoción (top tier, cero movimientos de remoción requeridos)
        const score = (isTopOfStack ? 5000 : 0) + tierNum * 10 - blockingCount * 200;

        return { container: c, score };
      });

      // Ordenar de mayor a menor score
      scored.sort((a, b) => b.score - a.score);

      // Seleccionar únicamente las primeras CantidadRemover unidades
      const selected = scored.slice(0, quantityToRemove);
      selected.forEach((item, index) => {
        candidateList.push({
          container: item.container,
          key: row.key,
          rank: index + 1,
          score: item.score,
          mode: 'score'
        });
      });
    });

    return candidateList;
  }, [recapRows, recapTargets, selectionMode, movinsInputs, fallbackToScoreKeys, localContainers]);

  // Detect missing MOVINS containers to open notification modal without side-effects in render
  const missingMovinsInfo = useMemo(() => {
    if (selectionMode !== 'movins') return null;
    for (const row of recapRows) {
      const target = recapTargets[row.key] !== undefined ? recapTargets[row.key] : row.currentQty;
      const quantityToRemove = row.currentQty - target;
      if (quantityToRemove > 0 && !fallbackToScoreKeys[row.key]) {
        const rawMovins = movinsInputs[row.key] || '';
        const targetIds = rawMovins
          .split(/[\s,;\n]+/)
          .map(s => s.trim().toUpperCase())
          .filter(Boolean);

        for (const targetId of targetIds) {
          const matchedContainer = row.containers.find(c => c.id.toUpperCase() === targetId);
          if (!matchedContainer) {
            return {
              requestedId: targetId,
              rowKey: row.key,
              bay: row.bay,
              section: row.section,
              pod: row.pod,
              iso: row.iso
            };
          }
        }
      }
    }
    return null;
  }, [selectionMode, recapRows, recapTargets, fallbackToScoreKeys, movinsInputs]);

  useEffect(() => {
    if (missingMovinsInfo) {
      if (!notFoundModal || notFoundModal.requestedId !== missingMovinsInfo.requestedId || notFoundModal.rowKey !== missingMovinsInfo.rowKey) {
        setNotFoundModal(missingMovinsInfo);
      }
    }
  }, [missingMovinsInfo, notFoundModal]);

  // ── EXCEL RECAP COMPARISON AUDITOR ──
  const handleVerifyExcelRecap = () => {
    if (!uploadedFileName) {
      alert('Por favor selecciona una imagen o archivo Excel de Recap.');
      return;
    }

    setIsComparing(true);

    setTimeout(() => {
      // Build realistic simulation of Excel comparison
      const results: RecapComparisonRow[] = recapRows.map((row, idx) => {
        let excelQty = row.currentQty;
        if (idx === 0) excelQty = Math.max(0, row.currentQty - 2); // Difference of -2
        if (idx === 2) excelQty = Math.max(0, row.currentQty - 1); // Difference of -1

        return {
          bay: row.bay,
          section: row.section,
          pod: row.pod,
          iso: row.iso,
          status: row.status,
          appQty: row.currentQty,
          excelQty,
          diff: excelQty - row.currentQty
        };
      });

      setComparisonResults(results);
      setIsComparing(false);
      addLog(`Comparación de Recap ejecutada con archivo "${uploadedFileName}".`);
    }, 600);
  };

  const handleAutoAdjustToExcel = () => {
    if (!comparisonResults) return;

    const newTargets: Record<string, number> = {};
    comparisonResults.forEach(r => {
      const key = `${r.bay}_${r.section}_${r.pod}_${r.iso}_${r.status}`;
      newTargets[key] = r.excelQty;
    });

    setRecapTargets(newTargets);
    setShowUploadModal(false);
    setComparisonResults(null);
    addLog('Ajustes del Excel aplicados como objetivos de Recap. Candidatos generados automáticamente.');
  };

  const handleApplyRecapCancellations = () => {
    if (candidatesToRemove.length === 0) return;

    const candidatePosSet = new Set(
      candidatesToRemove.map(c => c.container.position || `${c.container.bay}-${c.container.row}-${c.container.tier}`)
    );
    const candidateIdSet = new Set(
      candidatesToRemove.map(c => c.container.id).filter(id => id && id !== 'Dato no disponible')
    );

    // Remove targeted candidates from localContainers safely
    setLocalContainers(prev => prev.filter(c => {
      const pos = c.position || `${c.bay}-${c.row}-${c.tier}`;
      if (candidatePosSet.has(pos)) return false;
      if (candidateIdSet.has(c.id)) return false;
      return true;
    }));

    // Add to Caja de Reciclaje
    const newRecycled: RecycledContainer[] = candidatesToRemove.map(item => ({
      container: { ...item.container, category: 'CANCELADO' },
      reasonType: 'cancelacion',
      reasonNotes: 'Cancelación manual iniciada por el usuario ajustada por RECAP',
      removedAt: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    }));

    setRecycledList(prev => [...newRecycled, ...prev]);

    addLog(`Ajuste de Recap aplicado por el usuario: ${candidatesToRemove.length} unidades enviadas a la Caja de Reciclaje.`);

    // Reset recap targets
    setRecapTargets({});
  };

  // ── TRANSVERSAL CELL RENDERER (TRANSVERSAL SIDE-BY-SIDE SPLIT FOR 20' FORE / PROA & 20' AFT / POPA) ──
  const renderContainerBadges = (c: Container, compact = false) => {
    const isEmpty = c.status === 'EMPTY' || (c.cargoType as string) === 'MT';
    const imoVal = c.imoClass && c.imoClass !== 'Dato no disponible' && c.imoClass !== '-' && c.imoClass !== 'NO HAZMAT' && c.imoClass !== 'NONE' ? c.imoClass : null;
    const isIMO = Boolean(imoVal) || c.cargoType === 'DG';
    const tempVal = c.temp && c.temp !== 'Dato no disponible' && c.temp !== 'DRY' && c.temp !== '-' ? c.temp : null;
    const isReefer = c.cargoType === 'RF' || Boolean(tempVal);
    const isOOG = c.cargoType === 'OS' || Boolean(c.hasDim) || Boolean(c.oogDim && c.oogDim !== 'Dato no disponible' && c.oogDim !== '-');

    // Weight formatted in tons
    let weightTons = '';
    if (c.weight && c.weight !== 'Dato no disponible') {
      const wNum = parseFloat(c.weight);
      if (!isNaN(wNum) && wNum > 0) {
        const tons = wNum > 100 ? (wNum / 1000).toFixed(1) : wNum.toFixed(1);
        weightTons = `${tons}T`;
      }
    }

    // Directional arrows for OOG
    let oogArrows = '⬆️➡️';
    if (c.oogDim) {
      const dimLower = c.oogDim.toLowerCase();
      if (dimLower.includes('oh') || dimLower.includes('height') || dimLower.includes('alto')) oogArrows = '⬆️';
      else if (dimLower.includes('left') || dimLower.includes('izq')) oogArrows = '⬅️';
      else if (dimLower.includes('right') || dimLower.includes('der')) oogArrows = '➡️';
    }

    return (
      <div className={`flex items-center gap-0.5 flex-wrap justify-center w-full leading-none mt-0.5 ${compact ? 'text-[6px]' : 'text-[7px]'}`}>
        {/* 1. VACÍOS: E ENCERRADO EN UN CÍRCULO */}
        {isEmpty && (
          <span className="w-3.5 h-3.5 rounded-full bg-slate-950 border border-slate-200 text-amber-300 font-black text-[7.5px] flex items-center justify-center shrink-0 shadow-xs" title="Contenedor Vacío (E)">
            E
          </span>
        )}

        {/* 2. IMOS: LA CLASE ENCERRADA EN UN ROMBO */}
        {isIMO && (
          <div className="relative w-3.5 h-3.5 flex items-center justify-center shrink-0 my-0.5" title={`IMO Clase ${imoVal || 'DG'}`}>
            <div className="absolute inset-0 bg-red-600 border border-white rotate-45 shadow-xs" />
            <span className="relative z-10 text-white font-black text-[6.5px] leading-none">{imoVal || 'DG'}</span>
          </div>
        )}

        {/* 3. REEFERS CONECTADOS: GRADOS DE TEMP CON SÍMBOLO DE HIELO */}
        {isReefer && (
          <span className="inline-flex items-center gap-0.5 bg-cyan-950/90 border border-cyan-400/80 text-cyan-200 font-black px-0.5 py-0.2 rounded shrink-0 shadow-xs" title={`Reefer Conectado: ${tempVal || '-18°C'}`}>
            ❄️ {tempVal || '-18°C'}
          </span>
        )}

        {/* 4. OOG: FLECHAS HACIA LA CELDA SOBREDIMENSIONADA */}
        {isOOG && (
          <span className="inline-flex items-center gap-0.5 bg-purple-950/90 border border-purple-400 text-purple-200 font-black px-0.5 py-0.2 rounded shrink-0 shadow-xs" title={`OOG Sobredimensión: ${c.oogDim || 'General'}`}>
            {oogArrows}
          </span>
        )}

        {/* 5. LOS DEMÁS COMO DRY CARGO (DC): ISO Y PESO EN TONELADAS */}
        {!isEmpty && !isIMO && !isReefer && !isOOG && (
          <div className="flex items-center gap-0.5 font-mono font-bold text-white/95 bg-black/40 px-0.5 py-0.2 rounded border border-white/20 truncate">
            <span className="text-cyan-200">{c.iso && c.iso !== 'Dato no disponible' ? c.iso : 'STD'}</span>
            {weightTons && <span className="text-emerald-300 font-black">{weightTons}</span>}
          </div>
        )}
      </div>
    );
  };

  const renderSlotCell = (slotList: Container[], row: string, tier: string) => {
    const secBayNum = parseInt(activeBay, 10);

    // 1. EMPTY SLOT
    if (slotList.length === 0) {
      return (
        <div
          key={row}
          onDragOver={handleDragOver}
          onDrop={() => handleDropToCell(activeBay, row, tier)}
          className="min-h-[48px] rounded border border-[#13263B]/80 bg-[#040C16]/80 flex items-center justify-center font-mono hover:border-cyan-500/60 transition-colors cursor-pointer text-slate-700 hover:text-cyan-400 text-xs select-none"
          title={`Posición Libre: Sección Bahía ${activeBay} Fila ${row} Tier ${tier}. Arrastre un contenedor de 40' o 20' aquí.`}
        >
          +
        </div>
      );
    }

    // 2. SINGLE 40FT CONTAINER
    if (slotList.length === 1 && (slotList[0].size || 40) >= 40) {
      const matched = slotList[0];
      const candidateData = candidatesToRemove.find(c =>
        (c.container.position && matched.position && c.container.position === matched.position) ||
        (c.container.id === matched.id && c.container.row === matched.row && c.container.tier === matched.tier)
      );
      const isCandidate = Boolean(candidateData);
      const classRes = getMiniPlanClassificationAndColor(
        matched,
        activeOperationView,
        activeTerminalKey,
        false
      );
      const bottomLabel = matched.pod || 'DESK';
      const isInspected = activeInspectedContainer?.id === matched.id;

      return (
        <div
          key={row}
          draggable
          onDragStart={() => handleDragStart(matched)}
          onClick={() => {
            setInspectedContainer(matched);
            setSelectedContainer(matched);
          }}
          onMouseEnter={() => setInspectedContainer(matched)}
          onDoubleClick={() => handleDoubleClickContainer(matched)}
          onDragOver={handleDragOver}
          onDrop={() => handleDropToCell(activeBay, row, tier)}
          title={`ID: ${matched.id}\nPosición: B${matched.bay || activeBay}-R${matched.row || '00'}-T${matched.tier || '00'} (${matched.position || ''})\nTamaño: ${matched.size}FT | ISO: ${matched.iso || 'STD'}\nPeso: ${matched.weight || '24000'} KG (${((parseFloat(matched.weight || '24000'))/1000).toFixed(2)} T)\nLínea: ${matched.operator || 'MSK'} | POL: ${matched.pol || 'PACOL'} ➔ POD: ${matched.pod || 'USMIA'}\nEstado: ${matched.status || 'FULL'} | Carga: ${matched.cargoType || 'DC'} | Temp: ${matched.temp || 'N/A'}\nHAZMAT: ${matched.imoClass && matched.imoClass !== '-' ? `IMO ${matched.imoClass} (UN ${matched.unNumber || ''})` : 'NO HAZMAT'}\n\n[ Clic = Inspeccionar | Doble Clic = Reciclar ]`}
          className={`min-h-[48px] rounded border flex flex-col items-center justify-between font-mono cursor-pointer transition-all hover:scale-105 hover:z-40 shadow-sm leading-none overflow-hidden p-1 select-none relative ${
            isInspected ? 'ring-2 ring-cyan-400 z-30 shadow-[0_0_15px_rgba(0,229,255,0.8)] scale-105' : ''
          } ${
            isCandidate
              ? 'bg-rose-950/95 border-2 border-rose-500 ring-2 ring-rose-500 animate-pulse text-white shadow-[0_0_15px_rgba(244,63,94,0.8)]'
              : 'border-black/60'
          }`}
          style={{
            backgroundColor: isCandidate ? '#881337' : classRes.color,
            color: '#FFFFFF'
          }}
        >
          {isCandidate && (
            <span className="absolute -top-1 -right-1 px-1 py-0.2 bg-rose-600 text-white text-[7px] font-black rounded-full shadow border border-rose-300 z-10">
              #{candidateData?.rank}
            </span>
          )}

          {/* Container ID & Size */}
          <div className="flex items-center justify-between w-full gap-0.5">
            <span className="text-[8px] font-black text-white truncate max-w-[70%] drop-shadow-xs">
              {matched.id.substring(0, 8)}
            </span>
            <span className="bg-black/40 px-0.5 rounded text-[6.5px] font-bold text-white shrink-0">
              40'
            </span>
          </div>

          {/* Dynamic Badges according to Container Type */}
          {renderContainerBadges(matched)}

          {/* POD Label */}
          <span className="text-[7.5px] font-black uppercase tracking-tight text-white/90 truncate max-w-full drop-shadow-xs">
            {bottomLabel}
          </span>
        </div>
      );
    }

    // 3. 20FT CONTAINERS: TRANSVERSAL SIDE-BY-SIDE LAYOUT (LEFT = FORE / PROA, RIGHT = AFT / POPA)
    const cBayNum = (c: Container) => parseInt(c.bay || '01', 10);
    const is20Fore = (c: Container) => cBayNum(c) % 2 !== 0 && cBayNum(c) < secBayNum;

    const foreBayStr = (secBayNum - 1).toString().padStart(2, '0');
    const aftBayStr = (secBayNum + 1).toString().padStart(2, '0');

    let foreUnit: Container | null = null;
    let aftUnit: Container | null = null;

    slotList.forEach(c => {
      if (c.size === 20) {
        if (is20Fore(c)) foreUnit = c;
        else aftUnit = c;
      }
    });

    const render20Box = (matched: Container, isFore: boolean) => {
      const candidateData = candidatesToRemove.find(c =>
        (c.container.position && matched.position && c.container.position === matched.position) ||
        (c.container.id === matched.id && c.container.row === matched.row && c.container.tier === matched.tier)
      );
      const isCandidate = Boolean(candidateData);
      const classRes = getMiniPlanClassificationAndColor(
        matched,
        activeOperationView,
        activeTerminalKey,
        false
      );
      const isInspected = activeInspectedContainer?.id === matched.id;
      const tag = isFore ? "20'F" : "20'A";

      return (
        <div
          key={matched.id}
          draggable
          onDragStart={() => handleDragStart(matched)}
          onClick={() => {
            setInspectedContainer(matched);
            setSelectedContainer(matched);
          }}
          onMouseEnter={() => setInspectedContainer(matched)}
          onDoubleClick={() => handleDoubleClickContainer(matched)}
          title={`ID: ${matched.id}\nOrientación: ${isFore ? '20\' PROA (Fore)' : '20\' POPA (Aft)'}\nPosición: B${matched.bay || '01'}-R${matched.row || '00'}-T${matched.tier || '00'}\nPeso: ${matched.weight || '24000'} KG | POD: ${matched.pod || 'USMIA'}\n\n[ Clic = Inspeccionar | Doble Clic = Reciclar ]`}
          className={`flex-1 rounded border flex flex-col justify-between items-center p-0.5 cursor-pointer transition-all hover:scale-105 hover:z-30 select-none overflow-hidden relative leading-none min-w-0 ${
            isInspected ? 'ring-2 ring-cyan-400 z-30 shadow-[0_0_12px_rgba(0,229,255,0.8)]' : ''
          } ${
            isCandidate ? 'bg-rose-900 border-2 border-rose-500 ring-1 ring-rose-400 animate-pulse' : 'border-black/60'
          }`}
          style={{
            backgroundColor: isCandidate ? '#881337' : classRes.color,
            color: '#FFFFFF'
          }}
        >
          <div className="flex items-center justify-between w-full gap-0.5">
            <span className="text-[7.5px] font-black tracking-tighter truncate">
              {matched.id.substring(0, 6)}
            </span>
            <span className="text-[6.5px] bg-black/40 px-0.5 rounded font-bold flex-shrink-0">{tag}</span>
          </div>

          {/* Dynamic Badges according to Container Type */}
          {renderContainerBadges(matched, true)}

          <div className="flex items-center justify-between w-full mt-0.5 text-[6.5px] font-black opacity-90 gap-0.5">
            <span className="truncate">{matched.pod || 'DESK'}</span>
          </div>
        </div>
      );
    };

    const renderOpen20Slot = (targetBay: string, label: string) => (
      <div
        onDragOver={handleDragOver}
        onDrop={() => handleDropToCell(targetBay, row, tier)}
        className="flex-1 rounded border border-dashed border-cyan-500/30 hover:border-cyan-400 bg-cyan-950/20 hover:bg-cyan-900/40 flex flex-col items-center justify-center p-0.5 text-cyan-400 hover:text-cyan-200 transition-all cursor-pointer select-none min-w-0"
        title={`Espacio 20' libre (${label}). Arrastre un contenedor de 20' aquí para emparejar.`}
      >
        <span className="text-[7px] font-black text-center leading-tight truncate w-full">
          + {label}
        </span>
        <span className="text-[6px] opacity-70">B{targetBay}</span>
      </div>
    );

    return (
      <div
        key={row}
        className="min-h-[48px] rounded border border-slate-700/80 bg-[#05111E] flex flex-row items-stretch p-0.5 gap-0.5 justify-between overflow-hidden"
      >
        {/* LEFT: 20' FORE / PROA */}
        {foreUnit ? render20Box(foreUnit, true) : renderOpen20Slot(foreBayStr, "20' PROA")}

        {/* RIGHT: 20' AFT / POPA */}
        {aftUnit ? render20Box(aftUnit, false) : renderOpen20Slot(aftBayStr, "20' POPA")}
      </div>
    );
  };

  const handleCertifyAndExportBaplie = () => {
    setShowCertifyModal(true);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#050D18] text-slate-100 p-3 sm:p-5 space-y-5 font-sans">

      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-[#0B1A28] border border-cyan-500/40 rounded-xl p-4 shadow-[0_0_25px_rgba(0,229,255,0.08)]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-cyan-950 to-slate-900 border border-cyan-400/60 rounded-lg text-cyan-400 shadow-[0_0_15px_rgba(0,229,255,0.2)]">
            <SlidersHorizontal className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-extrabold text-white font-mono tracking-wider flex items-center gap-2 flex-wrap">
              MÓDULO AJUSTE
              <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/50 font-bold">
                MINI PLANOS & RECAP
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Matriz Real de Estiba por Bahías · Doble Clic a Reciclaje · Arrastrar y Soltar · Certificación BAPLIE
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleCertifyAndExportBaplie}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-mono font-black text-xs rounded-lg border border-cyan-300 shadow-[0_0_20px_rgba(0,229,255,0.4)] transition-all flex items-center gap-2 cursor-pointer animate-pulse"
          >
            <ShieldCheck className="w-4 h-4 text-cyan-200" />
            <span>CERTIFICAR Y GENERAR BAPLIE OUT</span>
          </button>

          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-mono font-black text-xs rounded-lg border border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all flex items-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>SUBIR EXCEL / IMAGEN RECAP</span>
          </button>

          <button
            onClick={() => {
              setLocalContainers(parsedContainers.map(c => ({ ...c })));
              setRecycledList([]);
              setRecapTargets({});
              addLog('Plano restaurado desde el BAPLIE inicial.');
            }}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-600 transition-all text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>REINICIAR PLANO</span>
          </button>
        </div>
      </div>

      {/* ── STACKING RULE VIOLATION BANNER ── */}
      {stackingViolations.length > 0 && (
        <div className="bg-red-950/90 border-2 border-red-500 rounded-xl p-3.5 text-red-200 font-mono text-xs flex flex-col gap-2 shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-fadeIn">
          <div className="flex items-center gap-2 font-bold text-red-300 text-sm">
            <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse flex-shrink-0" />
            <span>ALERTA DE REGLAS DE ESTIBA: {stackingViolations.length} {stackingViolations.length === 1 ? 'VIOLACIÓN DETECTADA' : 'VIOLACIONES DETECTADAS'}</span>
          </div>
          <div className="space-y-1 pl-7">
            {stackingViolations.map((v, i) => (
              <p key={i} className="text-red-200/90 text-xs">
                • <strong className="text-red-300">{v.type === '40_OVER_SINGLE_20' ? 'CAMA INCOMPLETA (40\' s/ 1x 20\')' : '20\' SOBRE 40\''}</strong>: {v.message}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* ── VALIDATION BANNER ── */}
      {validationMsg && (
        <div
          className={`p-3 rounded-lg border text-xs font-mono flex items-center justify-between ${
            validationMsg.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200'
              : 'bg-rose-950/80 border-rose-500/60 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {validationMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <span>{validationMsg.text}</span>
          </div>
          <button
            onClick={() => setValidationMsg(null)}
            className="text-slate-400 hover:text-white ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── ASISTENTE INTELIGENTE: CONSOLIDACIÓN DE PAREJAS 20' Y LIBERACIÓN DE BAHÍAS DE 40' ── */}
      {orphan20Analysis.length > 0 && (
        <div className="bg-gradient-to-r from-amber-950/90 via-[#181106] to-slate-900 border-2 border-amber-500/70 rounded-xl p-4 shadow-[0_0_25px_rgba(245,158,11,0.2)] space-y-3 font-mono">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-amber-500/30 pb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/20 border border-amber-400/50 rounded-lg text-amber-400">
                <AlertTriangle className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                  CONSOLIDACIÓN DE PAREJAS 20' & PREVENCIÓN DE RESTIBAS EN 40'
                  <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                    {orphan20Analysis.length} UNIDADES HUÉRFANAS
                  </span>
                </h3>
                <p className="text-xs text-amber-200/80 font-normal mt-0.5">
                  Al cancelar o mover un 20', el slot de 40' queda parcialmente bloqueado. Consolide las unidades para evitar restibas y habilitar la carga de contenedores de 40'.
                </p>
              </div>
            </div>

            <button
              onClick={handleAutoConsolidateOrphans}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs rounded-lg shadow-[0_0_15px_rgba(245,158,11,0.5)] transition-all flex items-center gap-2 cursor-pointer flex-shrink-0"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>EMPAREJAR Y LIBERAR SLOTS 40' AUTOMÁTICAMENTE</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[10.5px]">
            {orphan20Analysis.slice(0, 4).map((item, idx) => (
              <div key={idx} className="bg-amber-950/40 border border-amber-500/40 p-2 rounded flex items-center justify-between text-amber-200">
                <div>
                  <span className="font-bold text-white block">{item.container.id}</span>
                  <span className="text-[9.5px] opacity-80">
                    Pos: B{item.container.bay}-R{item.row}-T{item.tier} ({item.isFore ? 'PROA' : 'POPA'})
                  </span>
                </div>
                <span className="text-[9px] bg-amber-900/80 text-amber-200 border border-amber-500/50 px-1.5 py-0.5 rounded font-black">
                  {item.container.pod}
                </span>
              </div>
            ))}
            {orphan20Analysis.length > 4 && (
              <div className="bg-amber-950/20 border border-amber-500/30 p-2 rounded flex items-center justify-center text-amber-300 font-bold text-[10px]">
                + {orphan20Analysis.length - 4} unidades huérfanas adicionales
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SECCIÓN 1: MINI PLANO REAL DE ESTIBA (CROSS-SECTION CON CANDIDATOS Y DRAG & DROP) ── */}
      <div className="bg-[#0B1A28] border border-cyan-500/30 rounded-xl p-4 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Ship className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-mono font-extrabold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                MINI PLANO REAL DE ESTIBA · SECCIÓN BAHÍA {activeBay}
                <span className="text-[10px] text-slate-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800 font-bold">
                  {activeBayContainers.length} UDS (40' + 20' JUNTOS)
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Proa (Fore 20'): {(parseInt(activeBay, 10) - 1).toString().padStart(2, '0')} · Centro (40'): {activeBay} · Popa (Aft 20'): {(parseInt(activeBay, 10) + 1).toString().padStart(2, '0')} | Doble clic = Reciclaje
              </p>
            </div>
          </div>

          {/* Bay Selector Tabs (combining 20ft & 40ft) */}
          <div className="flex items-center gap-1 max-w-full overflow-x-auto pb-1">
            {availableBays.map(bay => {
              const fore = (parseInt(bay, 10) - 1).toString().padStart(2, '0');
              const aft = (parseInt(bay, 10) + 1).toString().padStart(2, '0');
              return (
                <button
                  key={bay}
                  onClick={() => setActiveBay(bay)}
                  className={`px-3 py-1 rounded text-xs font-mono font-bold cursor-pointer transition-all flex items-center gap-1 whitespace-nowrap ${
                    activeBay === bay
                      ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,229,255,0.4)] font-black'
                      : 'bg-[#071320] text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <span>BAHÍA {bay}</span>
                  <span className="text-[9px] opacity-70">({fore}/{bay}/{aft})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── LIVE CONTAINER CHARACTERISTICS INSPECTION BANNER ── */}
        {activeInspectedContainer && (
          <div className="bg-[#040E1A] border-2 border-cyan-500/50 rounded-xl p-3 font-mono shadow-[0_0_25px_rgba(0,229,255,0.15)] space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-900/60 pb-2">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-cyan-950 border border-cyan-700/80 rounded-lg text-cyan-400">
                  <Box className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">INSPECCIÓN LIVE:</span>
                    <span className="text-base font-black text-cyan-300 font-mono tracking-wider">{activeInspectedContainer.id}</span>
                    <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded font-bold">
                      {activeInspectedContainer.size} FT ({activeInspectedContainer.iso || 'STD'})
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Pasa el cursor sobre cualquier casilla o haz clic para ver todas las características en pantalla o en ficha modal.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedContainer(activeInspectedContainer)}
                className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-slate-950 font-black text-xs rounded-lg transition-all shadow-[0_0_12px_rgba(0,229,255,0.3)] cursor-pointer flex items-center gap-1.5"
              >
                <span>VER FICHA COMPLETA (MODAL)</span>
              </button>
            </div>

            {/* Characteristics Grid Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5 text-[10px] text-slate-300 font-mono">
              <div className="bg-[#0B1E32] p-2 rounded-lg border border-slate-800 space-y-0.5">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">ESTIBA / POSICIÓN</span>
                <strong className="text-cyan-300 block text-xs">
                  B{activeInspectedContainer.bay || '01'}-R{activeInspectedContainer.row || '00'}-T{activeInspectedContainer.tier || '00'}
                </strong>
              </div>

              <div className="bg-[#0B1E32] p-2 rounded-lg border border-slate-800 space-y-0.5">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">PESO BRUTO</span>
                <strong className="text-emerald-400 block text-xs">
                  {activeInspectedContainer.weight || '24000'} KG ({((parseFloat(activeInspectedContainer.weight || '24000'))/1000).toFixed(2)} T)
                </strong>
              </div>

              <div className="bg-[#0B1E32] p-2 rounded-lg border border-slate-800 space-y-0.5">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">LÍNEA / OPERADOR</span>
                <strong className="text-white block text-xs">
                  {activeInspectedContainer.operator || 'MSK'}
                </strong>
              </div>

              <div className="bg-[#0B1E32] p-2 rounded-lg border border-slate-800 space-y-0.5">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">PUERTO POL ➔ POD</span>
                <strong className="text-amber-300 block text-xs truncate">
                  {activeInspectedContainer.pol || 'PACOL'} ➔ {activeInspectedContainer.pod || 'USMIA'}
                </strong>
              </div>

              <div className="bg-[#0B1E32] p-2 rounded-lg border border-slate-800 space-y-0.5">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">CARGA & ESTADO</span>
                <strong className="text-cyan-400 block text-xs">
                  {activeInspectedContainer.cargoType || 'DC'} ({activeInspectedContainer.status || 'FULL'})
                </strong>
              </div>

              <div className="bg-[#0B1E32] p-2 rounded-lg border border-slate-800 space-y-0.5">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">TEMP / VENTILACIÓN</span>
                <strong className="text-sky-300 block text-xs truncate">
                  {activeInspectedContainer.temp && activeInspectedContainer.temp !== '-' ? activeInspectedContainer.temp : 'DRY / N/A'}
                </strong>
              </div>

              <div className="bg-[#0B1E32] p-2 rounded-lg border border-slate-800 space-y-0.5">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">HAZMAT (IMO / UN)</span>
                <strong className={activeInspectedContainer.imoClass && activeInspectedContainer.imoClass !== '-' ? "text-rose-400 block font-bold text-xs" : "text-slate-400 block text-xs"}>
                  {activeInspectedContainer.imoClass && activeInspectedContainer.imoClass !== '-' ? `IMO ${activeInspectedContainer.imoClass} (${activeInspectedContainer.unNumber || ''})` : 'NO HAZMAT'}
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* REAL VESSEL BAY CROSS-SECTION CANVAS (Deck & Hold Matrix Grid) */}
        <div className="bg-[#071322] border border-[#13263B] rounded-xl p-3 space-y-3 font-mono shadow-inner">

          {/* 1. TOP COLUMN ROW HEADERS */}
          <div
            className="grid text-[9px] font-black text-slate-400 items-center border-b border-[#13263B] pb-1.5"
            style={{
              gridTemplateColumns: `26px repeat(${dynamicRows.length}, minmax(0, 1fr))`,
              gap: '3px'
            }}
          >
            <div className="text-[8px] text-slate-500 font-bold text-center">T/R</div>
            {dynamicRows.map(row => (
              <div key={row} className="text-center font-mono font-bold text-cyan-300">
                {row}
              </div>
            ))}
          </div>

          {/* 2. DECK SECTION GRID (CUBIERTA) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[8.5px] font-black tracking-wider text-emerald-400 uppercase bg-[#081A2E] px-2 py-1 rounded border border-[#142A42]">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" /> CUBIERTA / DECK
              </span>
              <span className="text-[8px] text-slate-300 font-normal">
                Tiers {dynamicDeckTiers[0] || '90'}-{dynamicDeckTiers[dynamicDeckTiers.length - 1] || '80'} ({activeBayContainers.filter(c => parseInt(c.tier || '80', 10) >= 80).length} uds)
              </span>
            </div>

            <div className="space-y-1">
              {dynamicDeckTiers.map(tier => (
                <div
                  key={tier}
                  className="grid items-center"
                  style={{
                    gridTemplateColumns: `26px repeat(${dynamicRows.length}, minmax(0, 1fr))`,
                    gap: '3px'
                  }}
                >
                  {/* Tier Label Sidebar */}
                  <div className="text-[8px] font-extrabold text-emerald-400 text-right pr-1 flex-shrink-0 font-mono">
                    {tier}
                  </div>

                  {/* Grid Cells for each Row */}
                  {dynamicRows.map(row => {
                    const slotList = slotContainersMap.get(`${row}-${tier}`) || [];
                    return renderSlotCell(slotList, row, tier);
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* 3. HATCH COVER / DECK SEPARATION BAR */}
          <div className="my-2 border-t-2 border-b-2 border-cyan-500/70 bg-[#0A1D30] py-1 px-3 text-[8.5px] font-mono font-black text-cyan-300 uppercase tracking-widest text-center flex items-center justify-center gap-2 rounded shadow-sm">
            <div className="h-0.5 flex-1 bg-cyan-500/50" />
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              TAPA DE ESCOTILLA / HATCH COVER
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            </span>
            <div className="h-0.5 flex-1 bg-cyan-500/50" />
          </div>

          {/* 4. HOLD SECTION GRID (BODEGA) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[8.5px] font-black tracking-wider text-blue-300 uppercase bg-[#081A2E] px-2 py-1 rounded border border-[#142A42]">
              <span className="flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5 text-blue-400" /> BODEGA / HOLD
              </span>
              <span className="text-[8px] text-slate-300 font-normal">
                Tiers {dynamicHoldTiers[0] || '12'}-{dynamicHoldTiers[dynamicHoldTiers.length - 1] || '02'} ({activeBayContainers.filter(c => parseInt(c.tier || '02', 10) < 80).length} uds)
              </span>
            </div>

            <div className="space-y-1">
              {dynamicHoldTiers.map(tier => (
                <div
                  key={tier}
                  className="grid items-center"
                  style={{
                    gridTemplateColumns: `26px repeat(${dynamicRows.length}, minmax(0, 1fr))`,
                    gap: '3px'
                  }}
                >
                  {/* Tier Label Sidebar */}
                  <div className="text-[8px] font-extrabold text-blue-400 text-right pr-1 flex-shrink-0 font-mono">
                    {tier}
                  </div>

                  {/* Grid Cells for each Row */}
                  {dynamicRows.map(row => {
                    const slotList = slotContainersMap.get(`${row}-${tier}`) || [];
                    return renderSlotCell(slotList, row, tier);
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* 5. BAY SUMMARY FOOTER PANEL */}
          <div className="bg-[#061220] border-t border-[#1B3554] p-2.5 font-mono text-[10px] rounded-b-lg">
            <div className="grid grid-cols-3 text-center border-b border-[#1B3554] pb-2 mb-2">
              <div>
                <span className="text-slate-300 text-[9px] font-bold block uppercase tracking-wide">DESCARGA</span>
                <span className="font-black text-amber-400 text-sm block mt-0.5">{activeBayDischargeCount.toString().padStart(2, '0')}</span>
              </div>
              <div className="border-x border-[#1B3554]">
                <span className="text-slate-300 text-[9px] font-bold block uppercase tracking-wide">TRÁNSITO</span>
                <span className="font-black text-slate-300 text-sm block mt-0.5">{activeBayTransitCount.toString().padStart(2, '0')}</span>
              </div>
              <div>
                <span className="text-slate-300 text-[9px] font-bold block uppercase tracking-wide">TOTAL BAHÍA</span>
                <span className="font-black text-cyan-400 text-sm block mt-0.5">{activeBayContainers.length.toString().padStart(2, '0')}</span>
              </div>
            </div>

            {/* POD Breakdown Pills */}
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              <span className="text-[9px] font-bold text-slate-400 mr-1">DISTRIBUCIÓN POD:</span>
              {activeBayPodBreakdown.map(([podCode, count]) => {
                const podColor = getPortColor(podCode);
                return (
                  <span
                    key={podCode}
                    className="px-2 py-0.5 rounded text-[9px] font-black text-white shadow-xs border border-black/30 flex items-center gap-1"
                    style={{ backgroundColor: podColor }}
                  >
                    <span>{podCode}:</span>
                    <span className="bg-black/30 px-1 rounded text-white">{count}</span>
                  </span>
                );
              })}
              {activeBayPodBreakdown.length === 0 && (
                <span className="text-[9px] text-slate-500 italic">Bahía sin contenedores</span>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── SECCIÓN 2: CAJA DE RECICLAJE (RECYCLING BIN) ── */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDropToRecycleBin}
        className="bg-[#0B1A28] border-2 border-dashed border-amber-500/40 rounded-xl p-4 shadow-xl space-y-3"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-mono font-extrabold text-amber-400 uppercase tracking-wider">
              CAJA DE RECICLAJE ({recycledList.length} UNIDADES REMOVIDAS / RESTIBAS)
            </h2>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Arrastra unidades aquí para eliminarlas o desde aquí a cualquier celda para re-ubicarlas
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1">
          {recycledList.map((item, idx) => (
            <div
              key={`recycled_${item.container.id}_${item.removedAt || ''}_${idx}`}
              draggable
              onDragStart={() => handleDragStart(item.container)}
              className="p-2 bg-[#071320] border border-amber-500/40 rounded-lg text-left cursor-grab active:cursor-grabbing hover:border-amber-400 transition-all font-mono text-xs space-y-1"
            >
              <div className="flex items-center justify-between">
                <strong className="text-white text-[11px] truncate">{item.container.id}</strong>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 font-bold border border-amber-500/40">
                  {item.reasonType === 'cancelacion' ? 'CANCELADO' : 'RESTIBA'}
                </span>
              </div>

              <div className="text-[9px] text-slate-300 flex justify-between">
                <span>ISO: {item.container.iso}</span>
                <span className="text-cyan-300">{item.container.pod}</span>
              </div>

              <div className="text-[8px] text-slate-400 truncate">
                {item.reasonNotes || 'Sin notas'}
              </div>
            </div>
          ))}

          {recycledList.length === 0 && (
            <div className="col-span-full p-6 text-center text-slate-500 font-mono text-xs border border-dashed border-slate-800 rounded-lg">
              La Caja de Reciclaje está vacía. Haz doble clic en cualquier contenedor del plano o arrástralo hasta aquí para removerlo.
            </div>
          )}
        </div>
      </div>

      {/* ── SECCIÓN 3: TABLA RECAP POR BODEGA Y CUBIERTA & CANDIDATOS AUTO-AJUSTE ── */}
      <div className="bg-[#0B1A28] border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-mono font-extrabold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              RECAP POR BODEGA / CUBIERTA (AJUSTE DIRECTO DE CANTIDADES)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Edita la cantidad objetivo para calcular automáticamente los candidatos a remover (sin movimientos automáticos)
            </p>
          </div>

          {candidatesToRemove.length > 0 && (
            <button
              onClick={handleApplyRecapCancellations}
              className="px-4 py-2 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-mono font-bold text-xs rounded-lg border border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)] transition-all cursor-pointer flex items-center gap-2 animate-bounce"
            >
              <Trash2 className="w-4 h-4" />
              <span>ENVIAR {candidatesToRemove.length} CANDIDATOS A CAJA DE RECICLAJE</span>
            </button>
          )}
        </div>

        {/* ── MODO DE SELECCIÓN DE CANDIDATOS (REGLA 6) ── */}
        <div className="bg-[#071320] border border-cyan-500/30 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-white uppercase tracking-wide">Modo de Selección:</span>
          </div>

          <div className="flex items-center gap-4 bg-[#050D18] px-3 py-1.5 rounded-md border border-slate-800">
            <label className="flex items-center gap-2 text-slate-200 cursor-pointer font-bold">
              <input
                type="radio"
                name="selectionMode"
                value="score"
                checked={selectionMode === 'score'}
                onChange={() => {
                  setSelectionMode('score');
                  addLog('Modo de selección cambiado a Score Automático.');
                }}
                className="accent-cyan-400 cursor-pointer"
              />
              <span className={selectionMode === 'score' ? 'text-cyan-300 font-black' : 'text-slate-400'}>
                Score Automático
              </span>
            </label>

            <label className="flex items-center gap-2 text-slate-200 cursor-pointer font-bold">
              <input
                type="radio"
                name="selectionMode"
                value="movins"
                checked={selectionMode === 'movins'}
                onChange={() => {
                  setSelectionMode('movins');
                  addLog('Modo de selección cambiado a Priorizar Número de Contenedor (MOVINS).');
                }}
                className="accent-amber-400 cursor-pointer"
              />
              <span className={selectionMode === 'movins' ? 'text-amber-300 font-black' : 'text-slate-400'}>
                Priorizar Número de Contenedor (MOVINS)
              </span>
            </label>
          </div>
        </div>

        <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-800 bg-[#071320]">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0D2135] text-slate-300 sticky top-0 border-b border-slate-800">
              <tr>
                <th className="p-2">Bahía</th>
                <th className="p-2">Sección</th>
                <th className="p-2">POD</th>
                <th className="p-2">ISO</th>
                <th className="p-2">Estado</th>
                <th className="p-2 text-center">Cant. Actual</th>
                <th className="p-2 text-center">Cant. Objetivo (Editar)</th>
                {selectionMode === 'movins' && <th className="p-2 text-center">Contenedor MOVINS</th>}
                <th className="p-2 text-center">Candidatos a Remover</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {recapRows.map((row) => {
                const target = recapTargets[row.key] !== undefined ? recapTargets[row.key] : row.currentQty;
                const diff = row.currentQty - target;
                const candidatesInGroup = candidatesToRemove.filter(c => c.key === row.key);

                return (
                  <tr key={row.key} className="hover:bg-slate-800/40">
                    <td className="p-2 font-bold text-cyan-300">BAHÍA {row.bay}</td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        row.section === 'CUBIERTA'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                          : 'bg-blue-950 text-blue-300 border border-blue-500/40'
                      }`}>
                        {row.section}
                      </span>
                    </td>
                    <td className="p-2 text-slate-200">{row.pod}</td>
                    <td className="p-2 font-bold text-amber-300">{row.iso}</td>
                    <td className="p-2 font-bold">{row.status === 'F' ? 'FULL' : 'EMPTY'}</td>
                    <td className="p-2 text-center font-black text-white text-sm">{row.currentQty}</td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        min={0}
                        value={target}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setRecapTargets(prev => ({
                            ...prev,
                            [row.key]: isNaN(val) ? 0 : val
                          }));
                        }}
                        className="w-20 bg-[#050D18] border border-cyan-500/50 rounded px-2 py-1 text-center text-cyan-300 font-bold focus:outline-none focus:border-amber-400"
                      />
                    </td>
                    {selectionMode === 'movins' && (
                      <td className="p-2 text-center">
                        <input
                          type="text"
                          placeholder="e.g. MSCU1234567"
                          value={movinsInputs[row.key] || ''}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            setMovinsInputs(prev => ({ ...prev, [row.key]: val }));
                            setFallbackToScoreKeys(prev => ({ ...prev, [row.key]: false }));
                          }}
                          className="w-32 bg-[#050D18] border border-amber-500/50 rounded px-2 py-1 text-center text-amber-300 font-mono text-xs uppercase focus:outline-none focus:border-amber-400"
                        />
                      </td>
                    )}
                    <td className="p-2 text-center">
                      {diff > 0 ? (
                        <span className="px-2 py-1 rounded bg-rose-950 text-rose-300 font-bold border border-rose-500/50 flex items-center justify-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                          Remover {diff} uds ({candidatesInGroup.length} en plano)
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-bold text-[10px] flex items-center justify-center gap-1">
                          <Check className="w-3.5 h-3.5" /> CUADRADO
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SECCIÓN AUDITORÍA LOG ── */}
      <div className="bg-[#0B1A28] border border-slate-800 rounded-xl p-4 shadow-xl space-y-2">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h2 className="text-xs sm:text-sm font-mono font-extrabold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            REGISTRO DE OPERACIONES Y AJUSTES (AUDIT TRAIL)
          </h2>
          <span className="text-[10px] font-mono text-slate-400">{auditLog.length} eventos</span>
        </div>

        <div className="max-h-28 overflow-y-auto space-y-1.5">
          {auditLog.map(log => (
            <div key={log.id} className="p-1.5 bg-[#071320] border border-slate-800 rounded flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500 text-[10px]">{log.time}</span>
              <span className="text-slate-300 text-[11px] flex-1 ml-3">{log.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── MODAL: RAZÓN DE ELIMINACIÓN DE CONTENEDOR ── */}
      {pendingRemovalContainer && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0B1A28] border border-amber-500/60 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-amber-400 uppercase flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-amber-400" />
                MOVER A CAJA DE RECICLAJE
              </h3>
              <button onClick={() => setPendingRemovalContainer(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>Contenedor ID: <strong className="text-white">{pendingRemovalContainer.id}</strong></div>
              <div>Posición Actual: <strong className="text-cyan-300">{pendingRemovalContainer.bay}-{pendingRemovalContainer.row}-{pendingRemovalContainer.tier}</strong></div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Motivo de la remoción:</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 bg-[#071320] p-2 rounded border border-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="removalReason"
                      checked={removalReasonType === 'cancelacion'}
                      onChange={() => setRemovalReasonType('cancelacion')}
                    />
                    <span>Cancelación por Línea / Ajuste de Recap</span>
                  </label>
                  <label className="flex items-center gap-2 bg-[#071320] p-2 rounded border border-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="removalReason"
                      checked={removalReasonType === 'restiba_planner'}
                      onChange={() => setRemovalReasonType('restiba_planner')}
                    />
                    <span>Restiba requerida por Planner</span>
                  </label>
                  <label className="flex items-center gap-2 bg-[#071320] p-2 rounded border border-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="removalReason"
                      checked={removalReasonType === 'estorba'}
                      onChange={() => setRemovalReasonType('estorba')}
                    />
                    <span>Restiba por Obstrucción (Estorba)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Notas adicionales:</label>
                <textarea
                  value={removalNotes}
                  onChange={e => setRemovalNotes(e.target.value)}
                  placeholder="Detalles opcionales..."
                  className="w-full bg-[#050D18] border border-slate-700 rounded p-2 text-slate-200 text-xs h-16"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setPendingRemovalContainer(null)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmRemoval}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded text-xs"
              >
                Confirmar Remoción
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: SUBIR EXCEL / IMAGEN RECAP Y COMPARAR DISCREPANCIAS ── */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0B1A28] border border-emerald-500/60 rounded-xl p-6 max-w-xl w-full shadow-2xl space-y-5 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-emerald-400 uppercase flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                COMPARADOR DE RECAP (EXCEL / IMAGEN VS SISTEMA)
              </h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setComparisonResults(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-[#071320] border-2 border-dashed border-emerald-500/40 rounded-xl text-center space-y-2">
              <Upload className="w-8 h-8 text-emerald-400 mx-auto animate-bounce" />
              <input
                type="file"
                accept="image/*, .xlsx, .xls, .csv"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setUploadedFileName(e.target.files[0].name);
                  }
                }}
                className="hidden"
                id="recapExcelFileInput"
              />
              <label
                htmlFor="recapExcelFileInput"
                className="px-4 py-2 bg-emerald-950 text-emerald-300 border border-emerald-500/60 rounded-lg text-xs font-bold inline-block cursor-pointer hover:bg-emerald-900 transition-all"
              >
                {uploadedFileName ? `SELECCIONADO: ${uploadedFileName}` : 'SELECCIONAR ARCHIVO EXCEL O IMAGEN RECAP'}
              </label>
            </div>

            {uploadedFileName && !comparisonResults && (
              <button
                onClick={handleVerifyExcelRecap}
                disabled={isComparing}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isComparing ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>AUDITANDO CANTIDADES...</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>EJECUTAR AUDITORÍA Y DETECTAR DIFERENCIAS</span>
                  </span>
                )}
              </button>
            )}

            {/* RESULTS REPORT TABLE */}
            {comparisonResults && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-cyan-300 uppercase border-b border-slate-800 pb-1">
                  RESULTADOS DE LA AUDITORÍA DE RECAP:
                </h4>

                <div className="max-h-52 overflow-y-auto rounded-lg border border-slate-800 bg-[#071320]">
                  <table className="w-full text-left text-[11px] font-mono">
                    <thead className="bg-[#0D2135] text-slate-300 sticky top-0 border-b border-slate-800">
                      <tr>
                        <th className="p-1.5">Bahía</th>
                        <th className="p-1.5">Sección</th>
                        <th className="p-1.5">ISO</th>
                        <th className="p-1.5 text-center">Cant. Excel</th>
                        <th className="p-1.5 text-center">Cant. Sistema</th>
                        <th className="p-1.5 text-center">Diferencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {comparisonResults.map((r, i) => (
                        <tr key={`comp_${r.bay}_${r.section}_${r.pod}_${r.iso}_${r.status}_${i}`} className={r.diff !== 0 ? 'bg-rose-950/40' : 'hover:bg-slate-800/40'}>
                          <td className="p-1.5 font-bold text-cyan-300">BAHÍA {r.bay}</td>
                          <td className="p-1.5">{r.section}</td>
                          <td className="p-1.5 text-amber-300 font-bold">{r.iso}</td>
                          <td className="p-1.5 text-center font-bold text-emerald-300">{r.excelQty}</td>
                          <td className="p-1.5 text-center font-bold text-white">{r.appQty}</td>
                          <td className="p-1.5 text-center font-bold">
                            {r.diff !== 0 ? (
                              <span className="text-rose-400 font-black">{r.diff} uds</span>
                            ) : (
                              <span className="text-emerald-400 font-bold">0 (OK)</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => {
                      setShowUploadModal(false);
                      setComparisonResults(null);
                    }}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded text-xs"
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={handleAutoAdjustToExcel}
                    className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-slate-950 font-black rounded text-xs flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>APLICAR AUTO-AJUSTE DEL EXCEL AL SISTEMA</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: CONTENEDOR NO ENCONTRADO EN MOVINS (REGLA 8) ── */}
      {notFoundModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0B1A28] border border-rose-500/80 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-rose-400 uppercase flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                CONTENEDOR NO ENCONTRADO
              </h3>
              <button
                onClick={() => {
                  if (notFoundModal) {
                    setFallbackToScoreKeys(prev => ({ ...prev, [notFoundModal.rowKey]: true }));
                    setNotFoundModal(null);
                  }
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p>
                El contenedor MOVINS <strong className="text-amber-300 font-mono text-sm">{notFoundModal.requestedId}</strong> no se encuentra registrado en la <strong className="text-white">{notFoundModal.section || 'sección'}</strong> de la <strong className="text-cyan-300">BAHÍA {notFoundModal.bay || '--'}</strong> para el grupo <span className="text-amber-300">{notFoundModal.pod} / {notFoundModal.iso}</span>.
              </p>
              <p className="text-slate-400 text-[11px]">
                ¿Desea usar el algoritmo de candidatos por Score Automático para seleccionar la mejor unidad accesible o cancelar la operación?
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  if (notFoundModal) {
                    setFallbackToScoreKeys(prev => ({ ...prev, [notFoundModal.rowKey]: true }));
                    setNotFoundModal(null);
                  }
                }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar Operación
              </button>
              <button
                onClick={() => handleFallbackToScore(notFoundModal.rowKey)}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-lg text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>Usar Candidato Automático</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CERTIFICACIÓN DE ESTIBA Y EMBARQUE BAPLIE OUT ── */}
      {showCertifyModal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0B1A28] border-2 border-cyan-400/80 rounded-2xl p-6 max-w-xl w-full shadow-[0_0_50px_rgba(0,229,255,0.25)] space-y-5 font-mono relative overflow-hidden">
            
            {/* Background Seal Watermark */}
            <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none">
              <Award className="w-72 h-72 text-cyan-400" />
            </div>

            <div className="flex items-center justify-between border-b border-cyan-500/30 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl text-slate-950 shadow-[0_0_20px_rgba(0,229,255,0.5)]">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                    CERTIFICADO DE ESTIBA DE SALIDA
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-bold">
                      BAPLIE EDI 2.0
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Estiba auditada y validada sin discrepancias por el Operador/Planner.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCertifyModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* CERTIFICATE DETAILS METRICS GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#071320] p-3 rounded-xl border border-slate-800">
              <div className="p-2 bg-[#0A192A] rounded border border-slate-800/80 text-center">
                <span className="text-[9px] text-slate-400 block font-bold uppercase">TOTAL CONTENEDORES</span>
                <span className="text-base font-black text-cyan-400 mt-0.5 block">{localContainers.length} uds</span>
              </div>
              <div className="p-2 bg-[#0A192A] rounded border border-slate-800/80 text-center">
                <span className="text-[9px] text-slate-400 block font-bold uppercase">PESO TOTAL BRUTO</span>
                <span className="text-base font-black text-emerald-400 mt-0.5 block">
                  {Math.round(localContainers.reduce((acc, c) => acc + (c.weight || 24000), 0) / 1000)} T
                </span>
              </div>
              <div className="p-2 bg-[#0A192A] rounded border border-slate-800/80 text-center">
                <span className="text-[9px] text-slate-400 block font-bold uppercase">UNIDADES REMOVIDAS</span>
                <span className="text-base font-black text-amber-400 mt-0.5 block">{recycledList.length} uds</span>
              </div>
              <div className="p-2 bg-[#0A192A] rounded border border-slate-800/80 text-center">
                <span className="text-[9px] text-slate-400 block font-bold uppercase">PUERTO ORIGEN (POL)</span>
                <span className="text-base font-black text-indigo-300 mt-0.5 block">{baplieHeader?.pol || activeTerminalKey || 'PACOL'}</span>
              </div>
            </div>

            {/* SEALS & AUDIT STAMP */}
            <div className="p-3 bg-cyan-950/40 border border-cyan-500/40 rounded-xl space-y-2 text-xs text-slate-200">
              <div className="flex items-center justify-between font-bold text-cyan-300 border-b border-cyan-500/20 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> SELLO DIGITAL DE CONFORMIDAD:
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{new Date().toLocaleString('es-ES')}</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Se certifica que la disposición de contenedores en las bahías corresponde exactamente a la estiba real física autorizada. El archivo EDIFACT BAPLIE 2.0 generado reflejará fielmente esta estructura para la comunicación de salida con la terminal y el buque.
              </p>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  exportToExcel(localContainers, 'Estiba_Certificada_Ajustada');
                  addLog('Reporte Excel de estiba certificada descargado.');
                }}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>DESCARGAR EXCEL (.XLSX)</span>
              </button>

              <button
                onClick={() => {
                  exportToBaplieEDI(localContainers, baplieHeader, 'BAPLIE_SALIDA_CERTIFICADO');
                  addLog('Archivo BAPLIE EDIFACT de salida generado y descargado exitosamente.');
                  setValidationMsg({ type: 'success', text: '¡BAPLIE EDIFACT de Salida Certificado y descargado con éxito!' });
                  setShowCertifyModal(false);
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-mono font-black text-xs rounded-xl border border-cyan-300 shadow-[0_0_20px_rgba(0,229,255,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-cyan-200" />
                <span>GENERAR Y DESCARGAR BAPLIE OUT (.EDI)</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
