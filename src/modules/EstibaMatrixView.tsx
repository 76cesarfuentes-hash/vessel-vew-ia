import React, { useState } from 'react';
import { useStowageStore } from '../core/stores/useStowageStore';
import { DynamicVesselHeader } from '../components/vessel/DynamicVesselHeader';
import { SimultaneousCrossSectionMatrix } from '../components/bay/SimultaneousCrossSectionMatrix';
import { getContainerColor } from '../core/business/colorEngine';
import { validateBaplie } from '../core/business/validationEngine';
import { ShippingLineLegendPanel } from '../components/container/ShippingLineLegendPanel';
import { Grid, AlertOctagon, Scale, Layers, HelpCircle } from 'lucide-react';

export const EstibaMatrixView: React.FC = () => {
  const [isLegendOpen, setIsLegendOpen] = useState<boolean>(false);

  const {
    filteredContainers,
    parsedContainers,
    uniqueBays,
    activeTerminalKey,
    activeTerminal,
    activeSelectedBay,
    currentViewMode,
    baplieHeader,
    fileName,
    setSelectedBay,
    setViewMode,
    setSelectedContainer,
    validateStackingRules
  } = useStowageStore();

  const validationReport = parsedContainers.length > 0 ? validateBaplie(parsedContainers) : null;
  const stackingViolations = validateStackingRules ? validateStackingRules(parsedContainers) : [];

  // Generate Section Bay list (Even 40' bays representing combined 20'/40' section)
  // E.g. Bay 02 covers 01, 02, 03; Bay 06 covers 05, 06, 07; etc.
  const sectionBayNumbers = Array.from(
    new Set(
      uniqueBays.map(b => {
        const num = parseInt(b, 10);
        if (isNaN(num)) return 2;
        if (num % 2 !== 0) {
          return (num % 4 === 1) ? num + 1 : num - 1;
        }
        return num;
      }).filter(n => n > 0)
    )
  ).sort((a: number, b: number) => a - b);

  const sectionBayStrings = sectionBayNumbers.length > 0
    ? sectionBayNumbers.map(n => n.toString().padStart(2, '0'))
    : ['02', '06', '10', '14', '18', '22'];

  const currentSectionBay = activeSelectedBay
    ? (parseInt(activeSelectedBay, 10) % 2 !== 0
        ? (parseInt(activeSelectedBay, 10) % 4 === 1
            ? (parseInt(activeSelectedBay, 10) + 1).toString().padStart(2, '0')
            : (parseInt(activeSelectedBay, 10) - 1).toString().padStart(2, '0'))
        : activeSelectedBay)
    : sectionBayStrings[0];

  // Unique PODs in filtered containers
  const uniquePods = Array.from(new Set(filteredContainers.map(c => c.pod))).filter(p => p && p !== 'Dato no disponible').sort();

  // Stats for current active section bay
  const sectionContainers = filteredContainers.filter(c => {
    const cBay = (c.bay || '').padStart(2, '0');
    const sNum = parseInt(currentSectionBay, 10);
    const fore = (sNum - 1).toString().padStart(2, '0');
    const aft = (sNum + 1).toString().padStart(2, '0');
    return cBay === currentSectionBay || cBay === fore || cBay === aft;
  });

  const sectionStats = {
    total: sectionContainers.length,
    c20: sectionContainers.filter(c => c.size === 20).length,
    c40: sectionContainers.filter(c => c.size === 40 || c.size === 45).length,
    rf: sectionContainers.filter(c => c.cargoType === 'RF').length,
    dg: sectionContainers.filter(c => c.cargoType === 'DG').length,
    weightTons: Math.round(sectionContainers.reduce((acc, c) => acc + (parseFloat(c.weight) || 0), 0) / 1000)
  };

  return (
    <div className="flex flex-col h-full gap-3 overflow-hidden pr-1">
      {/* ── TOP DYNAMIC CONTAINER SHIP HEADER ── */}
      <DynamicVesselHeader
        baplieHeader={baplieHeader}
        containers={parsedContainers}
        activeTerminalKey={activeTerminalKey}
        fileName={fileName}
      />

      {/* ── VISUAL STACKING RULE WARNING BANNER ── */}
      {stackingViolations.length > 0 && (
        <div className="bg-red-950/80 border border-red-500/80 rounded-xl p-3 text-red-200 font-mono text-xs flex flex-col gap-1.5 shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2 font-bold text-red-300">
            <AlertOctagon className="w-4 h-4 text-red-400 animate-pulse flex-shrink-0" />
            <span>¡ALERTA CRÍTICA DE ESTIBA! ({stackingViolations.length} {stackingViolations.length === 1 ? 'VIOLACIÓN' : 'VIOLACIONES'} DE CAMA DETECTADAS)</span>
          </div>
          {stackingViolations.map((v, idx) => (
            <div key={idx} className="pl-6 text-[11px] text-red-200/90 leading-snug">
              • {v.message}
            </div>
          ))}
        </div>
      )}

      {/* Main Operational Workspace */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0 overflow-hidden">
        
        {/* Left Sidebar: Unified Bay Section Selector & Dynamic POD Legend */}
        <div className="lg:w-64 flex flex-col gap-3 flex-shrink-0">
          
          {/* Unified Bay Section Selector (20' & 40' Simultaneous) */}
          <div className="bg-[#0B1726] border border-cyan-500/30 rounded-xl p-3 shadow-lg">
            <h3 className="font-mono text-xs font-bold text-slate-300 uppercase border-b border-slate-800 pb-2 mb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <Grid className="w-3.5 h-3.5" /> SECCIONES DE BAHÍA
              </span>
              <span className="text-[9px] bg-purple-950 text-purple-300 px-1.5 py-0.5 rounded border border-purple-800">
                20' + 40'
              </span>
            </h3>

            <p className="text-[9.5px] font-mono text-slate-400 mb-2">
              Seleccione una bahía para ver <strong className="text-purple-300">40' sobre 20'</strong> en tiempo real:
            </p>

            {/* Grid of Unified Bay Buttons */}
            <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
              {sectionBayStrings.map(bStr => {
                const bNum = parseInt(bStr, 10);
                const foreStr = (bNum - 1).toString().padStart(2, '0');
                const aftStr = (bNum + 1).toString().padStart(2, '0');

                // Count containers in this section
                const countInSec = filteredContainers.filter(c => {
                  const cBay = (c.bay || '').padStart(2, '0');
                  return cBay === bStr || cBay === foreStr || cBay === aftStr;
                }).length;

                const isActive = currentSectionBay === bStr;

                return (
                  <button
                    key={bStr}
                    onClick={() => setSelectedBay(bStr)}
                    className={`p-2 text-left font-mono rounded-lg transition-all cursor-pointer border flex flex-col justify-between ${
                      isActive
                        ? 'bg-gradient-to-br from-cyan-500/20 via-slate-900 to-purple-500/20 text-white border-cyan-400 shadow-[0_0_12px_rgba(0,229,255,0.3)] ring-1 ring-cyan-400'
                        : 'bg-[#122234] text-slate-300 border-slate-800 hover:border-cyan-500/60 hover:bg-[#182D46]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-cyan-300">
                        BAHÍA {bStr}
                      </span>
                      {countInSec > 0 && (
                        <span className="text-[8.5px] font-bold px-1 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                          {countInSec}U
                        </span>
                      )}
                    </div>
                    <span className="text-[8px] text-slate-400 mt-1 block">
                      20': {foreStr}-{aftStr} | 40': {bStr}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic POD Legend */}
          <div className="bg-[#0B1726] border border-slate-800 rounded-xl p-3 shadow-lg flex-1 flex flex-col min-h-[200px] overflow-hidden">
            <h3 className="font-mono text-xs font-bold text-slate-400 uppercase border-b border-slate-800 pb-2 mb-2 flex items-center justify-between">
              <span>PUERTOS DESTINO (POD)</span>
              <span className="text-[10px] text-cyan-400 font-mono font-bold">{uniquePods.length}</span>
            </h3>

            <div className="space-y-1.5 overflow-y-auto pr-1 flex-1 text-xs font-mono">
              {uniquePods.map((pod: string) => {
                const color = getContainerColor(pod, activeTerminalKey);
                const isImport = activeTerminal.homePorts.some(hp => hp.toUpperCase() === pod.toUpperCase()) ||
                                 activeTerminalKey.toUpperCase() === pod.toUpperCase();

                const countForPod = filteredContainers.filter(c => c.pod === pod).length;

                return (
                  <div key={pod} className="flex items-center justify-between p-2 rounded-lg bg-[#122234]/70 border border-slate-800 hover:border-slate-700 transition-all">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-3.5 h-3.5 rounded-xs border border-black/50 shadow-xs flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="font-bold text-slate-200 truncate">{pod}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[9.5px] font-extrabold text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800">
                        {countForPod} U
                      </span>
                      <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded ${
                        isImport ? 'bg-orange-950 text-orange-400 border border-orange-800' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {isImport ? 'IMP' : 'EXP'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Main Workspace Area: Simultaneous Cross-Section Matrix */}
        <div className="flex-1 bg-[#0B1726] border border-cyan-500/30 rounded-xl p-3.5 shadow-xl flex flex-col min-w-0 overflow-hidden">
          
          {/* Top Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2.5 mb-2.5">
            <div className="flex items-center gap-3">
              <h2 className="font-mono text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>VISTA TRANSVERSAL INTELIGENTE:</span>
                <span className="bg-gradient-to-r from-purple-950 to-cyan-950 text-cyan-300 px-2.5 py-0.5 rounded text-xs border border-cyan-500/40">
                  BAHÍA {currentSectionBay}
                </span>
              </h2>
            </div>

            <button
              onClick={() => setIsLegendOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-gradient-to-r from-cyan-950 to-blue-950 hover:from-cyan-900 hover:to-blue-900 text-cyan-300 border border-cyan-500/50 shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>LEYENDA DE LÍNEAS NAVIERAS & SIMBOLOGÍA</span>
            </button>
          </div>

          {/* Section Quick Summary Bar */}
          <div className="flex flex-wrap gap-3 mb-2.5 bg-[#050D18] p-2.5 rounded-lg border border-slate-800 font-mono text-[10.5px] items-center">
            <span className="text-slate-400">
              UNIDADES EN SECCIÓN {currentSectionBay}: <strong className="text-white font-black">{sectionStats.total}</strong>
            </span>
            <span className="text-slate-400">
              20': <strong className="text-emerald-400">{sectionStats.c20}</strong>
            </span>
            <span className="text-slate-400">
              40': <strong className="text-purple-400">{sectionStats.c40}</strong>
            </span>
            <span className="text-slate-400">
              REEFER: <strong className="text-cyan-400">{sectionStats.rf}</strong>
            </span>
            <span className="text-slate-400">
              DG (IMO): <strong className="text-red-400">{sectionStats.dg}</strong>
            </span>
            <span className="text-slate-400 ml-auto flex items-center gap-1">
              <Scale className="w-3.5 h-3.5 text-amber-400" /> PESO SECCIÓN: <strong className="text-amber-400 font-black">{sectionStats.weightTons} TONS</strong>
            </span>
          </div>

          {/* Validation Status Banner */}
          {validationReport && (
            <div className={`mb-2.5 p-2 rounded-lg text-[11px] font-mono flex items-center justify-between border ${
              validationReport.status === 'VALID'
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
                : 'bg-red-950/40 text-red-400 border-red-800/60'
            }`}>
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-4 h-4" />
                <span>
                  ESTADO BAPLIE: <strong>{validationReport.status}</strong>
                  {validationReport.duplicateErrors.length > 0 && ` | ${validationReport.duplicateErrors.length} Duplicados`}
                  {validationReport.floatingContainers.length > 0 && ` | ${validationReport.floatingContainers.length} Flotantes`}
                  {validationReport.bundles.length > 0 && ` | ${validationReport.bundles.length} Bundles FR/PL`}
                </span>
              </div>
            </div>
          )}

          {/* Unified Matrix Visualization Canvas */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <SimultaneousCrossSectionMatrix
              sectionBayId={currentSectionBay}
              allContainers={filteredContainers}
              activeTerminalKey={activeTerminalKey}
              validationReport={validationReport}
              onSelectContainer={(c) => setSelectedContainer(c)}
              levelFilter="ALL"
            />
          </div>

        </div>

      </div>

      {/* Shipping Line Legend Modal */}
      <ShippingLineLegendPanel
        isOpen={isLegendOpen}
        onClose={() => setIsLegendOpen(false)}
      />
    </div>
  );
};
