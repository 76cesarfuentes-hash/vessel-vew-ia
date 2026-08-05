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

  // Weight display in Tons
  let weightFormatted = '';
  if (container.weight && container.weight !== NO_DATA) {
    const wNum = parseFloat(container.weight);
    if (!isNaN(wNum) && wNum > 0) {
      const tons = Math.round(wNum > 100 ? wNum / 1000 : wNum);
      weightFormatted = `${tons}t`;
    }
  }

  // Border style for 40' container rendered in a 20' bay
  const borderDashed = isFortyInTwentyBay ? 'border-dashed border-cyan-300' : 'border-black/70';

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
Peso: ${container.weight && container.weight !== NO_DATA ? `${container.weight} KG` : NO_DATA}
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
        ${compact ? 'w-12 h-12 md:w-14 md:h-14' : 'w-16 h-14 md:w-20 md:h-16'}
        border ${borderDashed} ${errorOutline} ${highlight ? 'ring-2 ring-cyan-400 scale-105 z-30' : ''}
        shadow-[inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-8px_12px_rgba(0,0,0,0.5),0_2px_4px_rgba(0,0,0,0.6)]
        hover:scale-125 hover:z-40 hover:shadow-2xl hover:ring-2 hover:ring-cyan-300`}
      style={{ backgroundColor: bgColor }}
    >
      {/* Corrugated Vertical Ribs (Steel Container Texture) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30 mix-blend-overlay"
        style={{
          backgroundImage: `repeating-linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.2) 0px,
            rgba(255, 255, 255, 0.2) 1px,
            rgba(0, 0, 0, 0.25) 1px,
            rgba(0, 0, 0, 0.25) 4px,
            transparent 4px,
            transparent 5px
          )`
        }}
      />

      {/* Top Sheen Highlight */}
      <div className="absolute top-0 left-0 right-0 h-2/5 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />

      {/* ISO Corner Castings (Esquineros ISO) */}
      <ISOCornerCasting position="tl" />
      <ISOCornerCasting position="tr" />
      <ISOCornerCasting position="bl" />
      <ISOCornerCasting position="br" />

      {/* High-Cube Caution Tag Badge */}
      {isHighCube && !compact && (
        <div className="absolute top-0.5 right-0.5 bg-amber-400 text-black text-[5px] font-black font-mono px-0.5 rounded-[1px] leading-tight z-20 shadow border border-black/40">
          9'6"
        </div>
      )}

      {/* Bundle Badge */}
      {validationErrorType === 'BUNDLE' && bundleCount && (
        <div className="absolute top-0 right-0 bg-yellow-400 text-black font-mono font-black text-[8px] px-1 rounded-bl z-20">
          BDL:{bundleCount}
        </div>
      )}

      {/* Main Container Contents Layout */}
      <div className="relative z-10 w-full h-full p-0.5 flex flex-col justify-between items-stretch text-left">
        
        {/* TOP LINE: SHIPPING LINE LOGO + CONTAINER NUMBER */}
        <div className="flex items-center gap-1 w-full leading-none overflow-hidden">
          {/* Shipping Line Logo Emblem */}
          <div className="shrink-0 scale-90">
            <ShippingLineLogo operator={container.operator} containerId={container.id} size={compact ? 12 : 14} />
          </div>

          {/* Container Equipment ID */}
          <span
            className="font-mono font-extrabold text-[8px] md:text-[9px] tracking-tight truncate drop-shadow"
            style={{ color: textColor }}
          >
            {container.id}
          </span>
        </div>

        {/* CENTER LINE: POD CODE & ISO */}
        <div className="flex items-center justify-between px-0.5 my-auto leading-none">
          {/* POD Code */}
          <span
            className="font-mono font-black text-[9px] md:text-[10px] tracking-wider drop-shadow-md"
            style={{ color: textColor }}
          >
            {container.pod}
          </span>

          {/* ISO Equipment Code */}
          <span
            className="font-mono font-bold text-[7px] md:text-[8px] opacity-90 px-0.5 bg-black/40 text-white rounded border border-white/20"
          >
            {container.iso !== NO_DATA ? container.iso : '45G1'}
          </span>
        </div>

        {/* BOTTOM LINE: SPECIAL CARGO SYMBOLS & WEIGHT */}
        <div className="flex items-center justify-between w-full leading-none text-[6.5px] font-mono">
          <div className="flex items-center gap-0.5 flex-wrap">
            {/* 1. Empty Badge */}
            {isEmpty && <EmptyBadgeIcon size={11} />}

            {/* 2. DG Hazard Diamond */}
            {isDG && <DGDiamondIcon imoClass={container.imoClass} size={13} />}

            {/* 3. Reefer Snowflake & Setpoint */}
            {isReefer && (
              <span className="inline-flex items-center gap-0.5 bg-cyan-950/90 border border-cyan-400 text-cyan-200 font-black text-[6px] px-0.5 rounded" title={`Reefer Setpoint: ${container.temp || '-18°C'}`}>
                ❄️{container.temp && container.temp !== NO_DATA ? container.temp : '-18°C'}
              </span>
            )}

            {/* 4. OOG Directional Indicator */}
            {isOOG && (
              <span className="inline-flex items-center text-purple-200 font-extrabold text-[6.5px] bg-purple-950/90 border border-purple-400 px-0.5 rounded" title={`OOG: ${container.oogDim || 'Overdimension'}`}>
                ⬆️➡️
              </span>
            )}
          </div>

          {/* Weight Badge */}
          {weightFormatted && (
            <span className="text-[6.5px] font-bold px-0.5 rounded bg-black/60 text-emerald-300 border border-emerald-500/30">
              {weightFormatted}
            </span>
          )}
        </div>

      </div>
    </div>
  );
};

