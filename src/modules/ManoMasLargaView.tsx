import React, { useState, useMemo } from 'react';
import { useStowageStore } from '../core/stores/useStowageStore';
import { Container } from '../core/models/container';
import {
  Trophy,
  Info,
  Ship,
  Box,
  Layers,
  Target,
  Clock,
  Lightbulb,
  ArrowDown,
  RefreshCw,
  BarChart3,
  Anchor,
  Sliders,
  X,
  Cpu,
  Grid,
  Zap,
  CheckCircle2,
  Activity
} from 'lucide-react';

interface BayStats {
  bayNumber: string; // e.g. "10", "12", "22"
  bayDisplay: string; // e.g. "10", "12", "22"
  craneId: string;    // e.g. "QC-01"
  holdCount: number;  // Tiers < 80
  deckCount: number;  // Tiers >= 80
  restowCount: number; // Restow / Shifting count
  total: number;      // holdCount + deckCount + restowCount
  percentage: number;
}

interface ManoMasLargaViewProps {
  onClose?: () => void;
}

export const ManoMasLargaView: React.FC<ManoMasLargaViewProps> = ({ onClose }) => {
  const {
    parsedDischargeContainers,
    parsedLoadContainers,
    activeOperationView,
    activeTerminalKey,
    activeTerminal,
    baplieHeader,
    restowReport,
    setOperationView
  } = useStowageStore();

  // Selected Operation Mode in this view (or synchronized with global store)
  const [localOperationMode, setLocalOperationMode] = useState<'DESCARGA' | 'CARGA'>(activeOperationView || 'DESCARGA');
  const [selectedBayOverride, setSelectedBayOverride] = useState<string | null>(null);
  const [includeRestowsOnly, setIncludeRestowsOnly] = useState<boolean>(false);
  const [customCranes, setCustomCranes] = useState<Record<string, string>>({});
  const [showVesselMatrixGrid, setShowVesselMatrixGrid] = useState<boolean>(true);

  // Switch mode handler
  const handleToggleMode = (mode: 'DESCARGA' | 'CARGA') => {
    setLocalOperationMode(mode);
    setOperationView(mode);
    setSelectedBayOverride(null);
  };

  // Determine active container dataset
  const activeContainers: Container[] = useMemo(() => {
    const raw = localOperationMode === 'CARGA' ? parsedLoadContainers : parsedDischargeContainers;
    if (!raw || raw.length === 0) return [];

    if (includeRestowsOnly) {
      return raw.filter(c => c.operation === 'RESTOW' || c.isRestow);
    }

    return raw;
  }, [localOperationMode, parsedDischargeContainers, parsedLoadContainers, includeRestowsOnly]);

  // Restow count
  const totalRestows = useMemo(() => {
    const raw = localOperationMode === 'CARGA' ? parsedLoadContainers : parsedDischargeContainers;
    let count = raw.filter(c => c.operation === 'RESTOW' || c.isRestow).length;
    if (restowReport && restowReport.restowItems && restowReport.restowItems.length > 0) {
      count = Math.max(count, restowReport.restowItems.length);
    }
    return count;
  }, [localOperationMode, parsedDischargeContainers, parsedLoadContainers, restowReport]);

  // Compute stats per bay
  const { bayStatsList, totalShipMovements, maxBayStat } = useMemo(() => {
    // 1. Group containers by Bay
    const bayMap: Record<string, { hold: number; deck: number; restow: number }> = {};

    // Standard fallback bays if no containers are present
    const defaultBays = ['10', '12', '14', '16', '18', '20', '22', '24', '26', '28', '30', '32', '34', '38', '40'];

    if (activeContainers.length === 0) {
      // Sample realistic default numbers matching the reference chart
      const sampleHold = [18, 21, 16, 22, 24, 28, 25, 19, 27, 23, 20, 17, 15, 9, 8];
      const sampleDeck = [45, 52, 61, 48, 70, 65, 76, 58, 63, 54, 49, 41, 36, 22, 18];
      const sampleRestow = [0, 2, 1, 0, 5, 3, 4, 1, 2, 0, 3, 1, 0, 0, 0];

      defaultBays.forEach((b, idx) => {
        bayMap[b] = {
          hold: sampleHold[idx] || 15,
          deck: sampleDeck[idx] || 40,
          restow: sampleRestow[idx] || 0
        };
      });
    } else {
      // Collect restows from restowReport first
      if (restowReport && restowReport.restowItems) {
        restowReport.restowItems.forEach(r => {
          const bayStr = r.container?.bay;
          if (!bayStr || bayStr === 'Dato no disponible') return;
          let num = parseInt(bayStr, 10);
          if (isNaN(num) || num <= 0) return;
          if (num % 2 !== 0) {
            num = (num % 4 === 1) ? num + 1 : num - 1;
          }
          const bayKey = num.toString().padStart(2, '0');
          if (!bayMap[bayKey]) {
            bayMap[bayKey] = { hold: 0, deck: 0, restow: 0 };
          }
          bayMap[bayKey].restow += 1;
        });
      }

      activeContainers.forEach(c => {
        if (!c.bay || c.bay === 'Dato no disponible') return;

        let num = parseInt(c.bay, 10);
        if (isNaN(num) || num <= 0) return;

        // Normalize 20ft odd bays to standard even bay section (e.g. 11 -> 12 or 10)
        if (num % 2 !== 0) {
          num = (num % 4 === 1) ? num + 1 : num - 1;
        }

        const bayKey = num.toString().padStart(2, '0');

        if (!bayMap[bayKey]) {
          bayMap[bayKey] = { hold: 0, deck: 0, restow: 0 };
        }

        const tierNum = parseInt(c.tier || '0', 10);
        if (tierNum >= 80) {
          bayMap[bayKey].deck += 1;
        } else {
          bayMap[bayKey].hold += 1;
        }

        if (c.operation === 'RESTOW' || c.isRestow) {
          // If not already counted from restowReport
          if (!restowReport || !restowReport.restowItems || restowReport.restowItems.length === 0) {
            bayMap[bayKey].restow += 1;
          }
        }
      });
    }

    // Ensure all bays are sorted numerically
    const sortedBayKeys = Object.keys(bayMap).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

    // Calculate grand total INCLUDING restows
    let grandTotal = 0;
    sortedBayKeys.forEach(k => {
      grandTotal += (bayMap[k].hold + bayMap[k].deck + bayMap[k].restow);
    });
    if (grandTotal === 0) grandTotal = 1;

    let maxStat: BayStats | null = null;
    let autoCraneCounter = 1;

    const statsList: BayStats[] = sortedBayKeys.map((bayKey, idx) => {
      const hold = bayMap[bayKey].hold;
      const deck = bayMap[bayKey].deck;
      const restow = bayMap[bayKey].restow;
      const total = hold + deck + restow;
      const pct = (total / grandTotal) * 100;

      // Assign default Crane ID or custom override
      let craneId = customCranes[bayKey];
      if (!craneId) {
        if (total > 0) {
          craneId = `QC-${String(autoCraneCounter).padStart(2, '0')}`;
          if (idx > 0 && idx % 2 === 1) {
            autoCraneCounter = Math.min(autoCraneCounter + 1, 6);
          }
        } else {
          craneId = 'SIN GRÚA';
        }
      }

      const item: BayStats = {
        bayNumber: bayKey,
        bayDisplay: parseInt(bayKey, 10).toString(),
        craneId,
        holdCount: hold,
        deckCount: deck,
        restowCount: restow,
        total,
        percentage: pct
      };

      if (!maxStat || item.total > maxStat.total) {
        maxStat = item;
      }

      return item;
    });

    return {
      bayStatsList: statsList,
      totalShipMovements: grandTotal,
      maxBayStat: maxStat as BayStats | null
    };
  }, [activeContainers, restowReport, customCranes]);

  // Active selected bay
  const selectedBayStat = useMemo(() => {
    if (selectedBayOverride) {
      const found = bayStatsList.find(b => b.bayNumber === selectedBayOverride || b.bayDisplay === selectedBayOverride);
      if (found) return found;
    }
    return maxBayStat || bayStatsList[0] || {
      bayNumber: '22',
      bayDisplay: '22',
      craneId: 'QC-03',
      holdCount: 25,
      deckCount: 76,
      restowCount: 4,
      total: 105,
      percentage: 9.9
    };
  }, [selectedBayOverride, bayStatsList, maxBayStat]);

  // Containers filtered for selected bay (for Vessel Grid Matrix)
  const selectedBayContainers = useMemo(() => {
    if (!activeContainers || activeContainers.length === 0) return [];
    const bayNum = parseInt(selectedBayStat.bayNumber, 10);

    return activeContainers.filter(c => {
      if (!c.bay || c.bay === 'Dato no disponible') return false;
      let cBay = parseInt(c.bay, 10);
      if (isNaN(cBay)) return false;
      if (cBay % 2 !== 0) {
        cBay = (cBay % 4 === 1) ? cBay + 1 : cBay - 1;
      }
      return cBay === bayNum;
    });
  }, [activeContainers, selectedBayStat]);

  // Top 5 Bays with most movements
  const top5Bays = useMemo(() => {
    return [...bayStatsList].sort((a, b) => b.total - a.total).slice(0, 5);
  }, [bayStatsList]);

  // Ship Title
  const shipTitle = baplieHeader?.vesselName
    ? baplieHeader.vesselName.toUpperCase()
    : 'MN SAN ANTONIO';

  // Grid Tiers & Rows for Vessel Bay Matrix
  const deckTiers = ['92', '90', '88', '86', '84', '82', '80'];
  const holdTiers = ['14', '12', '10', '08', '06', '04', '02', '00'];
  const gridRows = ['08', '06', '04', '02', '01', '03', '05', '07', '09'];

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#050D18] text-slate-100 p-2 sm:p-4 md:p-6 space-y-4 sm:space-y-6 font-sans">
      
      {/* ── TOP HEADER CONTROL BAR ── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-[#0B1A28] border border-cyan-500/30 rounded-xl p-3 sm:p-4 shadow-[0_0_20px_rgba(0,229,255,0.05)]">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 sm:p-2.5 bg-cyan-950/80 border border-cyan-500/50 rounded-lg text-cyan-400 flex-shrink-0">
            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-sm sm:text-lg md:text-xl font-extrabold text-white font-mono tracking-wider flex items-center gap-2 flex-wrap">
              <span>RESUMEN Y PLAN DE GRÚAS</span>
              <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold">
                {localOperationMode}
              </span>
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-400 flex items-center gap-1.5 sm:gap-2 mt-0.5 flex-wrap">
              <span>Buque: <strong className="text-slate-200">{shipTitle}</strong></span>
              <span>•</span>
              <span>Terminal: <strong className="text-cyan-300">{activeTerminalKey} ({activeTerminal?.name?.split('(')[0]?.trim() || 'TOS'})</strong></span>
            </p>
          </div>
        </div>

        {/* Operational View Switcher & Action Toggles */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full md:w-auto justify-between md:justify-end">
          <div className="bg-[#071320] p-1 rounded-lg border border-slate-700/80 flex items-center gap-1">
            <button
              onClick={() => handleToggleMode('DESCARGA')}
              className={`px-2.5 sm:px-4 py-1.5 rounded-md text-[10px] sm:text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                localOperationMode === 'DESCARGA'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <ArrowDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>DESCARGA</span>
            </button>
            <button
              onClick={() => handleToggleMode('CARGA')}
              className={`px-2.5 sm:px-4 py-1.5 rounded-md text-[10px] sm:text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                localOperationMode === 'CARGA'
                  ? 'bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Ship className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>CARGA</span>
            </button>
          </div>

          <button
            onClick={() => setShowVesselMatrixGrid(!showVesselMatrixGrid)}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-mono font-bold border transition-all cursor-pointer flex items-center gap-1 ${
              showVesselMatrixGrid
                ? 'bg-cyan-950 text-cyan-300 border-cyan-500/80 shadow-[0_0_10px_rgba(0,229,255,0.3)]'
                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <Grid className="w-3.5 h-3.5 text-cyan-400" />
            <span>ESTADO</span>
          </button>

          {/* Restow filter pill if restows exist */}
          {totalRestows > 0 && (
            <button
              onClick={() => setIncludeRestowsOnly(!includeRestowsOnly)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-mono font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                includeRestowsOnly
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/80 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
              }`}
              title="Filtrar solo movimientos de restibas en esta vista"
            >
              <RefreshCw className="w-3.5 h-3.5 text-rose-400" />
              <span>RESTIBAS: <strong className="text-white">{totalRestows}</strong></span>
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 bg-slate-800 hover:bg-rose-600/30 text-slate-300 hover:text-rose-300 rounded-lg border border-slate-600 hover:border-rose-500/60 transition-all cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}
        </div>
      </div>

      {/* ── VISUAL BAYS GRID CARDS (BODEGA, CUBIERTA, RESTIBAS & GRÚAS) ── */}
      <div className="bg-[#0B1A28] border border-cyan-500/30 rounded-xl p-3 sm:p-4 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <h2 className="text-xs sm:text-sm font-mono font-extrabold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
            <Grid className="w-4 h-4 text-cyan-400" />
            DISTRIBUCIÓN VISUAL DE MOVIMIENTOS POR BAHÍA ({localOperationMode})
          </h2>
          <span className="text-[10px] sm:text-[11px] font-mono text-slate-400">
            Haz clic en una bahía para seleccionarla e inspeccionarla
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2.5">
          {bayStatsList.map(stat => {
            const isSelected = selectedBayStat?.bayNumber === stat.bayNumber;
            const isMax = maxBayStat?.bayNumber === stat.bayNumber;
            const totalMoves = stat.total;
            const holdPct = totalMoves > 0 ? (stat.holdCount / totalMoves) * 100 : 0;
            const deckPct = totalMoves > 0 ? (stat.deckCount / totalMoves) * 100 : 0;
            const restowPct = totalMoves > 0 ? (stat.restowCount / totalMoves) * 100 : 0;

            return (
              <div
                key={stat.bayNumber}
                onClick={() => setSelectedBayOverride(stat.bayNumber)}
                className={`rounded-xl p-2.5 sm:p-3 border transition-all cursor-pointer flex flex-col justify-between relative group ${
                  isSelected
                    ? 'bg-gradient-to-b from-[#112A45] to-[#0A1A2A] border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.35)] ring-2 ring-amber-400/60 scale-[1.02]'
                    : isMax
                    ? 'bg-[#0E2235] border-amber-500/60 hover:border-amber-400'
                    : 'bg-[#081624] border-slate-800 hover:border-cyan-500/50 hover:bg-[#0A1E30]'
                }`}
              >
                {isMax && (
                  <span className="absolute -top-2 -right-1 bg-amber-500 text-slate-950 text-[8px] font-mono font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow z-10">
                    CRÍTICA
                  </span>
                )}

                {/* Card Header: Bay Display & Crane */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-xs font-mono font-black px-2 py-0.5 rounded ${
                    isSelected ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-900 text-cyan-300 border border-slate-700'
                  }`}>
                    BAHÍA {stat.bayDisplay}
                  </span>
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                    stat.craneId !== 'SIN GRÚA'
                      ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40'
                      : 'bg-slate-900 text-slate-500 border-slate-800'
                  }`}>
                    {stat.craneId}
                  </span>
                </div>

                {/* Stacked Proportional Visual Bar (Bodega vs Cubierta vs Restibas) */}
                <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden flex my-1.5 border border-slate-800 p-0.5">
                  {stat.holdCount > 0 && (
                    <div
                      style={{ width: `${holdPct}%` }}
                      className="bg-blue-500 h-full rounded-l transition-all"
                      title={`Bodega: ${stat.holdCount}`}
                    />
                  )}
                  {stat.deckCount > 0 && (
                    <div
                      style={{ width: `${deckPct}%` }}
                      className="bg-emerald-500 h-full transition-all"
                      title={`Cubierta: ${stat.deckCount}`}
                    />
                  )}
                  {stat.restowCount > 0 && (
                    <div
                      style={{ width: `${restowPct}%` }}
                      className="bg-rose-500 h-full rounded-r transition-all"
                      title={`Restibas: ${stat.restowCount}`}
                    />
                  )}
                </div>

                {/* Numerical Breakdown */}
                <div className="space-y-1 mt-1 text-[10px] font-mono">
                  <div className="flex justify-between items-center text-blue-300">
                    <span className="flex items-center gap-1 text-[9px] sm:text-[10px]">
                      <Box className="w-2.5 h-2.5 text-blue-400" /> Bodega:
                    </span>
                    <strong className="font-bold text-white text-[10px] sm:text-xs">{stat.holdCount}</strong>
                  </div>
                  <div className="flex justify-between items-center text-emerald-300">
                    <span className="flex items-center gap-1 text-[9px] sm:text-[10px]">
                      <Layers className="w-2.5 h-2.5 text-emerald-400" /> Cubierta:
                    </span>
                    <strong className="font-bold text-white text-[10px] sm:text-xs">{stat.deckCount}</strong>
                  </div>
                  {stat.restowCount > 0 && (
                    <div className="flex justify-between items-center text-rose-300">
                      <span className="flex items-center gap-1 text-[9px]">
                        <RefreshCw className="w-2.5 h-2.5 text-rose-400" /> Restibas:
                      </span>
                      <strong className="font-bold text-rose-300 text-[10px]">{stat.restowCount}</strong>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-1 border-t border-slate-800 text-amber-300 font-bold">
                    <span className="text-[9px]">Total:</span>
                    <span className="text-xs font-extrabold">{stat.total}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── TABLE 1: RESUMEN DE MOVIMIENTOS POR BAHÍA ── */}
      <div className="bg-[#0B1A28] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="bg-[#071320] px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-xs font-mono font-extrabold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            RESUMEN DE MOVIMIENTOS POR BAHÍA - {localOperationMode} (BODEGA + CUBIERTA + RESTIBAS)
          </h2>
          <span className="text-[11px] font-mono text-slate-400">
            Total General: <strong className="text-amber-300">{totalShipMovements.toLocaleString()} mov. totales</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs font-mono border-collapse min-w-[950px]">
            <thead>
              <tr className="bg-[#0D1F33] text-slate-300 border-b border-slate-800">
                <th className="py-2.5 px-3 text-left font-bold text-slate-400 uppercase w-36 border-r border-slate-800">
                  BAHÍA
                </th>
                {bayStatsList.map(stat => {
                  const isSelected = selectedBayStat?.bayNumber === stat.bayNumber;
                  const isMax = maxBayStat?.bayNumber === stat.bayNumber;
                  return (
                    <th
                      key={stat.bayNumber}
                      onClick={() => setSelectedBayOverride(stat.bayNumber)}
                      className={`py-2.5 px-2 font-extrabold text-sm cursor-pointer transition-colors border-r border-slate-800/60 min-w-[52px] ${
                        isSelected
                          ? 'bg-amber-500/20 text-amber-300 border-t-2 border-t-amber-400'
                          : isMax
                          ? 'bg-amber-950/40 text-amber-200'
                          : 'hover:bg-slate-800/60 text-slate-200'
                      }`}
                    >
                      {stat.bayDisplay}
                    </th>
                  );
                })}
                <th className="py-2.5 px-3 font-extrabold text-white bg-[#0A1A2A] uppercase min-w-[80px]">
                  TOTAL
                </th>
              </tr>
            </thead>
            <tbody>
              {/* ROW 1: GRÚA ASIGNADA (QC) */}
              <tr className="border-b border-slate-800/80 bg-[#0A1D30]">
                <td className="py-2 px-3 text-left font-bold text-cyan-300 flex items-center gap-2 border-r border-slate-800">
                  <span className="p-1 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                    <Cpu className="w-3.5 h-3.5" />
                  </span>
                  GRÚA / QC
                </td>
                {bayStatsList.map(stat => (
                  <td key={stat.bayNumber} className="py-1.5 px-1 font-bold border-r border-slate-800/60">
                    <select
                      value={stat.craneId}
                      onChange={(e) => setCustomCranes(prev => ({ ...prev, [stat.bayNumber]: e.target.value }))}
                      className="bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 rounded px-1 py-0.5 text-[10px] font-mono cursor-pointer hover:border-cyan-400 focus:outline-none"
                    >
                      <option value="QC-01">QC-01</option>
                      <option value="QC-02">QC-02</option>
                      <option value="QC-03">QC-03</option>
                      <option value="QC-04">QC-04</option>
                      <option value="QC-05">QC-05</option>
                      <option value="QC-06">QC-06</option>
                      <option value="SIN GRÚA">SIN GRÚA</option>
                    </select>
                  </td>
                ))}
                <td className="py-2 px-3 font-extrabold text-cyan-300 bg-[#0A1A2A] text-[11px]">
                  {new Set(bayStatsList.map(b => b.craneId).filter(c => c !== 'SIN GRÚA')).size} GRÚAS
                </td>
              </tr>

              {/* ROW 2: BODEGA (HOLD) */}
              <tr className="border-b border-slate-800/80 bg-[#091624]">
                <td className="py-2 px-3 text-left font-bold text-blue-400 flex items-center gap-2 border-r border-slate-800">
                  <span className="p-1 rounded bg-blue-950 border border-blue-500/40 text-blue-300">
                    <Box className="w-3.5 h-3.5" />
                  </span>
                  BODEGA
                </td>
                {bayStatsList.map(stat => {
                  const isSelected = selectedBayStat?.bayNumber === stat.bayNumber;
                  return (
                    <td
                      key={stat.bayNumber}
                      onClick={() => setSelectedBayOverride(stat.bayNumber)}
                      className={`py-2 px-2 font-bold cursor-pointer transition-colors border-r border-slate-800/60 ${
                        isSelected ? 'bg-amber-500/10 text-amber-300' : 'text-blue-300 hover:bg-slate-800/40'
                      }`}
                    >
                      {stat.holdCount}
                    </td>
                  );
                })}
                <td className="py-2 px-3 font-extrabold text-blue-200 bg-[#0A1A2A]">
                  {bayStatsList.reduce((acc, b) => acc + b.holdCount, 0)}
                </td>
              </tr>

              {/* ROW 3: CUBIERTA (DECK) */}
              <tr className="border-b border-slate-800/80 bg-[#0B1A28]">
                <td className="py-2 px-3 text-left font-bold text-emerald-400 flex items-center gap-2 border-r border-slate-800">
                  <span className="p-1 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300">
                    <Layers className="w-3.5 h-3.5" />
                  </span>
                  CUBIERTA
                </td>
                {bayStatsList.map(stat => {
                  const isSelected = selectedBayStat?.bayNumber === stat.bayNumber;
                  return (
                    <td
                      key={stat.bayNumber}
                      onClick={() => setSelectedBayOverride(stat.bayNumber)}
                      className={`py-2 px-2 font-bold cursor-pointer transition-colors border-r border-slate-800/60 ${
                        isSelected ? 'bg-amber-500/10 text-amber-300' : 'text-emerald-300 hover:bg-slate-800/40'
                      }`}
                    >
                      {stat.deckCount}
                    </td>
                  );
                })}
                <td className="py-2 px-3 font-extrabold text-emerald-200 bg-[#0A1A2A]">
                  {bayStatsList.reduce((acc, b) => acc + b.deckCount, 0)}
                </td>
              </tr>

              {/* ROW 4: RESTIBAS (RESTOWS / SHIFTINGS) */}
              <tr className="border-b border-slate-800/80 bg-[#121A28]">
                <td className="py-2 px-3 text-left font-bold text-rose-400 flex items-center gap-2 border-r border-slate-800">
                  <span className="p-1 rounded bg-rose-950 border border-rose-500/40 text-rose-300">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </span>
                  RESTIBAS
                </td>
                {bayStatsList.map(stat => {
                  const isSelected = selectedBayStat?.bayNumber === stat.bayNumber;
                  const hasRestow = stat.restowCount > 0;
                  return (
                    <td
                      key={stat.bayNumber}
                      onClick={() => setSelectedBayOverride(stat.bayNumber)}
                      className={`py-2 px-2 font-extrabold cursor-pointer transition-colors border-r border-slate-800/60 ${
                        isSelected
                          ? 'bg-amber-500/20 text-amber-300'
                          : hasRestow
                          ? 'text-rose-300 bg-rose-950/30'
                          : 'text-slate-500'
                      }`}
                    >
                      {stat.restowCount}
                    </td>
                  );
                })}
                <td className="py-2 px-3 font-extrabold text-rose-300 bg-[#0A1A2A]">
                  {bayStatsList.reduce((acc, b) => acc + b.restowCount, 0)}
                </td>
              </tr>

              {/* ROW 5: TOTAL MOVIMIENTOS (BODEGA + CUBIERTA + RESTIBAS) */}
              <tr className="border-b border-slate-800/80 bg-[#071320] font-extrabold">
                <td className="py-2 px-3 text-left font-bold text-white uppercase border-r border-slate-800">
                  TOTAL MOV.
                </td>
                {bayStatsList.map(stat => {
                  const isSelected = selectedBayStat?.bayNumber === stat.bayNumber;
                  return (
                    <td
                      key={stat.bayNumber}
                      onClick={() => setSelectedBayOverride(stat.bayNumber)}
                      className={`py-2 px-2 text-sm cursor-pointer transition-colors border-r border-slate-800/60 ${
                        isSelected ? 'bg-amber-500/30 text-amber-200 font-black' : 'text-white hover:bg-slate-800/40'
                      }`}
                    >
                      {stat.total}
                    </td>
                  );
                })}
                <td className="py-2 px-3 font-black text-amber-300 bg-[#0A1A2A] text-sm">
                  {totalShipMovements.toLocaleString()}
                </td>
              </tr>

              {/* ROW 6: % DEL TOTAL */}
              <tr className="bg-[#050E18] text-[11px] text-slate-400">
                <td className="py-2 px-3 text-left font-bold text-slate-400 uppercase border-r border-slate-800">
                  % DEL TOTAL
                </td>
                {bayStatsList.map(stat => {
                  const isSelected = selectedBayStat?.bayNumber === stat.bayNumber;
                  return (
                    <td
                      key={stat.bayNumber}
                      onClick={() => setSelectedBayOverride(stat.bayNumber)}
                      className={`py-2 px-2 cursor-pointer transition-colors border-r border-slate-800/60 ${
                        isSelected ? 'bg-amber-500/20 text-amber-400 font-extrabold' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      {stat.percentage.toFixed(1)}%
                    </td>
                  );
                })}
                <td className="py-2 px-3 font-bold text-slate-200 bg-[#0A1A2A]">
                  100%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── BANNER: MANO MÁS LARGA DE DESCARGA / CARGA ── */}
      {maxBayStat && (
        <div className="bg-gradient-to-r from-[#0B1E30] via-[#122A42] to-[#0B1E30] border-2 border-amber-500/70 rounded-xl p-3.5 shadow-[0_0_25px_rgba(245,158,11,0.2)] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 border border-amber-500/60 rounded-full text-amber-400 animate-pulse">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-amber-400/90 font-bold block">
                Mano Más Larga Crítica ({localOperationMode})
              </span>
              <h3 className="text-base md:text-lg font-mono font-black text-white tracking-wide">
                MANO MÁS LARGA DE {localOperationMode}:{' '}
                <span className="text-amber-300 underline underline-offset-4 decoration-amber-500">
                  BAHÍA {maxBayStat.bayDisplay} ({maxBayStat.total} MOVIMIENTOS - {maxBayStat.craneId})
                </span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-300 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700/80">
            <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span>Totales incluyen Bodega ({maxBayStat.holdCount}) + Cubierta ({maxBayStat.deckCount}) + Restibas ({maxBayStat.restowCount})</span>
          </div>
        </div>
      )}

      {/* ── SECTION 2: VISTA LATERAL DEL BUQUE CON GRÚAS OPERANDO EN CADA BAHÍA ── */}
      <div className="bg-[#081524] border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative">
        <div className="bg-[#050D18] px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-xs font-mono font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <Ship className="w-4 h-4 text-cyan-400" />
            VISTA LATERAL DEL BUQUE - ASIGNACIÓN Y OPERACIÓN DE GRÚAS DE PÓRTICO (QC) POR BAHÍA
          </h2>
          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400">
              <Activity className="w-3 h-3 animate-pulse" /> Grúas activas en tiempo real
            </span>
            <span>•</span>
            <span>Haz clic para inspeccionar bahía</span>
          </div>
        </div>

        {/* SHIP GRAPHIC CANVAS CONTAINER */}
        <div className="p-6 overflow-x-auto min-w-[950px] bg-gradient-to-b from-[#081728] via-[#0B2038] to-[#04101D] relative">
          
          {/* Stack Labels Legend on Left side */}
          <div className="absolute left-4 top-28 z-20 flex flex-col gap-3 text-[10px] font-mono font-bold">
            <div className="flex items-center gap-1.5 text-cyan-300 bg-cyan-950/80 px-2 py-1 rounded border border-cyan-500/40 shadow-md">
              <Zap className="w-3 h-3 text-cyan-400 animate-pulse" />
              <span>GRÚAS QC</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/80 px-2 py-1 rounded border border-emerald-500/40 shadow-md">
              <span>CUBIERTA</span>
              <span>➔</span>
            </div>
            <div className="flex items-center gap-1.5 text-blue-400 bg-blue-950/80 px-2 py-1 rounded border border-blue-500/40 shadow-md">
              <span>BODEGA</span>
              <span>➔</span>
            </div>
            <div className="flex items-center gap-1.5 text-rose-400 bg-rose-950/80 px-2 py-1 rounded border border-rose-500/40 shadow-md">
              <span>RESTIBAS</span>
              <span>➔</span>
            </div>
          </div>

          {/* VESSEL CONTAINER STACKS GRID */}
          <div className="flex items-end justify-center gap-2 pl-36 pr-12 pt-8 pb-12 relative z-10">

            {/* Bridge Superstructure (Stern on Left) */}
            <div className="flex flex-col items-center justify-end h-44 w-16 mr-2 relative group">
              <div className="w-1 h-8 bg-slate-400 mb-0"></div>
              <div className="w-6 h-8 bg-slate-800 border-x border-t border-slate-600 rounded-t flex items-center justify-center">
                <div className="w-4 h-2 bg-red-600"></div>
              </div>
              <div className="w-14 h-24 bg-slate-800 border border-slate-600 rounded flex flex-col justify-between p-1 shadow-lg">
                <div className="flex gap-1 justify-center">
                  <div className="w-2 h-2 bg-yellow-300 rounded-sm"></div>
                  <div className="w-2 h-2 bg-yellow-300 rounded-sm"></div>
                  <div className="w-2 h-2 bg-yellow-300 rounded-sm"></div>
                </div>
                <div className="text-[8px] font-mono text-center text-slate-400 font-bold uppercase leading-none">
                  BRIDGE
                </div>
                <div className="w-10 h-3 bg-slate-700 mx-auto rounded border border-slate-500"></div>
              </div>
            </div>

            {/* BAYS COLUMNS WITH ANIMATED QUAY GANTRY CRANES */}
            {bayStatsList.map((stat) => {
              const isSelected = selectedBayStat?.bayNumber === stat.bayNumber;
              const isMax = maxBayStat?.bayNumber === stat.bayNumber;
              const hasCrane = stat.craneId !== 'SIN GRÚA';

              return (
                <div
                  key={stat.bayNumber}
                  onClick={() => setSelectedBayOverride(stat.bayNumber)}
                  className={`flex flex-col items-center cursor-pointer transition-all relative group ${
                    isSelected ? 'scale-105 z-30' : 'hover:scale-102 z-10'
                  }`}
                >
                  {/* Selected Highlight Glow Box */}
                  {isSelected && (
                    <div className="absolute -inset-2 bg-amber-500/10 border-2 border-amber-400 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] pointer-events-none z-0 animate-pulse"></div>
                  )}

                  {/* QUAY GANTRY CRANE OPERATING ON THIS BAY */}
                  <div className="h-20 flex flex-col items-center justify-end mb-1 z-20">
                    {hasCrane ? (
                      <div className="flex flex-col items-center group-hover:-translate-y-1 transition-transform relative">
                        
                        {/* Live Activity Indicator Dot */}
                        {isSelected && (
                          <div className="absolute -top-2 flex items-center gap-1 bg-amber-400 text-slate-950 px-1 rounded text-[8px] font-mono font-black animate-bounce shadow">
                            <Zap className="w-2.5 h-2.5" /> OPERANDO
                          </div>
                        )}

                        {/* Crane ID Label */}
                        <span className={`text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded mb-0.5 leading-none shadow flex items-center gap-1 ${
                          isMax
                            ? 'bg-amber-400 text-slate-950 font-black ring-2 ring-amber-300/50'
                            : isSelected
                            ? 'bg-cyan-400 text-slate-950 font-bold'
                            : 'bg-cyan-950 text-cyan-300 border border-cyan-500/50'
                        }`}>
                          {stat.craneId}
                        </span>

                        {/* Realistic Quay Gantry Crane SVG with animated spreader */}
                        <svg
                          width="38"
                          height="44"
                          viewBox="0 0 40 48"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="drop-shadow-md"
                        >
                          {/* Top Boom girder */}
                          <rect
                            x="2"
                            y="8"
                            width="36"
                            height="3.5"
                            fill={isMax ? '#F59E0B' : isSelected ? '#38BDF8' : '#0EA5E9'}
                            rx="1"
                          />
                          {/* Stay Cables */}
                          <path
                            d="M4 8L20 1M36 8L20 1"
                            stroke={isMax ? '#F59E0B' : isSelected ? '#38BDF8' : '#0EA5E9'}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                          {/* Apex Pulley */}
                          <circle
                            cx="20"
                            cy="1"
                            r="1.8"
                            fill={isMax ? '#FBBF24' : '#E0F2FE'}
                          />
                          {/* Main Legs / Gantry Structural Frame */}
                          <path
                            d="M10 8L5 40M30 8L35 40"
                            stroke={isMax ? '#F59E0B' : isSelected ? '#38BDF8' : '#0EA5E9'}
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                          {/* Cross bracing */}
                          <line
                            x1="8"
                            y1="22"
                            x2="32"
                            y2="22"
                            stroke={isMax ? '#FBBF24' : '#38BDF8'}
                            strokeWidth="1"
                            strokeDasharray="2 1"
                          />
                          {/* Trolley Box */}
                          <rect x="17" y="10" width="6" height="3.5" fill="#FFFFFF" rx="0.5" />
                          
                          {/* Animated Hoist Line */}
                          <line
                            x1="20"
                            y1="13.5"
                            x2="20"
                            y2={isSelected ? '35' : '32'}
                            stroke={isSelected ? '#F59E0B' : '#F8FAFC'}
                            strokeWidth="1.2"
                            strokeDasharray={isSelected ? '2 1' : 'none'}
                          />

                          {/* Spreader holding Container */}
                          <rect
                            x="11"
                            y={isSelected ? '35' : '32'}
                            width="18"
                            height="3.5"
                            fill={isMax ? '#F59E0B' : isSelected ? '#38BDF8' : '#0284C7'}
                            stroke="#FFFFFF"
                            strokeWidth="0.6"
                            rx="0.5"
                          />
                        </svg>
                      </div>
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <span className="text-[8px] font-mono text-slate-600 font-bold">SIN GRÚA</span>
                      </div>
                    )}
                  </div>

                  {/* Bay Header Number & Total Movements Badge */}
                  <div className="mb-1 flex flex-col items-center gap-0.5 z-10">
                    <span className="text-[9px] font-mono font-bold text-amber-300 bg-amber-950/90 px-1.5 py-0.2 rounded border border-amber-500/40">
                      {stat.total} mov
                    </span>
                    <span className={`text-xs font-mono font-black px-2 py-0.5 rounded ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                        : 'text-slate-300 bg-slate-900/80 border border-slate-700'
                    }`}>
                      {stat.bayDisplay}
                    </span>
                  </div>

                  {/* STACK: CUBIERTA (DECK) */}
                  <div className="mb-1 z-10">
                    <div className={`w-12 h-11 rounded-t-lg flex flex-col items-center justify-center font-mono shadow-md transition-all ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 border-2 border-white'
                        : 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/60 group-hover:bg-emerald-900'
                    }`}>
                      <span className="text-[8px] font-bold uppercase tracking-wider opacity-80">CUB</span>
                      <span className="text-xs font-black leading-tight">{stat.deckCount}</span>
                    </div>
                  </div>

                  {/* STACK: BODEGA (HOLD) */}
                  <div className="mb-1 z-10">
                    <div className={`w-12 h-11 rounded-b-lg flex flex-col items-center justify-center font-mono shadow-md transition-all ${
                      isSelected
                        ? 'bg-blue-500 text-slate-950 border-2 border-white'
                        : 'bg-blue-950/90 text-blue-300 border border-blue-500/60 group-hover:bg-blue-900'
                    }`}>
                      <span className="text-[8px] font-bold uppercase tracking-wider opacity-80">BOD</span>
                      <span className="text-xs font-black leading-tight">{stat.holdCount}</span>
                    </div>
                  </div>

                  {/* STACK: RESTIBAS (RESTOW BADGE) */}
                  {stat.restowCount > 0 && (
                    <div className="z-10 mt-0.5">
                      <div className="w-11 h-5 rounded bg-rose-950 text-rose-300 border border-rose-500/60 flex items-center justify-center font-mono font-extrabold text-[10px]">
                        R:{stat.restowCount}
                      </div>
                    </div>
                  )}

                  {/* Downward Pointer Arrow for Selected Bay */}
                  {isSelected && (
                    <div className="absolute -bottom-7 text-amber-400 animate-bounce z-30">
                      <ArrowDown className="w-5 h-5" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Bow / Vessel Front Tip on Right */}
            <div className="w-12 h-20 bg-slate-800 border-r border-t border-slate-600 rounded-tr-full self-end mb-0 ml-2"></div>
          </div>

          {/* SHIP HULL & WATER GRAPHIC */}
          <div className="w-full h-8 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-t-2 border-slate-500 rounded-b-xl relative z-10 flex items-center justify-between px-6">
            <span className="text-[9px] font-mono text-slate-400 tracking-widest font-bold">POPA (STERN)</span>
            <div className="h-1.5 w-1/2 bg-red-700/80 rounded-full mx-auto flex items-center justify-center">
              <span className="text-[8px] font-mono text-white font-extrabold tracking-widest px-2 uppercase">LÍNEA DE FLOTACIÓN (WATERLINE)</span>
            </div>
            <span className="text-[9px] font-mono text-slate-400 tracking-widest font-bold">PROA (BOW)</span>
          </div>

          {/* Ocean Water Effect */}
          <div className="w-full h-4 bg-gradient-to-b from-blue-600/40 to-blue-900/60 mt-0 flex justify-around opacity-60">
            <span className="text-blue-300 text-xs font-bold">~ ~ ~ ~</span>
            <span className="text-blue-300 text-xs font-bold">~ ~ ~ ~</span>
            <span className="text-blue-300 text-xs font-bold">~ ~ ~ ~</span>
          </div>
        </div>
      </div>

      {/* ── SECTION 3: CUADRÍCULA DE ESTADO DEL BUQUE (VESSEL BAY MATRIX & GRID) ── */}
      {showVesselMatrixGrid && (
        <div className="bg-[#0B1A28] border border-cyan-500/40 rounded-xl overflow-hidden shadow-2xl p-4 md:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-cyan-950 text-cyan-300 border border-cyan-500/40 rounded-lg">
                <Grid className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-mono font-extrabold text-white tracking-wider uppercase">
                CUADRÍCULA DE ESTADO DEL BUQUE: BAHÍA {selectedBayStat.bayDisplay} ({selectedBayStat.craneId})
              </h3>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1 text-emerald-300">
                <span className="w-3 h-3 rounded bg-emerald-500 border border-white inline-block"></span> Cubierta (Deck)
              </span>
              <span className="flex items-center gap-1 text-blue-300">
                <span className="w-3 h-3 rounded bg-blue-600 border border-white inline-block"></span> Bodega (Hold)
              </span>
              <span className="flex items-center gap-1 text-rose-300">
                <span className="w-3 h-3 rounded bg-rose-500 border border-white inline-block"></span> Restiba (Restow)
              </span>
              <span className="flex items-center gap-1 text-slate-400">
                <span className="w-3 h-3 rounded bg-slate-950 border border-slate-700 inline-block"></span> Vacío
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* BAY MATRIX GRID SCHEMATIC (CUBIERTA & BODEGA TIERS) */}
            <div className="lg:col-span-3 bg-[#071320] border border-slate-800 rounded-xl p-4 overflow-x-auto">
              <div className="min-w-[600px] flex flex-col items-center">
                
                {/* DECK HEADER */}
                <div className="w-full bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 rounded px-3 py-1 text-xs font-mono font-bold flex items-center justify-between mb-2">
                  <span>CUBIERTA (DECK) - BAHÍA {selectedBayStat.bayDisplay}</span>
                  <span>{selectedBayStat.deckCount} CONTENEDORES</span>
                </div>

                {/* DECK TIERS GRID */}
                <div className="space-y-1 mb-4 w-full">
                  {deckTiers.map((tier) => (
                    <div key={`deck-${tier}`} className="flex items-center gap-1">
                      <span className="w-8 text-[10px] font-mono text-emerald-400 font-bold text-right pr-1">T{tier}</span>
                      <div className="flex-1 grid grid-cols-9 gap-1">
                        {gridRows.map((row) => {
                          const matchingCont = selectedBayContainers.find(c => c.tier === tier && c.row === row);
                          const isRestow = matchingCont?.isRestow || matchingCont?.operation === 'RESTOW';
                          return (
                            <div
                              key={`deck-${tier}-${row}`}
                              className={`h-7 rounded border text-[9px] font-mono font-bold flex flex-col items-center justify-center transition-all ${
                                matchingCont
                                  ? isRestow
                                    ? 'bg-rose-500/80 text-white border-rose-300 shadow'
                                    : 'bg-emerald-600 text-white border-emerald-300 shadow'
                                  : 'bg-slate-900/60 border-slate-800 text-slate-700'
                              }`}
                              title={matchingCont ? `${matchingCont.containerNumber || 'CONT'} (${matchingCont.isoCode || '45G1'})` : `Celda Libre (Tier ${tier}, Row ${row})`}
                            >
                              {matchingCont ? (
                                <>
                                  <span className="truncate w-full text-center px-0.5">{matchingCont.containerNumber?.slice(-4) || '20FT'}</span>
                                </>
                              ) : (
                                <span className="text-[8px] opacity-30">{row}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* HATCH COVERS DIVIDER */}
                <div className="w-full h-3 bg-gradient-to-r from-slate-700 via-amber-500/80 to-slate-700 rounded my-2 flex items-center justify-center border border-amber-400/40">
                  <span className="text-[8px] font-mono font-extrabold text-slate-950 tracking-widest uppercase">
                    TAPA DE BODEGA (HATCH COVERS)
                  </span>
                </div>

                {/* HOLD HEADER */}
                <div className="w-full bg-blue-950/60 text-blue-300 border border-blue-500/30 rounded px-3 py-1 text-xs font-mono font-bold flex items-center justify-between mb-2">
                  <span>BODEGA (HOLD) - BAHÍA {selectedBayStat.bayDisplay}</span>
                  <span>{selectedBayStat.holdCount} CONTENEDORES</span>
                </div>

                {/* HOLD TIERS GRID */}
                <div className="space-y-1 w-full">
                  {holdTiers.map((tier) => (
                    <div key={`hold-${tier}`} className="flex items-center gap-1">
                      <span className="w-8 text-[10px] font-mono text-blue-400 font-bold text-right pr-1">T{tier}</span>
                      <div className="flex-1 grid grid-cols-9 gap-1">
                        {gridRows.map((row) => {
                          const matchingCont = selectedBayContainers.find(c => c.tier === tier && c.row === row);
                          const isRestow = matchingCont?.isRestow || matchingCont?.operation === 'RESTOW';
                          return (
                            <div
                              key={`hold-${tier}-${row}`}
                              className={`h-7 rounded border text-[9px] font-mono font-bold flex flex-col items-center justify-center transition-all ${
                                matchingCont
                                  ? isRestow
                                    ? 'bg-rose-500/80 text-white border-rose-300 shadow'
                                    : 'bg-blue-600 text-white border-blue-300 shadow'
                                  : 'bg-slate-900/60 border-slate-800 text-slate-700'
                              }`}
                              title={matchingCont ? `${matchingCont.containerNumber || 'CONT'} (${matchingCont.isoCode || '22G1'})` : `Celda Libre (Tier ${tier}, Row ${row})`}
                            >
                              {matchingCont ? (
                                <>
                                  <span className="truncate w-full text-center px-0.5">{matchingCont.containerNumber?.slice(-4) || '40FT'}</span>
                                </>
                              ) : (
                                <span className="text-[8px] opacity-30">{row}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* ROW NUMBERS FOOTER */}
                <div className="flex items-center gap-1 mt-2 w-full">
                  <span className="w-8"></span>
                  <div className="flex-1 grid grid-cols-9 gap-1 text-center">
                    {gridRows.map(row => (
                      <span key={`row-foot-${row}`} className="text-[10px] font-mono font-bold text-slate-400">
                        R{row}
                      </span>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* CRANE PERFORMANCE & STATUS SUMMARY FOR THIS BAY */}
            <div className="bg-[#071320] border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                  <span className="text-xs font-mono font-extrabold text-amber-300 uppercase flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400" /> FICHA DE GRÚA
                  </span>
                  <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/40 font-bold">
                    {selectedBayStat.craneId}
                  </span>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase block">Rendimiento Estimado</span>
                    <span className="text-lg font-black text-white">30 - 35 Mov / Hora</span>
                    <span className="text-[10px] text-emerald-400 block mt-0.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Operación óptima
                    </span>
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase block">Tiempo Estimado en Bahía</span>
                    <span className="text-base font-bold text-cyan-300">
                      {Math.ceil(selectedBayStat.total / 30)} hr {Math.round(((selectedBayStat.total % 30) / 30) * 60)} min
                    </span>
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase block">Carga de Trabajo</span>
                    <div className="w-full h-2 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-amber-400 rounded-full"
                        style={{ width: `${Math.min(selectedBayStat.percentage * 8, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1 text-right">
                      {selectedBayStat.percentage.toFixed(1)}% de la carga total
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-2.5 bg-amber-500/10 border border-amber-500/40 rounded-lg text-[11px] font-mono text-amber-200">
                <strong>Sincronización:</strong> La grúa {selectedBayStat.craneId} secuencia la bahía {selectedBayStat.bayDisplay} coordinando primero la descarga sobre cubierta y posteriormente el izaje en bodega.
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── SECTION 4: BOTTOM THREE CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">

        {/* CARD 1: LEYENDA & INDICADORES */}
        <div className="bg-[#0B1A28] border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-xs font-mono font-extrabold text-cyan-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Sliders className="w-4 h-4" />
              LEYENDA Y GRÚAS POR BAHÍA
            </h3>
            <div className="space-y-2 font-mono text-xs">
              <div className="flex items-center gap-2.5 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <div className="w-4 h-4 rounded bg-cyan-600 border border-cyan-400 flex-shrink-0"></div>
                <span className="text-slate-200">
                  <strong className="text-cyan-300">GRÚA DE PÓRTICO (QC)</strong> = Asignación por bahía
                </span>
              </div>
              <div className="flex items-center gap-2.5 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <div className="w-4 h-4 rounded bg-blue-600 border border-blue-400 flex-shrink-0"></div>
                <span className="text-slate-200">
                  <strong className="text-blue-300">BODEGA (HOLD)</strong> = Movimientos bajo cubierta
                </span>
              </div>
              <div className="flex items-center gap-2.5 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <div className="w-4 h-4 rounded bg-emerald-600 border border-emerald-400 flex-shrink-0"></div>
                <span className="text-slate-200">
                  <strong className="text-emerald-300">CUBIERTA (DECK)</strong> = Movimientos sobre cubierta
                </span>
              </div>
              <div className="flex items-center gap-2.5 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <div className="w-4 h-4 rounded bg-rose-600 border border-rose-400 flex-shrink-0"></div>
                <span className="text-slate-200">
                  <strong className="text-rose-300">RESTIBAS (SHIFTING)</strong> = Movimientos de remoción
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-3">
            <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
              INDICADORES OPERATIVOS
            </h4>
            <ul className="space-y-2 font-mono text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <Anchor className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span><strong className="text-amber-300">Mano más larga:</strong> Determina la bahía de cuello de botella</span>
              </li>
              <li className="flex items-start gap-2">
                <Target className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span><strong className="text-cyan-300">Plan de grúas:</strong> Asignación directa por bahía y secuencia</span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span><strong className="text-emerald-300">Total movimientos:</strong> Suma de Bodega + Cubierta + Restibas</span>
              </li>
            </ul>
          </div>
        </div>

        {/* CARD 2: CENTER HIGHLIGHT - SELECTED BAY DETAIL */}
        <div className="bg-gradient-to-b from-[#0D2238] to-[#071524] border-2 border-amber-500 rounded-xl p-5 shadow-[0_0_30px_rgba(245,158,11,0.2)] flex flex-col justify-between text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 font-mono font-black text-[10px] px-3 py-1 rounded-bl-lg uppercase tracking-wider">
            DETALLE BAHÍA SELECCIONADA
          </div>

          <div>
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-cyan-950 border border-cyan-500/50 text-cyan-300 text-xs font-mono font-extrabold rounded">
                GRÚA: {selectedBayStat.craneId}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-mono font-black text-amber-300 tracking-wider mb-4">
              BAHÍA {selectedBayStat.bayDisplay}
            </h2>

            <div className="grid grid-cols-3 gap-2 mb-4 font-mono">
              <div className="bg-blue-950/80 border border-blue-500/50 rounded-lg p-2.5">
                <span className="text-[9px] text-blue-300 font-bold block uppercase">BODEGA</span>
                <span className="text-xl md:text-2xl font-black text-white">{selectedBayStat.holdCount}</span>
                <span className="text-[9px] text-blue-200 block mt-0.5">MOV.</span>
              </div>
              <div className="bg-emerald-950/80 border border-emerald-500/50 rounded-lg p-2.5">
                <span className="text-[9px] text-emerald-300 font-bold block uppercase">CUBIERTA</span>
                <span className="text-xl md:text-2xl font-black text-white">{selectedBayStat.deckCount}</span>
                <span className="text-[9px] text-emerald-200 block mt-0.5">MOV.</span>
              </div>
              <div className="bg-rose-950/80 border border-rose-500/50 rounded-lg p-2.5">
                <span className="text-[9px] text-rose-300 font-bold block uppercase">RESTIBAS</span>
                <span className="text-xl md:text-2xl font-black text-white">{selectedBayStat.restowCount}</span>
                <span className="text-[9px] text-rose-200 block mt-0.5">MOV.</span>
              </div>
            </div>
          </div>

          <div className="bg-amber-500/20 border border-amber-500/60 rounded-lg p-2.5">
            <span className="text-xs font-mono font-black text-amber-300 uppercase tracking-widest block">
              TOTAL: <strong className="text-white text-base md:text-lg">{selectedBayStat.total} MOVIMIENTOS</strong> ({selectedBayStat.percentage.toFixed(1)}% del buque)
            </span>
          </div>
        </div>

        {/* CARD 3: TOP 5 BAHÍAS CON MÁS MOVIMIENTOS */}
        <div className="bg-[#0B1A28] border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-mono font-extrabold text-cyan-400 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                TOP 5 BAHÍAS (CRANEMAX)
              </span>
              <span className="text-[10px] text-slate-400 font-normal">({localOperationMode})</span>
            </h3>

            <div className="space-y-2.5 font-mono">
              {top5Bays.map((b, idx) => {
                const rank = idx + 1;
                const isTop1 = rank === 1;
                const maxVal = top5Bays[0]?.total || 1;
                const fillPct = Math.round((b.total / maxVal) * 100);

                return (
                  <div
                    key={b.bayNumber}
                    onClick={() => setSelectedBayOverride(b.bayNumber)}
                    className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition-all"
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                      isTop1 ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {rank}
                    </span>

                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-bold text-slate-200">
                          Bahía {b.bayDisplay} <span className="text-[10px] text-cyan-400">({b.craneId})</span>
                        </span>
                        <span className="font-extrabold text-amber-300">{b.total} mov.</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isTop1 ? 'bg-amber-400' : 'bg-cyan-500'}`}
                          style={{ width: `${fillPct}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-3 text-[10px] font-mono text-slate-400 text-right">
            Incluye Bodega + Cubierta + Restibas
          </div>
        </div>

      </div>

      {/* ── FOOTER NOTE ── */}
      <div className="bg-[#071320] border border-slate-800 rounded-lg p-3 text-xs font-mono text-amber-300/90 flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0" />
        <span>
          <strong>NOTA:</strong> Cada bahía incluye el desglose exacto de movimientos en Bodega, Cubierta y Restibas, integrando la asignación dinámica de grúas de pórtico (QC) y la cuadrícula de estado del buque.
        </span>
      </div>

    </div>
  );
};

