import React from 'react';
import { Container } from '../../core/models/container';
import { ContainerBox } from '../container/ContainerBox';
import { BaplieValidationReport } from '../../core/models/validation';

interface BayMatrixProps {
  bayId: string;
  containers: Container[];
  activeTerminalKey: string;
  validationReport?: BaplieValidationReport | null;
  onSelectContainer: (c: Container) => void;
  levelFilter?: 'ALL' | 'DECK' | 'HOLD';
}

function computePhysicalLayoutRows(units: Container[]): string[] {
  const rows = units.map(c => parseInt(c.row, 10)).filter(n => !isNaN(n));
  let maxEven = Math.max(16, ...rows.filter(r => r % 2 === 0));
  let maxOdd = Math.max(15, ...rows.filter(r => r % 2 !== 0));

  if (maxEven % 2 !== 0) maxEven++;
  if (maxOdd % 2 === 0) maxOdd++;

  const res: string[] = [];
  for (let i = maxEven; i >= 2; i -= 2) {
    res.push(i.toString().padStart(2, '0'));
  }
  res.push('00');
  for (let i = 1; i <= maxOdd; i += 2) {
    res.push(i.toString().padStart(2, '0'));
  }
  return res;
}

function computePhysicalTiers(units: Container[], levelFilter: 'ALL' | 'DECK' | 'HOLD' = 'ALL') {
  const tiers = units.map(c => parseInt(c.tier, 10)).filter(n => !isNaN(n));
  let holdData = tiers.filter(t => t < 70);
  let deckData = tiers.filter(t => t >= 70);

  if (levelFilter === 'DECK') holdData = [];
  if (levelFilter === 'HOLD') deckData = [];

  const deckRows: string[] = [];
  if (deckData.length > 0) {
    let mx = Math.max(...deckData);
    if (mx % 2 !== 0) mx++;
    let mn = Math.min(...deckData);
    if (mn % 2 !== 0) mn--;
    for (let i = mx; i >= Math.max(70, mn); i -= 2) {
      deckRows.push(i.toString().padStart(2, '0'));
    }
  }

  const holdRows: string[] = [];
  if (holdData.length > 0) {
    let mx = Math.max(...holdData);
    if (mx % 2 !== 0) mx++;
    let mn = Math.min(...holdData);
    if (mn % 2 !== 0) mn--;
    for (let i = mx; i >= Math.max(2, mn); i -= 2) {
      holdRows.push(i.toString().padStart(2, '0'));
    }
  }

  return { deckTiers: deckRows, holdTiers: holdRows };
}

export const BayMatrix: React.FC<BayMatrixProps> = ({
  bayId,
  containers,
  activeTerminalKey,
  validationReport,
  onSelectContainer,
  levelFilter = 'ALL'
}) => {
  if (containers.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 font-mono text-xs">
        No hay contenedores estibados en la bahía {bayId}.
      </div>
    );
  }

  const layoutRows = computePhysicalLayoutRows(containers);
  const { deckTiers, holdTiers } = computePhysicalTiers(containers, levelFilter as 'ALL' | 'DECK' | 'HOLD');
  const bay3 = String(bayId).padStart(3, '0');

  const bayNumInt = parseInt(bayId, 10) || 24;
  const frStart = bayNumInt * 3 - 1;
  const frEnd = bayNumInt * 3 + 4;

  const renderTierRows = (tiers: string[]) => {
    return tiers.map(tier => (
      <tr key={tier}>
        {/* Left Tier Header Label */}
        <td className="bg-[#050B14] border border-slate-800 text-slate-300 font-mono font-bold text-[10px] text-center w-8 px-1">
          {tier}
        </td>

        {/* Row Slots */}
        {layoutRows.map(row => {
          const posKey = `${bay3}${row}${tier}`;
          const match = containers.find(c => c.row === row && c.tier === tier);

          const isBundle = validationReport?.bundleSet.has(posKey);
          const isDupErr = validationReport?.dupErrSet.has(posKey);
          const isFloating = validationReport?.floatSet.has(posKey);

          let errorType: 'DUP' | 'FLOAT' | 'BUNDLE' | null = null;
          if (isDupErr) errorType = 'DUP';
          else if (isFloating) errorType = 'FLOAT';
          else if (isBundle) errorType = 'BUNDLE';

          if (match) {
            const isFortyInTwenty = match.size === 40 && match.bay !== bayId;
            return (
              <td key={row} className="p-0.5 text-center align-middle border border-slate-900/80 bg-[#02050B]">
                <ContainerBox
                  container={match}
                  activeTerminalKey={activeTerminalKey}
                  isFortyInTwentyBay={isFortyInTwenty}
                  validationErrorType={errorType}
                  bundleCount={isBundle ? (validationReport?.byPos[posKey] || []).length : undefined}
                  onClick={() => onSelectContainer(match)}
                />
              </td>
            );
          }

          // Empty Slot matching screenshot
          return (
            <td key={row} className="p-0.5 text-center align-middle border border-slate-900/80 bg-[#02050B]">
              <div className="w-32 md:w-36 h-11 md:h-12 bg-[#050A14] border border-dashed border-slate-800 rounded-xs flex items-center justify-center gap-1.5 font-mono text-[9px] text-slate-500 font-bold">
                <span>EMPTY</span>
                <span className="w-3.5 h-3.5 rounded-full border border-emerald-500/60 text-emerald-400 font-extrabold text-[8px] flex items-center justify-center">E</span>
              </div>
            </td>
          );
        })}

        {/* Right Tier Header Label */}
        <td className="bg-[#050B14] border border-slate-800 text-slate-300 font-mono font-bold text-[10px] text-center w-8 px-1">
          {tier}
        </td>
      </tr>
    ));
  };

  return (
    <div className="overflow-x-auto bg-[#02060D] border border-slate-800 rounded-xl p-3 shadow-2xl">
      <table className="border-separate border-spacing-0.5 mx-auto bg-[#030712] p-2 rounded border border-slate-800">
        <thead>
          {/* TOP BAY TITLE HEADER */}
          <tr>
            <td
              colSpan={layoutRows.length + 2}
              className="bg-[#030712] border-b border-slate-800 text-left px-2 py-1.5 font-mono"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-white tracking-wider uppercase">
                    BAY {bayId}
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
          {/* Deck Tiers */}
          {deckTiers.length > 0 && renderTierRows(deckTiers)}

          {/* Hatch Cover Divider Line */}
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

          {/* Hold Tiers */}
          {holdTiers.length > 0 && renderTierRows(holdTiers)}
        </tbody>

        {/* BOTTOM NAV FOOTER */}
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

      {/* LEYENDA FOOTER */}
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
