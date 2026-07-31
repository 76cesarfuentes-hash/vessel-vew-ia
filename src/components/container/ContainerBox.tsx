import React from 'react';
import { Container } from '../../core/models/container';
import { getContainerColor, getContrastTextColor } from '../../core/business/colorEngine';
import { DGDiamondIcon, EmptyBadgeIcon, ReeferSnowflakeIcon, ISOCornerCasting } from '../../utils/svgIcons';
import { NO_DATA } from '../../core/parser/portNormalizer';

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
  const bgColor = getContainerColor(container.pod, activeTerminalKey);
  const textColor = getContrastTextColor(bgColor);

  const isDG = container.cargoType === 'DG' || (container.imoClass && container.imoClass !== NO_DATA);
  const isReefer = container.cargoType === 'RF' || (container.temp && container.temp !== NO_DATA && container.temp !== 'DRY');
  const isEmpty = container.status === 'EMPTY' || container.cargoType === 'MT';
  const isOOG = container.cargoType === 'OS' || container.hasDim || !!container.oogDim;

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
  const borderDashed = isFortyInTwentyBay ? 'border-dashed border-cyan-300' : 'border-black/60';

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
Carrier: ${container.operator}
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
        ${compact ? 'w-10 h-10' : 'w-12 h-12 md:w-14 md:h-14'}
        border ${borderDashed} ${errorOutline} ${highlight ? 'ring-2 ring-cyan-400 scale-105 z-30' : ''}
        shadow-[inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-6px_10px_rgba(0,0,0,0.4),0_2px_4px_rgba(0,0,0,0.5)]
        hover:scale-125 hover:z-40 hover:shadow-xl hover:ring-1 hover:ring-white`}
      style={{ backgroundColor: bgColor }}
    >
      {/* Corrugated Vertical Ribs (Simulated Steel Sheet) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30 mix-blend-overlay"
        style={{
          backgroundImage: `repeating-linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.15) 0px,
            rgba(255, 255, 255, 0.15) 1px,
            rgba(0, 0, 0, 0.2) 1px,
            rgba(0, 0, 0, 0.2) 4px,
            transparent 4px,
            transparent 5px
          )`
        }}
      />

      {/* Top Sheen Highlight */}
      <div className="absolute top-0 left-0 right-0 h-2/5 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />

      {/* ISO Corner Castings (Esquineros ISO en las 4 esquinas) */}
      <ISOCornerCasting position="tl" />
      <ISOCornerCasting position="tr" />
      <ISOCornerCasting position="bl" />
      <ISOCornerCasting position="br" />

      {/* Bundle Badge */}
      {validationErrorType === 'BUNDLE' && bundleCount && (
        <div className="absolute top-0 right-0 bg-yellow-500 text-black font-mono font-black text-[8px] px-1 rounded-bl z-20">
          BDL:{bundleCount}
        </div>
      )}

      {/* Main Container Information Layout */}
      <div className="relative z-10 w-full h-full p-0.5 flex flex-col justify-between items-center text-center">
        {/* Header: Carrier / ISO */}
        <div className="w-full flex justify-between items-center px-0.5 pt-0.5 text-[7px] font-mono leading-none opacity-90" style={{ color: textColor }}>
          <span className="font-bold truncate max-w-[22px]" title={container.operator}>
            {container.operator !== NO_DATA ? container.operator : ''}
          </span>
          <span className="font-semibold">{container.iso !== NO_DATA ? container.iso : ''}</span>
        </div>

        {/* Center: POD Code (Normalized 3 Letters) */}
        <div
          className="font-black tracking-wider leading-none my-auto drop-shadow-md text-[10px] md:text-[11px]"
          style={{ color: textColor }}
        >
          {container.pod}
        </div>

        {/* Footer: Symbols (DG Diamond / Reefer / Empty / OOG / Weight) */}
        <div className="w-full flex items-center justify-between px-0.5 pb-0.5 leading-none">
          <div className="flex items-center gap-0.5 flex-wrap">
            {/* 1. Vacíos: E en círculo */}
            {isEmpty && <EmptyBadgeIcon size={13} />}

            {/* 2. IMOS: Clase en rombo */}
            {isDG && <DGDiamondIcon imoClass={container.imoClass} size={14} />}

            {/* 3. Reefers conectados: Grados de temp con símbolo de hielo */}
            {isReefer && (
              <span className="inline-flex items-center gap-0.5 bg-cyan-950/90 border border-cyan-400 text-cyan-200 font-extrabold text-[6.5px] px-0.5 rounded leading-tight" title={`Reefer Temp: ${container.temp || '-18°C'}`}>
                ❄️{container.temp && container.temp !== NO_DATA ? container.temp : '-18°C'}
              </span>
            )}

            {/* 4. OOG: Flechas indicando sobredimensión */}
            {isOOG && (
              <span className="inline-flex items-center text-purple-200 font-extrabold text-[7px] bg-purple-950/90 border border-purple-400 px-0.5 rounded leading-tight" title={`OOG: ${container.oogDim || 'Overdimension'}`}>
                ⬆️➡️
              </span>
            )}

            {/* 5. DC (Dry Cargo): ISO y Peso en Toneladas */}
            {!isEmpty && !isDG && !isReefer && !isOOG && (
              <div className="flex items-center gap-0.5 text-[6.5px] font-mono font-bold text-white/90 bg-black/40 px-0.5 rounded border border-white/20">
                <span>{container.iso !== NO_DATA ? container.iso : 'STD'}</span>
                {weightFormatted && <span className="text-emerald-300 font-black">{weightFormatted}</span>}
              </div>
            )}
          </div>

          {/* Weight badge if special container */}
          {(isEmpty || isDG || isReefer || isOOG) && weightFormatted && (
            <span
              className="text-[7px] font-mono font-bold leading-none px-0.5 rounded bg-black/50 text-emerald-300 border border-emerald-500/30"
            >
              {weightFormatted}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
