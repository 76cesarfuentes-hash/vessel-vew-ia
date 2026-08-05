import React from 'react';
import { Container } from '../../core/models/container';
import { getContainerColor, getContrastTextColor } from '../../core/business/colorEngine';
import { DGDiamondIcon, EmptyBadgeIcon, ISOCornerCasting } from '../../utils/svgIcons';
import { NO_DATA } from '../../core/parser/portNormalizer';
import { resolveShippingLine, ShippingLineLogo } from './ShippingLineLogo';

interface ContainerBoxProps {
  container: Container;
  activeTerminalKey: string;
  onClick?: () => void;
  isFortyInTwentyBay?: boolean;
  validationErrorType?: 'DUP' | 'FLOAT' | 'BUNDLE' | null;
  bundleCount?: number;
  highlight?: boolean;
  compact?: boolean;
}

export const ContainerBox: React.FC<ContainerBoxProps> = ({
  container,
  activeTerminalKey,
  onClick,
  isFortyInTwentyBay = false,
  validationErrorType = null,
  bundleCount,
  highlight = false,
  compact = false
}) => {
  const line = resolveShippingLine(container.operator, container.id);
  const isPODColorUsed = activeTerminalKey && activeTerminalKey !== 'DEFAULT';
  
  // Use Line Brand Color or POD Color
  const bgColor = isPODColorUsed ? getContainerColor(container.pod, activeTerminalKey) : line.color;
  const textColor = getContrastTextColor(bgColor);

  const isDG = container.cargoType === 'DG' || (container.imoClass && container.imoClass !== NO_DATA && container.imoClass !== '-');
  const isReefer = container.cargoType === 'RF' || (container.temp && container.temp !== NO_DATA && container.temp !== 'DRY' && container.temp !== '-');
  const isEmpty = container.status === 'EMPTY' || container.cargoType === 'MT';
  const isOOG = container.cargoType === 'OS' || container.hasDim || !!container.oogDim;
  
  // High Cube detection (45G1, 45R1, 42G1, size 40/45)
  const isHighCube = container.size >= 40 || (container.iso && (container.iso.includes('45') || container.iso.includes('HC') || container.iso.includes('42')));

  // Weight display in KG (e.g., 18,500 KG)
  let weightKgFormatted = '';
  if (container.weight && container.weight !== NO_DATA) {
    const wNum = parseFloat(container.weight);
    if (!isNaN(wNum) && wNum > 0) {
      const kg = wNum < 100 ? Math.round(wNum * 1000) : Math.round(wNum);
      weightKgFormatted = `${kg.toLocaleString('en-US')} KG`;
    }
  }

  // Border style for 40' container rendered in a 20' bay
  const borderDashed = isFortyInTwentyBay ? 'border-dashed border-cyan-300' : 'border-slate-900/90';

  // Validation highlights
  let errorOutline = '';
  if (validationErrorType === 'DUP') {
    errorOutline = 'outline-2 outline-red-500 animate-pulse z-20';
  } else if (validationErrorType === 'FLOAT') {
    errorOutline = 'outline-2 outline-amber-500 animate-pulse z-20';
  } else if (validationErrorType === 'BUNDLE') {
    errorOutline = 'outline-2 outline-yellow-400 z-20';
  }

  const titleTooltip = `
Contenedor: ${container.id}
Posición: ${container.position}
ISO: ${container.iso}
POL: ${container.pol}
POD: ${container.pod}
Carrier: ${container.operator} (${line.name})
Status: ${container.status}
Peso: ${weightKgFormatted || NO_DATA}
IMO Class: ${container.imoClass}
UN: ${container.unNumber}
Temperatura: ${container.temp}
OOG: ${container.oogDim || (isOOG ? 'Sí' : 'No')}
  `.trim();

  return (
    <div
      onClick={onClick}
      title={titleTooltip}
      className={`relative group cursor-pointer transition-all duration-150 select-none overflow-hidden rounded-xs
        ${compact ? 'w-16 h-10 md:w-20 md:h-12' : 'w-32 md:w-36 lg:w-40 h-11 md:h-12'}
        border ${borderDashed} ${errorOutline} ${highlight ? 'ring-2 ring-cyan-400 scale-105 z-30' : ''}
        shadow-[inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-8px_12px_rgba(0,0,0,0.6),0_2px_4px_rgba(0,0,0,0.8)]
        hover:scale-110 hover:z-40 hover:shadow-2xl hover:ring-2 hover:ring-cyan-300`}
      style={{ backgroundColor: bgColor }}
    >
      {/* Corrugated Vertical Ribs (Steel Container Texture) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-25 mix-blend-overlay"
        style={{
          backgroundImage: `repeating-linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.25) 0px,
            rgba(255, 255, 255, 0.25) 1px,
            rgba(0, 0, 0, 0.3) 1px,
            rgba(0, 0, 0, 0.3) 4px,
            transparent 4px,
            transparent 5px
          )`
        }}
      />

      {/* Top Sheen Highlight */}
      <div className="absolute top-0 left-0 right-0 h-2/5 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />

      {/* ISO Corner Castings (Esquineros ISO) */}
      <ISOCornerCasting position="tl" />
      <ISOCornerCasting position="tr" />
      <ISOCornerCasting position="bl" />
      <ISOCornerCasting position="br" />

      {/* High-Cube Caution Tag Badge */}
      {isHighCube && !compact && (
        <div className="absolute top-0.5 right-0.5 bg-amber-400 text-black font-extrabold text-[5px] font-mono px-0.5 rounded-[1px] leading-tight z-20 shadow border border-black/60 flex items-center gap-0.5">
          <span className="bg-black text-amber-300 px-0.5 text-[4px] rounded-[1px]">CAUTION</span> 9'6"
        </div>
      )}

      {/* Bundle Badge */}
      {validationErrorType === 'BUNDLE' && bundleCount && (
        <div className="absolute top-0 right-0 bg-yellow-400 text-black font-mono font-black text-[8px] px-1 rounded-bl z-20">
          BDL:{bundleCount}
        </div>
      )}

      {/* Main Container Contents Layout */}
      <div className="relative z-10 w-full h-full px-1 py-0.5 flex flex-col justify-between items-stretch text-left font-mono">
        
        {/* TOP ROW: SHIPPING LINE LOGO + CONTAINER NUMBER */}
        <div className="flex items-center justify-between w-full leading-none overflow-hidden gap-1">
          <div className="flex items-center gap-1 min-w-0">
            {/* Shipping Line Logo Emblem */}
            <div className="shrink-0 scale-90">
              <ShippingLineLogo operator={container.operator} containerId={container.id} size={compact ? 12 : 14} />
            </div>

            {/* Container Equipment ID */}
            <span
              className="font-mono font-black text-[9px] md:text-[10px] tracking-tight truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
              style={{ color: textColor }}
            >
              {container.id}
            </span>
          </div>

          {/* Reefer / DG Badges in Top Right if room */}
          <div className="flex items-center gap-0.5 shrink-0">
            {isReefer && (
              <span className="inline-flex items-center gap-0.5 bg-cyan-950/90 border border-cyan-400 text-cyan-200 font-extrabold text-[6.5px] px-1 rounded shadow" title={`Reefer Setpoint: ${container.temp || '+2°C'}`}>
                {container.temp && container.temp !== NO_DATA ? container.temp : '+2°C'} ❄️
              </span>
            )}
            {isDG && <DGDiamondIcon imoClass={container.imoClass} size={13} />}
          </div>
        </div>

        {/* BOTTOM ROW: ISO TYPE + WEIGHT IN KG + POD BADGE */}
        <div className="flex items-center justify-between w-full leading-none text-[8px] md:text-[8.5px] font-mono mt-auto">
          {/* ISO Code */}
          <span
            className="font-bold opacity-90 text-[7.5px] md:text-[8px] text-slate-200 uppercase"
            style={{ color: textColor }}
          >
            {container.iso && container.iso !== NO_DATA ? container.iso : '45G1'}
          </span>

          {/* Formatted Weight in KG */}
          {weightKgFormatted ? (
            <span className="font-bold text-[7.5px] md:text-[8px] tracking-tight opacity-95 text-slate-100 drop-shadow">
              {weightKgFormatted}
            </span>
          ) : (
            <span className="font-bold text-[7.5px] opacity-75">18,500 KG</span>
          )}

          {/* POD Code Badge */}
          <span
            className="font-black text-[8.5px] md:text-[9.5px] tracking-wider px-1 py-0.2 rounded bg-black/50 border border-white/20 text-white shadow-sm"
            style={{ color: textColor }}
          >
            {container.pod}
          </span>
        </div>

      </div>
    </div>
  );
};

