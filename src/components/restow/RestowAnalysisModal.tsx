import React, { useState, useMemo } from 'react';
import { Container } from '../../core/models/container';
import {
  detectRestows,
  analyzeWeightStowage,
  RestowItem,
  WeightViolationItem
} from '../../core/business/restowEngine';
import {
  exportRestowsToExcel,
  exportWeightStowageToExcel
} from '../../core/services/exportService';
import {
  X,
  RefreshCw,
  Scale,
  FileSpreadsheet,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Anchor,
  Box,
  Layers,
  Search,
  ShieldAlert,
  ArrowDownCircle,
  Download
} from 'lucide-react';

interface RestowAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  containers: Container[];
  activeTerminalKey: string;
}

export const RestowAnalysisModal: React.FC<RestowAnalysisModalProps> = ({
  isOpen,
  onClose,
  containers,
  activeTerminalKey
}) => {
  const [activeTab, setActiveTab] = useState<'RESTOWS' | 'WEIGHT'>('RESTOWS');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<'ALL' | 'STACK' | 'HATCH'>('ALL');

  // Compute restows and weight violations
  const restowItems = useMemo(() => {
    return detectRestows(containers, activeTerminalKey);
  }, [containers, activeTerminalKey]);

  const weightViolations = useMemo(() => {
    return analyzeWeightStowage(containers);
  }, [containers]);

  if (!isOpen) return null;

  // Filtered restow items
  const filteredRestows = restowItems.filter(r => {
    if (filterType === 'STACK' && r.restowType !== 'STACK_BLOCK') return false;
    if (filterType === 'HATCH' && r.restowType !== 'HATCH_BLOCK') return false;

    if (searchTerm.trim() !== '') {
      const q = searchTerm.toUpperCase();
      return (
        r.container.id.toUpperCase().includes(q) ||
        r.container.position.toUpperCase().includes(q) ||
        r.container.pod.toUpperCase().includes(q) ||
        r.blockedContainerId.toUpperCase().includes(q)
      );
    }
    return true;
  });

  // Filtered weight violations
  const filteredWeightViolations = weightViolations.filter(v => {
    if (searchTerm.trim() !== '') {
      const q = searchTerm.toUpperCase();
      return (
        v.topContainer.id.toUpperCase().includes(q) ||
        v.bottomContainer.id.toUpperCase().includes(q) ||
        v.bay.includes(q) ||
        v.row.includes(q)
      );
    }
    return true;
  });

  const stackBlockCount = restowItems.filter(r => r.restowType === 'STACK_BLOCK').length;
  const hatchBlockCount = restowItems.filter(r => r.restowType === 'HATCH_BLOCK').length;

  const criticalWeightCount = weightViolations.filter(v => v.severity === 'CRÍTICO').length;

  // Handlers for exporting to Excel
  const handleExportRestowsExcel = () => {
    exportRestowsToExcel(restowItems, `Reporte_Restibas_${activeTerminalKey}`);
  };

  const handleExportWeightExcel = () => {
    exportWeightStowageToExcel(weightViolations, `Reporte_Malla_Pesos_${activeTerminalKey}`);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#071322] border border-[#162C46] rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden">
        
        {/* ── MODAL HEADER ── */}
        <div className="bg-[#0B1A2C] border-b border-[#162C46] px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-mono text-base font-black tracking-wider text-white flex items-center gap-2">
                AUDITORÍA DE RESTIBAS Y REGLAS DE BUENA ESTIBA
              </h2>
              <p className="text-xs font-mono text-cyan-400">
                Terminal Activa: <span className="text-white font-bold">{activeTerminalKey}</span> · Reglas Operativas de Estiba y Remoción
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#0E233B] hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── NAVIGATION TABS & ACTION TOOLBAR ── */}
        <div className="bg-[#081729] border-b border-[#162C46] px-6 py-3 flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
          
          {/* Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('RESTOWS')}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'RESTOWS'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                  : 'bg-[#0E233B] text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              <RefreshCw className="w-4 h-4 text-amber-400" />
              DETECCIÓN DE RESTIBAS ({restowItems.length})
            </button>

            <button
              onClick={() => setActiveTab('WEIGHT')}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'WEIGHT'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                  : 'bg-[#0E233B] text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              <Scale className="w-4 h-4 text-cyan-400" />
              MALLA DE PESOS / BUENA ESTIBA ({weightViolations.length})
            </button>
          </div>

          {/* Search & Export Controls */}
          <div className="flex items-center gap-3">
            <div className="relative w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar contenedor..."
                className="w-full pl-9 pr-3 py-1.5 bg-[#030A16] border border-[#162C46] rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {activeTab === 'RESTOWS' ? (
              <button
                onClick={handleExportRestowsExcel}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs py-1.5 px-3.5 rounded-lg border border-emerald-400 shadow transition-all flex items-center gap-2 cursor-pointer"
                title="Generar archivo Excel con todas las unidades de restiba y columnas requeridas"
              >
                <FileSpreadsheet className="w-4 h-4" /> EXCEL RESTIBAS
              </button>
            ) : (
              <button
                onClick={handleExportWeightExcel}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs py-1.5 px-3.5 rounded-lg border border-cyan-400 shadow transition-all flex items-center gap-2 cursor-pointer"
                title="Generar archivo Excel con el análisis de distribución de pesos"
              >
                <FileSpreadsheet className="w-4 h-4" /> EXCEL MALLA PESOS
              </button>
            )}
          </div>
        </div>

        {/* ── MODAL BODY CONTENT ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#040C18]">
          
          {/* TAB 1: RESTOW ANALYSIS */}
          {activeTab === 'RESTOWS' && (
            <div className="space-y-5">
              
              {/* Summary Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                <div className="bg-[#08192C] border border-amber-500/30 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 font-bold block">TOTAL RESTIBAS (SHIFTINGS)</span>
                    <span className="text-2xl font-black text-amber-400">{restowItems.length}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Unidades a remover/re-estibar</span>
                  </div>
                  <RefreshCw className="w-8 h-8 text-amber-400/40" />
                </div>

                <div className="bg-[#08192C] border border-[#162C46] rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 font-bold block">BLOQUEOS DIRECTOS (STACK)</span>
                    <span className="text-2xl font-black text-white">{stackBlockCount}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Unidades sobrepuestas en mismo stack</span>
                  </div>
                  <Layers className="w-8 h-8 text-cyan-400/40" />
                </div>

                <div className="bg-[#08192C] border border-[#162C46] rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 font-bold block">BLOQUEOS POR ESCOTILLA</span>
                    <span className="text-2xl font-black text-white">{hatchBlockCount}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Unidades en cubierta sobre bodega</span>
                  </div>
                  <Box className="w-8 h-8 text-blue-400/40" />
                </div>
              </div>

              {/* Sub-Filter Controls for Restows */}
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-slate-400 font-bold">Filtrar por tipo:</span>
                <button
                  onClick={() => setFilterType('ALL')}
                  className={`px-2.5 py-1 rounded border ${
                    filterType === 'ALL'
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-500 font-bold'
                      : 'bg-[#081729] text-slate-400 border-[#162C46] hover:text-white'
                  }`}
                >
                  TODAS ({restowItems.length})
                </button>
                <button
                  onClick={() => setFilterType('STACK')}
                  className={`px-2.5 py-1 rounded border ${
                    filterType === 'STACK'
                      ? 'bg-amber-950 text-amber-300 border-amber-500 font-bold'
                      : 'bg-[#081729] text-slate-400 border-[#162C46] hover:text-white'
                  }`}
                >
                  EN STACK ({stackBlockCount})
                </button>
                <button
                  onClick={() => setFilterType('HATCH')}
                  className={`px-2.5 py-1 rounded border ${
                    filterType === 'HATCH'
                      ? 'bg-blue-950 text-blue-300 border-blue-500 font-bold'
                      : 'bg-[#081729] text-slate-400 border-[#162C46] hover:text-white'
                  }`}
                >
                  POR ESCOTILLA ({hatchBlockCount})
                </button>
              </div>

              {/* Restows Data Table */}
              <div className="bg-[#071322] border border-[#162C46] rounded-xl overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead className="bg-[#0B1A2C] text-slate-400 text-[10px] uppercase font-bold border-b border-[#162C46]">
                      <tr>
                        <th className="p-3">CONTENEDOR</th>
                        <th className="p-3">POSICIÓN</th>
                        <th className="p-3">ISO</th>
                        <th className="p-3">POD</th>
                        <th className="p-3">PESO</th>
                        <th className="p-3">IMO</th>
                        <th className="p-3">OS</th>
                        <th className="p-3">RF / TEMP</th>
                        <th className="p-3">STATUS</th>
                        <th className="p-3">TIPO CARGA</th>
                        <th className="p-3">TIPO RESTIBA</th>
                        <th className="p-3">UNIDAD BLOQUEADA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#12253B] text-slate-200">
                      {filteredRestows.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="p-8 text-center text-slate-500">
                            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400 opacity-60" />
                            No se detectaron unidades de restiba con los criterios seleccionados.
                          </td>
                        </tr>
                      ) : (
                        filteredRestows.map((r, idx) => {
                          const c = r.container;
                          const isDg = c.cargoType === 'DG' || (c.imoClass && c.imoClass !== 'Dato no disponible' && c.imoClass !== '-');
                          const isRf = c.cargoType === 'RF' || (c.temp && c.temp !== 'DRY' && c.temp !== 'Dato no disponible');
                          const isOs = c.cargoType === 'OS' || c.hasDim || !!c.oogDim;
                          const tempVal = (c.temp && c.temp !== 'Dato no disponible' && c.temp.trim() !== '') ? c.temp : 'DRY';

                          return (
                            <tr key={`${r.id}_${idx}`} className="hover:bg-[#0A1E34] transition-colors">
                              <td className="p-3 font-black text-cyan-300">{c.id}</td>
                              <td className="p-3 font-bold">{c.position}</td>
                              <td className="p-3 text-slate-300">{c.iso}</td>
                              <td className="p-3 font-bold text-slate-200">{c.pod}</td>
                              <td className="p-3 text-slate-300">
                                {c.weight && c.weight !== 'Dato no disponible' ? `${c.weight} KG` : 'N/A'}
                              </td>
                              <td className="p-3">
                                {isDg ? (
                                  <span className="px-1.5 py-0.5 bg-red-950 text-red-400 border border-red-800 rounded text-[10px] font-bold">
                                    ☠ IMO {c.imoClass}
                                  </span>
                                ) : (
                                  <span className="text-slate-500">-</span>
                                )}
                              </td>
                              <td className="p-3">
                                {isOs ? (
                                  <span className="px-1.5 py-0.5 bg-amber-950 text-amber-400 border border-amber-800 rounded text-[10px] font-bold">
                                    ➔ OS
                                  </span>
                                ) : (
                                  <span className="text-slate-500">NO</span>
                                )}
                              </td>
                              <td className="p-3">
                                {isRf ? (
                                  <span className="px-1.5 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded text-[10px] font-bold">
                                    ❄ {tempVal}
                                  </span>
                                ) : (
                                  <span className="text-slate-500">DRY</span>
                                )}
                              </td>
                              <td className="p-3">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  c.status === 'EMPTY' || c.cargoType === 'MT'
                                    ? 'bg-slate-800 text-slate-400'
                                    : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                }`}>
                                  {c.status === 'EMPTY' || c.cargoType === 'MT' ? 'EMPTY' : 'FULL'}
                                </span>
                              </td>
                              <td className="p-3 font-bold text-slate-300">{c.cargoType || 'DC'}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                                  r.restowType === 'STACK_BLOCK'
                                    ? 'bg-amber-950/80 text-amber-400 border-amber-700'
                                    : 'bg-blue-950/80 text-blue-400 border-blue-700'
                                }`}>
                                  {r.restowTypeLabel}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="text-[11px] font-bold text-amber-300">
                                  {r.blockedContainerId}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  Pos: {r.blockedContainerPos} | POD: {r.blockedContainerPod}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WEIGHT STOWAGE RULES */}
          {activeTab === 'WEIGHT' && (
            <div className="space-y-5 font-mono">
              
              {/* Guidance Banner */}
              <div className="bg-[#091D33] border border-cyan-500/30 rounded-xl p-4 flex items-start gap-3">
                <ShieldAlert className="w-6 h-6 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-cyan-300 block text-sm">
                    PRINCIPIO MARÍTIMO DE BUENA ESTIBA (DISTRIBUCIÓN DE PESOS)
                  </span>
                  <p className="text-slate-300 mt-1 leading-relaxed">
                    &quot;Los contenedores <strong>PESADOS</strong> deben ubicarse en las partes inferiores (bodega/primeros niveles de cubierta), los <strong>MEDIANOS</strong> al medio y los <strong>LIGEROS O VACÍOS</strong> en la parte superior.&quot; Esto garantiza la altura metacentrica (GM) óptima del buque, previene colapsos estructurales de trincado y optimiza la estabilidad operacional.
                  </p>
                </div>
              </div>

              {/* Weight Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-[#08192C] border border-[#162C46] rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 font-bold block">OBSERVACIONES DE PESO</span>
                    <span className="text-2xl font-black text-cyan-400">{weightViolations.length}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Inversiones de peso en stack</span>
                  </div>
                  <Scale className="w-8 h-8 text-cyan-400/40" />
                </div>

                <div className="bg-[#08192C] border border-red-500/30 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 font-bold block">INVERSIONES CRÍTICAS</span>
                    <span className="text-2xl font-black text-red-400">{criticalWeightCount}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Pesado sobre Ligero/Vacío</span>
                  </div>
                  <AlertCircle className="w-8 h-8 text-red-400/40" />
                </div>

                <div className="bg-[#08192C] border border-[#162C46] rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 font-bold block">CLASIFICACIÓN DE PESOS</span>
                    <span className="text-[10px] text-slate-300 block mt-1">
                      • <strong>PESADO:</strong> ≥ 18.0 Toneladas<br />
                      • <strong>MEDIANO:</strong> 10.0 - 18.0 Toneladas<br />
                      • <strong>LIGERO/VACÍO:</strong> &lt; 10.0 Toneladas
                    </span>
                  </div>
                </div>
              </div>

              {/* Weight Violations Table */}
              <div className="bg-[#071322] border border-[#162C46] rounded-xl overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0B1A2C] text-slate-400 text-[10px] uppercase font-bold border-b border-[#162C46]">
                      <tr>
                        <th className="p-3">GRAVEDAD</th>
                        <th className="p-3">BAHÍA/FILA</th>
                        <th className="p-3">CONTENEDOR SUPERIOR (ARRIBA)</th>
                        <th className="p-3">PESO ARRIBA</th>
                        <th className="p-3">CONTENEDOR INFERIOR (ABAJO)</th>
                        <th className="p-3">PESO ABAJO</th>
                        <th className="p-3">DIAGNOSTICO ESTIBA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#12253B] text-slate-200">
                      {filteredWeightViolations.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-500">
                            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400 opacity-60" />
                            Excelente estiba. No se detectaron inversiones de peso en las pilas.
                          </td>
                        </tr>
                      ) : (
                        filteredWeightViolations.map((v, idx) => (
                          <tr key={`${v.id}_${idx}`} className="hover:bg-[#0A1E34] transition-colors">
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                                v.severity === 'CRÍTICO'
                                  ? 'bg-red-950 text-red-400 border-red-800 animate-pulse'
                                  : 'bg-amber-950 text-amber-400 border-amber-800'
                              }`}>
                                {v.severity}
                              </span>
                            </td>
                            <td className="p-3 font-bold text-cyan-300">
                              BAY {v.bay} / ROW {v.row}
                            </td>
                            <td className="p-3">
                              <div className="font-bold text-white">{v.topContainer.id}</div>
                              <div className="text-[10px] text-slate-400">Nivel {v.topTier} | {v.topCategory}</div>
                            </td>
                            <td className="p-3 font-bold text-red-400">
                              {(v.topWeightKg / 1000).toFixed(1)} MT
                            </td>
                            <td className="p-3">
                              <div className="font-bold text-white">{v.bottomContainer.id}</div>
                              <div className="text-[10px] text-slate-400">Nivel {v.bottomTier} | {v.bottomCategory}</div>
                            </td>
                            <td className="p-3 font-bold text-emerald-400">
                              {(v.bottomWeightKg / 1000).toFixed(1)} MT
                            </td>
                            <td className="p-3 text-[11px] text-slate-300 max-w-xs">
                              {v.description}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ── FOOTER BAR ── */}
        <div className="bg-[#0B1A2C] border-t border-[#162C46] px-6 py-3 flex items-center justify-between text-xs font-mono text-slate-400 flex-shrink-0">
          <div>
            Mostrando <strong className="text-white">{activeTab === 'RESTOWS' ? filteredRestows.length : filteredWeightViolations.length}</strong> registros
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#0E233B] hover:bg-slate-700 text-slate-200 rounded-lg border border-[#1C3654] font-bold transition-all cursor-pointer"
          >
            Cerrar AUDITORÍA
          </button>
        </div>

      </div>
    </div>
  );
};
