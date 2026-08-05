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
        {/* Left Tier Indicator Header */}
        <td className="bg-[#050B14] border border-slate-800 text-slate-300 font-mono font-bold text-[10px] text-center w-8 px-1">
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

          return (
            <td key={row} className="p-1 sm:p-1.5 text-center align-middle border border-slate-900/80 bg-[#02050B]">
              {/* Stacked Unified Cell: 40' ON TOP, 20' DIRECTLY UNDERNEATH */}
              <div className="flex flex-col items-center gap-1 p-0.5">
                
                {/* 40' CONTAINER (TOP LAYER) */}
                <div className="w-full flex justify-center">
                  {c40 ? (
                    <ContainerBox
                      container={c40}
                      activeTerminalKey={activeTerminalKey}
                      onClick={() => onSelectContainer(c40)}
                    />
                  ) : (
                    <div className="w-32 md:w-36 h-11 md:h-12 bg-[#050A14] border border-dashed border-slate-800 rounded-xs flex items-center justify-center text-[8.5px] font-mono font-bold text-slate-600">
                      VACÍO
                    </div>
                  )}
                </div>

                {/* DIVIDER LINE BETWEEN 40' AND 20' */}
                <div className="w-full h-[1px] bg-cyan-500/20 my-0.5" />

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
                    <div className="flex-1 h-8 bg-[#050A14] border border-dashed border-slate-800 rounded-xs flex items-center justify-center text-[7.5px] font-mono font-bold text-slate-600">
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
                    <div className="flex-1 h-8 bg-[#050A14] border border-dashed border-slate-800 rounded-xs flex items-center justify-center text-[7.5px] font-mono font-bold text-slate-600">
                      20'A
                    </div>
                  )}
                </div>

              </div>
            </td>
          );
        })}

        {/* Right Tier Indicator Header */}
        <td className="bg-[#050B14] border border-slate-800 text-slate-300 font-mono font-bold text-[10px] text-center w-8 px-1">
          {tier}
        </td>
      </tr>
    ));
  };

  const bayNumInt = parseInt(evenBay, 10) || 24;
  const frStart = bayNumInt * 3 - 1;
  const frEnd = bayNumInt * 3 + 4;

  return (
    <div className="flex flex-col h-full bg-[#02060D] border border-slate-800 rounded-xl p-3 shadow-2xl overflow-hidden relative">
      {/* Zoom & View Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#050B14] p-2.5 rounded-lg border border-slate-800 mb-3 font-mono">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-500/20 p-1.5 rounded border border-cyan-500/40 text-cyan-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-white tracking-widest uppercase flex items-center gap-2">
              SECCIÓN DE BAHÍA <span className="text-cyan-400 text-sm font-black">{evenBay}</span>
            </h3>
            <p className="text-[10px] text-slate-400">
              Contenedores en sección: <strong className="text-white">{sectionContainers.length} unidades</strong>
            </p>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 mr-1">ZOOM: {zoomLevel}%</span>
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
      <div className="flex-1 overflow-auto bg-[#010308] rounded-lg border border-slate-900 p-3 flex justify-center items-start shadow-inner">
        <div
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
          className="transition-transform duration-200"
        >
          <table className="border-separate border-spacing-0.5 mx-auto bg-[#030712] p-2 rounded border border-slate-800">
            <thead>
              {/* TOP BAY HEADER MATCHING ATTACHED SCREENSHOT */}
              <tr>
                <td
                  colSpan={layoutRows.length + 2}
                  className="bg-[#030712] border-b border-slate-800 text-left px-2 py-1.5 font-mono"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl md:text-2xl font-black text-white tracking-wider uppercase">
                        BAY {evenBay}
                      </h2>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        FR. {frStart} - FR. {frEnd}
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
              <tr>
                <th className="bg-[#030712] text-slate-400 font-mono text-[9px] font-bold p-1 border border-slate-800">
                  TIERS
                </th>
                {layoutRows.map(row => (
                  <th
                    key={row}
                    className="bg-[#050B14] text-slate-300 font-mono text-[11px] font-extrabold p-1 border border-slate-800"
                  >
                    {row}
                  </th>
                ))}
                <th className="bg-[#030712] text-slate-400 font-mono text-[9px] font-bold p-1 border border-slate-800">
                  TIERS
                </th>
              </tr>
            </thead>

            <tbody>
              {/* DECK TIERS */}
              {deckTiers.length > 0 && renderTierRows(deckTiers, true)}

              {/* HATCH COVER DIVIDER LINE */}
              {levelFilter === 'ALL' && deckTiers.length > 0 && holdTiers.length > 0 && (
                <tr>
                  <td className="bg-[#030712] border border-slate-800 text-slate-500 font-mono text-[8px] text-center">—</td>
                  <td colSpan={layoutRows.length} className="py-1">
                    <div
                      className="h-2 rounded border-t border-b border-cyan-500/40"
                      style={{
                        backgroundImage: `repeating-linear-gradient(
                          45deg,
                          #1C2942,
                          #1C2942 4px,
                          #0A1120 4px,
                          #0A1120 8px
                        )`
                      }}
                      title="Tapa de Bodega (Hatch Cover)"
                    />
                  </td>
                  <td className="bg-[#030712] border border-slate-800 text-slate-500 font-mono text-[8px] text-center">—</td>
                </tr>
              )}

              {/* HOLD TIERS */}
              {holdTiers.length > 0 && levelFilter !== 'DECK' && renderTierRows(holdTiers, false)}
            </tbody>

            {/* BOTTOM NAV FOOTER MATCHING SCREENSHOT */}
            <tfoot>
              <tr>
                <td className="bg-[#030712] border border-slate-800 text-slate-400 text-[10px] font-bold text-center py-1.5 font-mono">
                  ← AFT
                </td>
                <td colSpan={layoutRows.length} className="bg-[#030712] border border-slate-800 text-slate-400 text-[10px] font-extrabold text-center py-1.5 font-mono uppercase tracking-widest">
                  ROWS
                </td>
                <td className="bg-[#030712] border border-slate-800 text-slate-400 text-[10px] font-bold text-center py-1.5 font-mono">
                  FWD →
                </td>
              </tr>
              <tr>
                <th className="bg-[#030712] border border-slate-800"></th>
                {layoutRows.map(row => (
                  <th key={row} className="bg-[#030712] border border-slate-800 text-slate-400 text-[10px] font-bold py-1 text-center font-mono">
                    {row}
                  </th>
                ))}
                <th className="bg-[#030712] border border-slate-800"></th>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* LEYENDA FOOTER MATCHING ATTACHED SCREENSHOT */}
      <div className="mt-3 bg-[#030814] border border-slate-800/80 rounded-lg p-3 font-mono text-slate-300 text-[10px]">
        <h4 className="text-cyan-400 font-black uppercase tracking-wider text-xs mb-2">LEYENDA</h4>
        
        {/* Row 1: POD Colors */}
        <div className="flex flex-wrap items-center gap-3 mb-2.5 pb-2.5 border-b border-slate-800/60">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-orange-500 rounded-xs border border-white/20 inline-block" />
            <span><strong className="text-white">VER</strong> Importación (Terminal)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-amber-600 rounded-xs border border-white/20 inline-block" />
            <span><strong className="text-white">HOU</strong> Houston</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-emerald-600 rounded-xs border border-white/20 inline-block" />
            <span><strong className="text-white">SHA</strong> Shanghai</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-blue-600 rounded-xs border border-white/20 inline-block" />
            <span><strong className="text-white">CTG</strong> Cartagena</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-teal-600 rounded-xs border border-white/20 inline-block" />
            <span><strong className="text-white">LZC</strong> Lázaro Cárdenas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-cyan-600 rounded-xs border border-white/20 inline-block" />
            <span><strong className="text-white">SIN</strong> Singapore</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-slate-600 rounded-xs border border-white/20 inline-block" />
            <span><strong className="text-slate-300">Otros POD</strong></span>
          </div>
        </div>

        {/* Row 2: Cargo Symbols */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1">
            <span>❄️</span>
            <span className="text-slate-300">Contenedor Refrigerado</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-red-500 font-bold">♦</span>
            <span className="text-slate-300"><strong className="text-red-400">DG</strong> Mercancía Peligrosa (IMDG)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-purple-400 font-extrabold">↑</span>
            <span className="text-slate-300">OOG-ARRIBA</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-blue-400 font-extrabold">↓</span>
            <span className="text-slate-300">OOG-ABAJO</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-emerald-400 font-extrabold">← →</span>
            <span className="text-slate-300">OOG-ESTIBA</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-emerald-400 text-emerald-400 font-extrabold text-[8px]">E</span>
            <span className="text-slate-300">Vacío</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🔒</span>
            <span className="text-slate-300">TANQUE Contenedor Tanque</span>
          </div>
        </div>
      </div>
    </div>
  );
};
