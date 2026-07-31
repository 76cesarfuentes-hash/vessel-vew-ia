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

  const renderTierRows = (tiers: string[]) => {
    return tiers.map(tier => (
      <tr key={tier}>
        {/* Tier Header Label */}
        <td className="bg-[#070C16] border border-slate-800 text-amber-400 font-mono font-bold text-[10px] text-center w-6 px-1">
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
              <td key={row} className="p-0.5 text-center align-middle">
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

          // Empty Slot
          return (
            <td key={row} className="p-0.5 text-center align-middle">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-[#050A12] border border-dashed border-slate-800/80 rounded-xs" />
            </td>
          );
        })}
      </tr>
    ));
  };

  return (
    <div className="overflow-x-auto bg-[#030712] border border-cyan-500/20 rounded-lg p-3 shadow-2xl">
      <table className="border-separate border-spacing-0.5 mx-auto">
        <thead>
          <tr>
            <td
              colSpan={layoutRows.length + 1}
              className="bg-gradient-to-r from-cyan-950 via-slate-900 to-cyan-950 border border-cyan-500/30 text-center font-mono font-bold text-xs tracking-widest text-cyan-300 py-2 rounded-t"
            >
              BAHÍA {bayId} — VISTA TRANSVERSAL
            </td>
          </tr>
          <tr>
            <th className="bg-black border-none"></th>
            {layoutRows.map(row => (
              <th
                key={row}
                className="bg-[#070C16] border border-slate-800 text-slate-400 font-mono text-[10px] py-1 px-0.5 font-semibold text-center w-12 md:w-14"
              >
                {row}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Deck Tiers */}
          {deckTiers.length > 0 && renderTierRows(deckTiers)}

          {/* Hatch Cover Divider Line */}
          {levelFilter === 'ALL' && deckTiers.length > 0 && holdTiers.length > 0 && (
            <tr>
              <td className="bg-black border-none"></td>
              <td colSpan={layoutRows.length} className="py-1">
                <div
                  className="h-2.5 rounded border-t border-b border-cyan-500/40"
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
            </tr>
          )}

          {/* Hold Tiers */}
          {holdTiers.length > 0 && renderTierRows(holdTiers)}
        </tbody>
      </table>
    </div>
  );
};
