import React, { useState } from 'react';
import { Container } from '../../core/models/container';
import { ContainerBox } from '../container/ContainerBox';
import { BaplieValidationReport } from '../../core/models/validation';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Layers } from 'lucide-react';

interface SimultaneousCrossSectionMatrixProps {
  sectionBayId: string;
  allContainers: Container[];
  activeTerminalKey: string;
  validationReport?: BaplieValidationReport | null;
  onSelectContainer: (c: Container) => void;
  levelFilter?: 'ALL' | 'DECK' | 'HOLD';
}

function parseBayNum(bStr: string): number {
  if (!bStr) return 2;
  const match = bStr.match(/\d+/);
  return match ? parseInt(match[0], 10) : 2;
}

function getSectionEvenBay(rawBay: string): { evenBay: string; foreBay: string; aftBay: string } {
  const num = parseBayNum(rawBay);
  let even = num;
  if (num % 2 !== 0) {
    // If odd (e.g. 01 or 03), convert to corresponding even 40' bay (02)
    even = (num % 4 === 1) ? num + 1 : num - 1;
  }
  if (even <= 0) even = 2;

  const evenStr = even.toString().padStart(2, '0');
  const foreStr = (even - 1).toString().padStart(2, '0');
  const aftStr = (even + 1).toString().padStart(2, '0');

  return { evenBay: evenStr, foreBay: foreStr, aftBay: aftStr };
}

function computeRowsAndTiers(containers: Container[], levelFilter: 'ALL' | 'DECK' | 'HOLD' = 'ALL') {
  const rows = containers.map(c => parseInt(c.row, 10)).filter(n => !isNaN(n));
  let maxEven = Math.max(16, ...rows.filter(r => r % 2 === 0));
  let maxOdd = Math.max(15, ...rows.filter(r => r % 2 !== 0));

  if (maxEven % 2 !== 0) maxEven++;
  if (maxOdd % 2 === 0) maxOdd++;

  const layoutRows: string[] = [];
  for (let i = maxEven; i >= 2; i -= 2) {
    layoutRows.push(i.toString().padStart(2, '0'));
  }
  layoutRows.push('00');
  for (let i = 1; i <= maxOdd; i += 2) {
    layoutRows.push(i.toString().padStart(2, '0'));
  }

  const tiers = containers.map(c => parseInt(c.tier, 10)).filter(n => !isNaN(n));
  let holdData = tiers.filter(t => t < 70);
  let deckData = tiers.filter(t => t >= 70);

  if (levelFilter === 'DECK') holdData = [];
  if (levelFilter === 'HOLD') deckData = [];

  const deckTiers: string[] = [];
  if (deckData.length > 0) {
    let mx = Math.max(...deckData);
    if (mx % 2 !== 0) mx++;
    let mn = Math.min(...deckData);
    if (mn % 2 !== 0) mn--;
    for (let i = mx; i >= Math.max(70, mn); i -= 2) {
      deckTiers.push(i.toString().padStart(2, '0'));
    }
  } else {
    // Default deck tier grid if empty
    deckTiers.push('88', '86', '84', '82');
  }

  const holdTiers: string[] = [];
  if (holdData.length > 0) {
    let mx = Math.max(...holdData);
    if (mx % 2 !== 0) mx++;
    let mn = Math.min(...holdData);
    if (mn % 2 !== 0) mn--;
    for (let i = mx; i >= Math.max(2, mn); i -= 2) {
      holdTiers.push(i.toString().padStart(2, '0'));
    }
  } else if (levelFilter !== 'DECK') {
    // Default hold tier grid
    holdTiers.push('12', '10', '08', '06', '04', '02');
  }

  return { layoutRows, deckTiers, holdTiers };
}

export const SimultaneousCrossSectionMatrix: React.FC<SimultaneousCrossSectionMatrixProps> = ({
  sectionBayId,
  allContainers,
  activeTerminalKey,
  validationReport,
  onSelectContainer,
  levelFilter = 'ALL'
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const { evenBay, foreBay, aftBay } = getSectionEvenBay(sectionBayId);

  // Filter containers belonging to this section (40' in evenBay, or 20' in foreBay/aftBay)
  const sectionContainers = allContainers.filter(c => {
    const cBay = (c.bay || '').padStart(2, '0');
    return cBay === evenBay || cBay === foreBay || cBay === aftBay;
  });

  const { layoutRows, deckTiers, holdTiers } = computeRowsAndTiers(sectionContainers, levelFilter as 'ALL' | 'DECK' | 'HOLD');

  const handleZoomIn = () => setZoomLevel(prev => Math.min(150, prev + 10));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(70, prev - 10));
  const handleZoomReset = () => setZoomLevel(100);

  const renderTierRows = (tiers: string[], isDeck: boolean) => {
    return tiers.map(tier => (
      <tr key={tier} className="transition-colors hover:bg-slate-900/40">
        {/* Tier Indicator Header */}
        <td className="bg-[#070D18] border border-slate-800 text-amber-400 font-mono font-bold text-[10px] text-center w-8 px-1">
          {tier}
        </td>

        {/* Row Slots */}
        {layoutRows.map(row => {
          // Find 40' container in even bay
          const c40 = sectionContainers.find(c =>
            (c.size === 40 || c.size === 45) && c.row === row && c.tier === tier
          );

          // Find 20' containers in fore / aft bays
          const c20Fore = sectionContainers.find(c =>
            c.size === 20 && (c.bay === foreBay || c.bay === parseInt(foreBay, 10).toString()) && c.row === row && c.tier === tier
          );

          const c20Aft = sectionContainers.find(c =>
            c.size === 20 && (c.bay === aftBay || c.bay === parseInt(aftBay, 10).toString()) && c.row === row && c.tier === tier
          );

          const has40 = !!c40;
          const has20 = !!c20Fore || !!c20Aft;

          return (
            <td key={row} className="p-1 sm:p-1.5 text-center align-middle border border-slate-900/70 bg-[#02050B]">
              {/* Stacked Unified Cell: 40' ON TOP, 20' DIRECTLY UNDERNEATH */}
              <div className="flex flex-col items-center gap-1 p-0.5 min-w-[64px] sm:min-w-[72px]">
                
                {/* 40' CONTAINER (TOP LAYER) */}
                <div className="w-full flex justify-center">
                  {c40 ? (
                    <ContainerBox
                      container={c40}
                      activeTerminalKey={activeTerminalKey}
                      onClick={() => onSelectContainer(c40)}
                    />
                  ) : (
                    <div className="w-13 h-6 md:w-16 md:h-8 bg-[#050A14] border border-dashed border-purple-500/35 rounded-xs flex items-center justify-center text-[8px] font-mono font-bold text-purple-400/50">
                      40' VACÍO
                    </div>
                  )}
                </div>

                {/* DIVIDER LINE BETWEEN 40' AND 20' */}
                <div className="w-full h-[1px] bg-cyan-500/25 my-0.5" />

                {/* 20' CONTAINERS (BOTTOM LAYER: FORE / AFT) */}
                <div className="w-full flex items-center justify-center gap-1">
                  {c20Fore ? (
                    <div className="flex-1 min-w-0">
                      <ContainerBox
                        container={c20Fore}
                        activeTerminalKey={activeTerminalKey}
                        onClick={() => onSelectContainer(c20Fore)}
                        compact
                      />
                    </div>
                  ) : (
                    <div className="flex-1 h-6 md:h-7 bg-[#050A14] border border-dashed border-cyan-500/25 rounded-xs flex items-center justify-center text-[7.5px] font-mono font-bold text-cyan-400/50">
                      20'F
                    </div>
                  )}

                  {c20Aft ? (
                    <div className="flex-1 min-w-0">
                      <ContainerBox
                        container={c20Aft}
                        activeTerminalKey={activeTerminalKey}
                        onClick={() => onSelectContainer(c20Aft)}
                        compact
                      />
                    </div>
                  ) : (
                    <div className="flex-1 h-6 md:h-7 bg-[#050A14] border border-dashed border-cyan-500/25 rounded-xs flex items-center justify-center text-[7.5px] font-mono font-bold text-cyan-400/50">
                      20'A
                    </div>
                  )}
                </div>

              </div>
            </td>
          );
        })}
      </tr>
    ));
  };

  return (
    <div className="flex flex-col h-full bg-[#030712] border border-cyan-500/30 rounded-xl p-3.5 shadow-2xl overflow-hidden relative">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#08121E] p-2.5 rounded-lg border border-slate-800 mb-3">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-500/20 p-1.5 rounded border border-cyan-500/40 text-cyan-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-mono text-xs font-black text-white tracking-widest uppercase flex items-center gap-2">
              SECCIÓN DE BAHÍA <span className="text-cyan-400 text-sm font-black">{evenBay}</span>
              <span className="text-[10px] bg-purple-950 text-purple-300 font-mono px-2 py-0.5 rounded border border-purple-800">
                40' (BAY {evenBay}) SOBRE 20' (BAYS {foreBay} / {aftBay})
              </span>
            </h3>
            <p className="text-[10px] font-mono text-slate-400">
              Visualización Transversal Simultánea · Total en Sección: <strong className="text-white">{sectionContainers.length} unidades</strong>
            </p>
          </div>
        </div>

        {/* Zoom & View Controls */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-slate-400 mr-1">ZOOM: {zoomLevel}%</span>
          <button
            onClick={handleZoomOut}
            className="p-1.5 bg-[#0D1B2A] hover:bg-slate-800 text-slate-300 rounded border border-slate-700 cursor-pointer transition-all"
            title="Reducir Zoom"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomReset}
            className="p-1.5 bg-[#0D1B2A] hover:bg-slate-800 text-cyan-400 rounded border border-slate-700 cursor-pointer transition-all"
            title="Restablecer Zoom 100%"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomIn}
            className="p-1.5 bg-[#0D1B2A] hover:bg-slate-800 text-slate-300 rounded border border-slate-700 cursor-pointer transition-all"
            title="Aumentar Zoom"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Matrix Canvas Container */}
      <div className="flex-1 overflow-auto bg-[#01040A] rounded-lg border border-slate-900 p-3 flex justify-center items-start shadow-inner">
        <div
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
          className="transition-transform duration-200"
        >
          <table className="border-separate border-spacing-1 mx-auto">
            <thead>
              <tr>
                <td
                  colSpan={layoutRows.length + 1}
                  className="bg-gradient-to-r from-purple-950 via-slate-900 to-cyan-950 border border-cyan-500/40 text-center font-mono font-black text-xs tracking-widest text-cyan-300 py-2 rounded-t"
                >
                  VISTA TRANSVERSAL INTELIGENTE — BAHÍA {evenBay} (40' SOBRE 20')
                </td>
              </tr>
              <tr>
                <th className="bg-[#050D18] text-amber-400 font-mono text-[9px] p-1 border border-slate-800">
                  TIER
                </th>
                {layoutRows.map(row => (
                  <th
                    key={row}
                    className="bg-[#08121E] text-cyan-300 font-mono text-[10px] font-bold p-1 border border-slate-800 min-w-[64px] sm:min-w-[72px]"
                  >
                    R{row}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* DECK TIERS */}
              {deckTiers.length > 0 && (
                <>
                  <tr className="bg-cyan-950/40">
                    <td
                      colSpan={layoutRows.length + 1}
                      className="text-left font-mono font-bold text-[9px] text-cyan-300 px-2 py-1 border-y border-cyan-800"
                    >
                      ▲ CUBIERTA (DECK TIERS ≥ 70)
                    </td>
                  </tr>
                  {renderTierRows(deckTiers, true)}
                </>
              )}

              {/* HOLD TIERS */}
              {holdTiers.length > 0 && levelFilter !== 'DECK' && (
                <>
                  <tr className="bg-slate-900">
                    <td
                      colSpan={layoutRows.length + 1}
                      className="text-left font-mono font-bold text-[9px] text-amber-400 px-2 py-1 border-y border-slate-700"
                    >
                      ▼ BODEGA (HOLD TIERS &lt; 70)
                    </td>
                  </tr>
                  {renderTierRows(holdTiers, false)}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Matrix Footer Legend */}
      <div className="mt-3 bg-[#08121E] p-2 rounded-lg border border-slate-800 flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-300 gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-purple-950 border border-purple-500 rounded-xs inline-block" />
            <strong className="text-purple-300">40' SOBRE 20':</strong> Capa Superior 40' / Capa Inferior 20' (F/A)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-[#10B981] rounded-xs inline-block" />
            <strong className="text-emerald-400">VERACRUZ / IMPORT</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-[#3B82F6] rounded-xs inline-block" />
            <strong className="text-blue-400">EXPORTACIÓN / TRÁNSITO</strong>
          </span>
        </div>
        <span className="text-slate-500 italic">
          Haz clic en cualquier contenedor para ver el expediente completo.
        </span>
      </div>
    </div>
  );
};
