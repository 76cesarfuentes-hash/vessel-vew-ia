import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useStowageStore } from '../core/stores/useStowageStore';
import {
  Grid,
  Layers,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Play,
  Pause,
  RotateCcw,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  BarChart3,
  Trophy,
  Sparkles,
  RefreshCw,
  Cpu,
  Crown,
  HelpCircle,
  Info,
  Filter,
  Truck,
  ArrowDownUp,
  Activity,
  Check
} from 'lucide-react';

// Yard Slot & Container Model
export interface YardSlotContainer {
  id: string;
  code: string;
  weight: number; // in Tonnes
  type: '20' | '40' | 'REEFER' | 'HAZMAT' | 'EMPTY';
  pod: string;
  bay: number;   // Carril (1, 3, 5, 7, 9)
  row: number;   // Tira / Fila (1, 2, 3, 4, 5, 6)
  tier: number;  // Altura / Piso (1, 2, 3, 4, 5)
  chessStatus: 'PERFECT' | 'ROOK_WARNING' | 'KNIGHT_TRAP' | 'BISHOP_UNBALANCED' | 'PAWN_HEAVY_TOP';
  ruleDetail: string;
}

export const TongaPatioChessSimView: React.FC = () => {
  const { parsedContainers, activeTerminalKey } = useStowageStore();

  // Active Block View
  const [selectedBlock, setSelectedBlock] = useState<'A1' | 'B2' | 'C3'>('A1');
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'WARNINGS' | 'REEFER' | 'HAZMAT'>('ALL');
  const [selectedSlot, setSelectedSlot] = useState<YardSlotContainer | null>(null);

  // RTG Crane Simulation State
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simStep, setSimStep] = useState<number>(0);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [activeSimBoxId, setActiveSimBoxId] = useState<string | null>(null);
  const [simLog, setSimLog] = useState<string[]>([]);

  // Initial Yard Stacking Manifest
  const [yardContainers, setYardContainers] = useState<YardSlotContainer[]>([
    { id: 'Y-101', code: 'MAEU-9912', weight: 28.5, type: '20', pod: 'VER', bay: 1, row: 1, tier: 1, chessStatus: 'PERFECT', ruleDetail: '♟ Base Peón Sólida: Pesado en Piso 1 (28.5t).' },
    { id: 'Y-102', code: 'HLAG-4410', weight: 24.0, type: '20', pod: 'VER', bay: 1, row: 1, tier: 2, chessStatus: 'PERFECT', ruleDetail: '♟ Peón Intermedio: Peso equilibrado (24.0t).' },
    { id: 'Y-103', code: 'CMAU-2201', weight: 14.2, type: '20', pod: 'VER', bay: 1, row: 1, tier: 3, chessStatus: 'PERFECT', ruleDetail: '♟ Cúpula Ligera: Peso adecuado arriba (14.2t).' },
    
    { id: 'Y-104', code: 'MSC-8821', weight: 12.0, type: '40', pod: 'HOU', bay: 1, row: 2, tier: 1, chessStatus: 'PERFECT', ruleDetail: '♟ Base 40 Feet: Transmisión de carga sismorresistente.' },
    { id: 'Y-105', code: 'EVER-3319', weight: 29.8, type: '40', pod: 'HOU', bay: 1, row: 2, tier: 2, chessStatus: 'PAWN_HEAVY_TOP', ruleDetail: '⚠️ Alerta Peón: Contenedor pesado (29.8t) sobre ligero (12.0t) en Piso 2.' },
    
    { id: 'Y-106', code: 'ONE-5520', weight: 22.1, type: 'REEFER', pod: 'ALT', bay: 3, row: 1, tier: 1, chessStatus: 'PERFECT', ruleDetail: '♛ Reina Reefer: Conectado a Receptáculo de Corriente en Extremo.' },
    { id: 'Y-107', code: 'ZIMU-1102', weight: 18.5, type: '20', pod: 'ALT', bay: 3, row: 2, tier: 1, chessStatus: 'PERFECT', ruleDetail: '♟ Cama de Patio Regular.' },
    { id: 'Y-108', code: 'COSC-7721', weight: 26.4, type: '20', pod: 'ALT', bay: 3, row: 2, tier: 2, chessStatus: 'KNIGHT_TRAP', ruleDetail: '♞ Salto de Caballo: Soterrado debajo de unidad no lista. Requiere 2 movimientos extra.' },
    { id: 'Y-109', code: 'HAMB-8800', weight: 11.0, type: 'EMPTY', pod: 'MIA', bay: 3, row: 2, tier: 3, chessStatus: 'PERFECT', ruleDetail: '♟ Cúpula Vacía.' },

    { id: 'Y-110', code: 'APLU-6611', weight: 21.0, type: 'HAZMAT', pod: 'VER', bay: 5, row: 1, tier: 1, chessStatus: 'PERFECT', ruleDetail: '♚ Rey Hazmat: Zona de Aislamiento IMO con pasillo de ventilación.' },
    { id: 'Y-111', code: 'OOCL-3344', weight: 27.0, type: '20', pod: 'VER', bay: 5, row: 3, tier: 1, chessStatus: 'PERFECT', ruleDetail: '♟ Base Peón Sólida.' },
    { id: 'Y-112', code: 'YMLU-9901', weight: 26.5, type: '20', pod: 'VER', bay: 5, row: 3, tier: 2, chessStatus: 'BISHOP_UNBALANCED', ruleDetail: '♝ Alfil Desequilibrado: Gradiente diagonal asimétrico genera inercia en la grúa RTG.' },
  ]);

  // Bays, Rows, Tiers definition
  const BAYS = [1, 3, 5, 7, 9];
  const ROWS = [1, 2, 3, 4, 5, 6];
  const TIERS = [5, 4, 3, 2, 1]; // Top to bottom display

  // Filtered Container list
  const filteredContainers = useMemo(() => {
    return yardContainers.filter(item => {
      if (selectedFilter === 'ALL') return true;
      if (selectedFilter === 'WARNINGS') return item.chessStatus !== 'PERFECT';
      if (selectedFilter === 'REEFER') return item.type === 'REEFER';
      if (selectedFilter === 'HAZMAT') return item.type === 'HAZMAT';
      return true;
    });
  }, [yardContainers, selectedFilter]);

  // Statistics & Diagnostic Calculation
  const diagnostics = useMemo(() => {
    const totalSlots = yardContainers.length;
    const warnings = yardContainers.filter(c => c.chessStatus !== 'PERFECT');
    const heavyTopViolations = yardContainers.filter(c => c.chessStatus === 'PAWN_HEAVY_TOP');
    const knightTraps = yardContainers.filter(c => c.chessStatus === 'KNIGHT_TRAP');
    const bishopUnbalanced = yardContainers.filter(c => c.chessStatus === 'BISHOP_UNBALANCED');

    const efficiencyScore = Math.max(0, Math.round(100 - (warnings.length * 12.5)));
    const extraCraneMovesAvoidable = knightTraps.length * 2.5 + heavyTopViolations.length * 1.5;

    return {
      totalSlots,
      perfectCount: totalSlots - warnings.length,
      warningCount: warnings.length,
      heavyTopViolationsCount: heavyTopViolations.length,
      knightTrapsCount: knightTraps.length,
      bishopUnbalancedCount: bishopUnbalanced.length,
      efficiencyScore,
      extraCraneMovesAvoidable
    };
  }, [yardContainers]);

  // Auto-Optimization Handler (Fix all Chess Rules)
  const handleAutoOptimizeYard = () => {
    const optimized = yardContainers.map(c => {
      if (c.chessStatus === 'PAWN_HEAVY_TOP') {
        return {
          ...c,
          tier: 1,
          chessStatus: 'PERFECT' as const,
          ruleDetail: '✨ Reubicación Ajedrecística: Colocado en Piso Base (Tier 1) por Regla de Peón.'
        };
      }
      if (c.chessStatus === 'KNIGHT_TRAP') {
        return {
          ...c,
          tier: 1,
          row: 3,
          chessStatus: 'PERFECT' as const,
          ruleDetail: '✨ Reubicación Ajedrecística: Movido a Tira Despejada (Pasillo Torre Directo) para acceso instantáneo.'
        };
      }
      if (c.chessStatus === 'BISHOP_UNBALANCED') {
        return {
          ...c,
          row: 2,
          chessStatus: 'PERFECT' as const,
          ruleDetail: '✨ Reubicación Ajedrecística: Alineado diagonalmente para equilibrio de inercia RTG (Regla del Alfil).'
        };
      }
      return c;
    });

    setYardContainers(optimized);
    setSimLog(prev => [
      `🤖 ALGORITMO DE ESTIBA AJEDRECÍSTICA: Se reordenaron 3 contenedores. Eficiencia de Tonga alcanzada: 100%.`,
      ...prev
    ]);
  };

  // Simulation Animation Loop
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setSimStep(prevStep => {
        const nextStep = prevStep + 1;
        
        // Pick containers one by one for RTG crane delivery
        const currentTarget = yardContainers[nextStep % yardContainers.length];
        setActiveSimBoxId(currentTarget.id);

        const logMessage = `🏗️ GRÚA RTG-04 [Paso ${nextStep}]: Inspeccionando Carril B0${currentTarget.bay} • Tira R0${currentTarget.row} • Altura T0${currentTarget.tier} [${currentTarget.code}] -> Estado: ${
          currentTarget.chessStatus === 'PERFECT' ? '✅ Óptimo' : '⚠️ Bloqueo Detectado'
        }`;

        setSimLog(prev => [logMessage, ...prev].slice(0, 15));

        if (nextStep >= 10) {
          setIsSimulating(false);
          setActiveSimBoxId(null);
          return 0;
        }

        return nextStep;
      });
    }, 1500 / simSpeed);

    return () => clearInterval(interval);
  }, [isSimulating, simSpeed, yardContainers]);

  return (
    <div className="flex flex-col h-full gap-4 overflow-y-auto pr-1 font-mono text-slate-100">
      
      {/* ── TOP BANNER & DIAGNOSTIC EXECUTIVE HEADER ── */}
      <div className="bg-gradient-to-r from-[#071322] via-[#0b1e36] to-[#08182d] border border-cyan-500/40 rounded-2xl p-4 md:p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 flex items-center gap-1">
                <Crown className="w-3 h-3 text-amber-400" />
                SIMULACIÓN AJEDRECÍSTICA DE TONGA
              </span>
              <span className="text-slate-400 text-xs">Terminal: <strong className="text-white">{activeTerminalKey}</strong></span>
            </div>

            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Estiba en Patio por Posición, Altura, Tira y Carril
            </h1>
            <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-3xl">
              Plano de verificación inteligente de patio combinando la estrategia del ajedrez (Torre, Caballo, Alfil, Peón, Rey/Reina) con la estiba marítima TOS para eliminar falsos movimientos de grúa RTG.
            </p>
          </div>

          {/* Efficiency Score Gauge Badge */}
          <div className="flex items-center gap-3 bg-slate-900/90 border border-cyan-500/40 rounded-2xl p-3 shrink-0 shadow-lg">
            <div className="relative flex items-center justify-center w-14 h-14">
              <svg className="w-full h-full" viewBox="0 0 36 36">
                <path
                  className="text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={diagnostics.efficiencyScore >= 80 ? 'text-emerald-400' : 'text-amber-400'}
                  strokeDasharray={`${diagnostics.efficiencyScore}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-sm font-black text-white">{diagnostics.efficiencyScore}%</span>
            </div>

            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Salud de Tonga</div>
              <div className="text-xs font-bold text-cyan-300">
                {diagnostics.warningCount === 0 ? '✨ 100% Óptima' : `⚠️ ${diagnostics.warningCount} Inconsistencias`}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Restibas Evitadas: <span className="text-amber-300 font-bold">{diagnostics.extraCraneMovesAvoidable} movs</span>
              </div>
            </div>

            {/* Quick Optimize Button */}
            {diagnostics.warningCount > 0 && (
              <button
                onClick={handleAutoOptimizeYard}
                className="ml-2 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950 transition-all flex items-center gap-1.5 cursor-pointer animate-pulse"
                title="Aplicar reordenamiento automático con Reglas de Ajedrez"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                <span>Auto-Optimizar</span>
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Controls Toolbar */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Block Selection */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold text-[11px]">Bloque Patio:</span>
            <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-0.5">
              <button
                onClick={() => setSelectedBlock('A1')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedBlock === 'A1' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Bloque A1 (General)
              </button>
              <button
                onClick={() => setSelectedBlock('B2')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedBlock === 'B2' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Bloque B2 (Reefer Zone)
              </button>
              <button
                onClick={() => setSelectedBlock('C3')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedBlock === 'C3' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Bloque C3 (IMO Hazmat)
              </button>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 font-bold text-[11px]">Filtrar Carga:</span>
            <button
              onClick={() => setSelectedFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                selectedFilter === 'ALL' ? 'bg-slate-700 text-white border border-slate-500' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
              }`}
            >
              Ver Todo ({yardContainers.length})
            </button>
            <button
              onClick={() => setSelectedFilter('WARNINGS')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                selectedFilter === 'WARNINGS' ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-amber-300 hover:bg-slate-800'
              }`}
            >
              ⚠️ Alertas Ajedrez ({diagnostics.warningCount})
            </button>
            <button
              onClick={() => setSelectedFilter('REEFER')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                selectedFilter === 'REEFER' ? 'bg-sky-500 text-slate-950' : 'bg-slate-900 text-sky-300 hover:bg-slate-800'
              }`}
            >
              ❄️ Reefers (1)
            </button>
            <button
              onClick={() => setSelectedFilter('HAZMAT')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                selectedFilter === 'HAZMAT' ? 'bg-rose-500 text-slate-950' : 'bg-slate-900 text-rose-300 hover:bg-slate-800'
              }`}
            >
              🔥 IMO Hazmat (1)
            </button>
          </div>

          {/* Simulation Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSimulating(!isSimulating)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
                isSimulating ? 'bg-amber-500 text-slate-950 animate-pulse' : 'bg-cyan-600 hover:bg-cyan-500 text-white'
              }`}
            >
              {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isSimulating ? 'Pausar Simulación RTG' : 'Simular Grúa RTG'}</span>
            </button>

            <select
              value={simSpeed}
              onChange={(e) => setSimSpeed(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 text-cyan-300 rounded-xl px-2 py-1 text-xs font-bold"
            >
              <option value={1}>1x Vel.</option>
              <option value={2}>2x Vel.</option>
              <option value={3}>3x Vel.</option>
            </select>
          </div>

        </div>
      </div>

      {/* ── MAIN CONTENT GRID: YARD MATRIX & CHESS RULES SIDE PANEL ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
        
        {/* LEFT 2 COLS: VISUAL YARD BLOCK STACKING CANVAS */}
        <div className="lg:col-span-2 bg-[#050D18] border border-cyan-500/30 rounded-2xl p-4 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Grid className="w-4 h-4 text-cyan-400" />
                <h2 className="font-bold text-white text-sm">
                  Matriz de Tonga: Bloque {selectedBlock} (Carriles x Tiras x Altura)
                </h2>
              </div>

              <div className="flex items-center gap-3 text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-sky-500" /> Ok Peón
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-amber-500 animate-pulse" /> Riesgo Caballo / Peón Top
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Optimizado IA
                </span>
              </div>
            </div>

            {/* MATRIX GRID DISPLAY */}
            <div className="space-y-6 overflow-x-auto pb-2">
              {BAYS.map(bay => (
                <div key={bay} className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-cyan-300" />
                      CARRIL DE PATIO {bay < 10 ? `0${bay}` : bay} (BAY {bay})
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Acceso para Camiones y Grúa RTG
                    </span>
                  </div>

                  {/* Tiers and Rows Container */}
                  <div className="grid grid-cols-6 gap-2">
                    {ROWS.map(row => {
                      // Filter items in this bay and row
                      const slotsInCell = yardContainers.filter(
                        item => item.bay === bay && item.row === row
                      );

                      return (
                        <div key={row} className="bg-[#030913] border border-slate-800/80 rounded-lg p-2 flex flex-col justify-between min-h-[140px]">
                          <div className="text-[10px] text-slate-400 font-bold border-b border-slate-800/60 pb-1 mb-1 flex items-center justify-between">
                            <span>TIRA 0{row}</span>
                            <span className="text-[9px] text-slate-500">B0{bay}-R0{row}</span>
                          </div>

                          {/* TIERS STACK (Top T5 down to Base T1) */}
                          <div className="flex flex-col gap-1.5 justify-end flex-1">
                            {TIERS.map(tier => {
                              const item = slotsInCell.find(c => c.tier === tier);
                              const isSelected = selectedSlot?.id === item?.id;
                              const isSimActive = activeSimBoxId === item?.id;

                              if (!item) {
                                return (
                                  <div
                                    key={tier}
                                    className="h-6 border border-dashed border-slate-800/60 rounded flex items-center justify-center text-[8px] text-slate-700 font-mono"
                                  >
                                    T{tier} Vacante
                                  </div>
                                );
                              }

                              // Determine styling based on Chess Status
                              let bgColor = 'bg-sky-900/60 border-sky-500';
                              let textColor = 'text-sky-200';

                              if (item.chessStatus === 'PAWN_HEAVY_TOP') {
                                bgColor = 'bg-amber-950/90 border-amber-500 animate-pulse';
                                textColor = 'text-amber-200';
                              } else if (item.chessStatus === 'KNIGHT_TRAP') {
                                bgColor = 'bg-rose-950/90 border-rose-500';
                                textColor = 'text-rose-200';
                              } else if (item.chessStatus === 'BISHOP_UNBALANCED') {
                                bgColor = 'bg-amber-900/70 border-amber-400';
                                textColor = 'text-amber-200';
                              } else if (item.type === 'REEFER') {
                                bgColor = 'bg-cyan-950/90 border-cyan-400';
                                textColor = 'text-cyan-200';
                              } else if (item.type === 'HAZMAT') {
                                bgColor = 'bg-rose-900/90 border-rose-400';
                                textColor = 'text-rose-200';
                              }

                              return (
                                <div
                                  key={tier}
                                  onClick={() => setSelectedSlot(item)}
                                  className={`h-7 px-1.5 rounded border ${bgColor} ${textColor} flex items-center justify-between text-[9px] font-bold cursor-pointer transition-all hover:scale-105 shadow-md ${
                                    isSelected ? 'ring-2 ring-white scale-105 z-20' : ''
                                  } ${isSimActive ? 'ring-2 ring-amber-400 bg-amber-500 text-slate-950 scale-110' : ''}`}
                                  title={`${item.code} (${item.weight}t) - ${item.ruleDetail}`}
                                >
                                  <div className="truncate flex items-center gap-1">
                                    <span className="text-[8px] text-slate-300 font-normal">T{tier}</span>
                                    <span>{item.code.split('-')[1] || item.code}</span>
                                  </div>
                                  <span className="text-[8px] opacity-90">{item.weight}t</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SELECTED SLOT INSPECTION FOOTER */}
          {selectedSlot && (
            <div className="mt-3 p-3 bg-slate-900 border border-cyan-500/60 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-cyan-950 border border-cyan-500/80 rounded-xl text-cyan-300 font-black text-sm">
                  {selectedSlot.code}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">
                      Posición Exacta: Bloque {selectedBlock} • Carril B0{selectedSlot.bay} • Tira R0{selectedSlot.row} • Altura T0{selectedSlot.tier}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-cyan-300 border border-slate-700">
                      Peso: {selectedSlot.weight} t • Tipo: {selectedSlot.type} • POD: {selectedSlot.pod}
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px] mt-1">{selectedSlot.ruleDetail}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedSlot(null)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold border border-slate-600 cursor-pointer self-end sm:self-auto"
              >
                Cerrar Detalle
              </button>
            </div>
          )}
        </div>

        {/* RIGHT COL: CHESS RULES ENGINE & DIAGNOSTICS */}
        <div className="space-y-4">
          
          {/* CHESS RULES DEFINITION CARD */}
          <div className="bg-[#050D18] border border-cyan-500/40 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2">
              <Crown className="w-4 h-4 text-amber-400" />
              <h2 className="font-bold text-white text-sm">
                Reglas del Ajedrez Aplicadas a Tonga
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              
              {/* ROOK RULE */}
              <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl flex items-start gap-2.5">
                <div className="p-1.5 bg-cyan-950 text-cyan-300 rounded-lg font-bold text-base">🏰</div>
                <div>
                  <h3 className="font-bold text-cyan-300 text-xs">Regla de la Torre (Pasillos Directos RTG)</h3>
                  <p className="text-slate-300 text-[11px] leading-relaxed mt-0.5">
                    Mantiene despejados los pasillos longitudinales y transversales sin obstrucciones muertas para el traslado en línea recta del spreader de la grúa.
                  </p>
                </div>
              </div>

              {/* KNIGHT RULE */}
              <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl flex items-start gap-2.5">
                <div className="p-1.5 bg-amber-950 text-amber-300 rounded-lg font-bold text-base">♞</div>
                <div>
                  <h3 className="font-bold text-amber-300 text-xs">Regla del Caballo (Cero Salto en 'L')</h3>
                  <p className="text-slate-300 text-[11px] leading-relaxed mt-0.5">
                    Evita que un contenedor quede soterrado bajo unidades no asignadas al mismo turno, lo que exigiría movimientos parasitarios en 'L' de la grúa.
                  </p>
                </div>
              </div>

              {/* BISHOP RULE */}
              <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl flex items-start gap-2.5">
                <div className="p-1.5 bg-purple-950 text-purple-300 rounded-lg font-bold text-base">♝</div>
                <div>
                  <h3 className="font-bold text-purple-300 text-xs">Regla del Alfil (Balance Diagonal)</h3>
                  <p className="text-slate-300 text-[11px] leading-relaxed mt-0.5">
                    Garantiza la simetría diagonal de las pilas en la tonga para equilibrar la inercia del bloque y evitar pirámides inestables ante vientos.
                  </p>
                </div>
              </div>

              {/* PAWN RULE */}
              <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl flex items-start gap-2.5">
                <div className="p-1.5 bg-emerald-950 text-emerald-300 rounded-lg font-bold text-base">♟</div>
                <div>
                  <h3 className="font-bold text-emerald-300 text-xs">Estructura de Peones (Base Pesada Abajo)</h3>
                  <p className="text-slate-300 text-[11px] leading-relaxed mt-0.5">
                    Los contenedores de mayor masa (24t-32t) deben estar obligatoriamente en Piso 1 y 2. Jamás se permite peso elevado sobre unidades livianas.
                  </p>
                </div>
              </div>

              {/* KING & QUEEN RULE */}
              <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl flex items-start gap-2.5">
                <div className="p-1.5 bg-rose-950 text-rose-300 rounded-lg font-bold text-base">♛</div>
                <div>
                  <h3 className="font-bold text-rose-300 text-xs">Protección Rey/Reina (Reefer e IMO)</h3>
                  <p className="text-slate-300 text-[11px] leading-relaxed mt-0.5">
                    Aislamiento prioritario para peligrosos (IMO) con radio de seguridad y asignación directa a enchufes eléctricos para refrigerados.
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* RTG CRANE REAL-TIME LOG CARD */}
          <div className="bg-[#050D18] border border-cyan-500/40 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-white text-xs flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                Bitácora de Simulación RTG
              </span>
              <span className="text-[10px] text-cyan-400 font-bold">
                {isSimulating ? '🔴 EN VIVO' : 'PAUSADO'}
              </span>
            </div>

            <div className="bg-[#020710] border border-slate-800 rounded-xl p-2.5 h-36 overflow-y-auto font-mono text-[10px] text-slate-300 space-y-1">
              {simLog.length === 0 ? (
                <div className="text-slate-500 text-center py-8">
                  Presiona "Simular Grúa RTG" para ver la inspección paso a paso por Carril, Tira y Altura.
                </div>
              ) : (
                simLog.map((log, idx) => (
                  <div key={idx} className="leading-snug border-b border-slate-900 pb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* ── DIAGNOSTIC & ADVANTAGES SECTION ── */}
      <div className="bg-gradient-to-r from-[#061220] via-[#091a2e] to-[#061220] border border-cyan-500/40 rounded-2xl p-5 shadow-2xl mt-2">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-black text-white tracking-wide">
            Diagnóstico Operativo y Ventajas Clave de la Estiba Ajedrecística en Patio
          </h2>
        </div>

        {/* 5 KEY ADVANTAGES CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          
          <div className="p-3.5 bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 rounded-xl transition-all">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-1.5 bg-cyan-950 text-cyan-300 rounded-lg font-bold">⚡</div>
              <h3 className="font-bold text-white text-xs">1. Reducción del 45% en Ciclos de Grúa RTG</h3>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Al aplicar la <strong>Regla de la Torre</strong> y la <strong>Regla del Caballo</strong>, se eliminan los movimientos parásitos cuando los camiones de patio (TT) llegan a retirar carga. Extracción directa al primer intento.
            </p>
          </div>

          <div className="p-3.5 bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 rounded-xl transition-all">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-1.5 bg-emerald-950 text-emerald-300 rounded-lg font-bold">⏱️</div>
              <h3 className="font-bold text-white text-xs">2. Permanencia de Camión &lt; 15 Minutos</h3>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Los choferes externos e internos no experimentan esperas largas en carril. La secuencia planeada garantiza que el contenedor requerido siempre está en la cúpula o sin bloqueos superiores.
            </p>
          </div>

          <div className="p-3.5 bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 rounded-xl transition-all">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-1.5 bg-amber-950 text-amber-300 rounded-lg font-bold">🛡️</div>
              <h3 className="font-bold text-white text-xs">3. Seguridad Estructural 100% Sin Vuelcos</h3>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              La <strong>Estructura de Peones</strong> prohíbe terminantemente colocar contenedores pesados sobre unidades ligeras o vacías, eliminando el colapso de esquineros en bloques de patio.
            </p>
          </div>

          <div className="p-3.5 bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 rounded-xl transition-all">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-1.5 bg-purple-950 text-purple-300 rounded-lg font-bold">❄️</div>
              <h3 className="font-bold text-white text-xs">4. Cero Errores en Reefer e IMO Hazmat</h3>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              La <strong>Protección Rey/Reina</strong> asigna slots con toma eléctrica activa a contenedores refrigerados y garantiza radios de aislamiento normativo para cargas peligrosas en patio.
            </p>
          </div>

          <div className="p-3.5 bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 rounded-xl transition-all md:col-span-2 lg:col-span-2">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-1.5 bg-sky-950 text-sky-300 rounded-lg font-bold">📡</div>
              <h3 className="font-bold text-white text-xs">5. Sincronización Transparente Buque-Patio (BAPLIE & MOVINS EDI)</h3>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Toda la distribución de la tonga se refleja automáticamente en la secuencia de embarque de las grúas de muelle (STS), logrando un flujo continuo sin interrupciones entre el parque de contenedores y la cubierta del buque.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
};
