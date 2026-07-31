import React from 'react';

/**
 * Dangerous Goods (DG) Diamond with perfectly centered IMO Class text
 */
export function DGDiamondIcon({ imoClass, size = 20 }: { imoClass: string; size?: number }) {
  const displayClass = imoClass && imoClass !== 'Dato no disponible' ? imoClass : '?';

  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className="drop-shadow-sm flex-shrink-0">
      {/* Outer Diamond */}
      <polygon
        points="16,2 30,16 16,30 2,16"
        fill="#EF4444"
        stroke="#FFFFFF"
        strokeWidth="1.5"
      />
      {/* Inner Border Line */}
      <polygon
        points="16,4 28,16 16,28 4,16"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="0.8"
        strokeDasharray="1 1"
      />
      {/* Perfectly Centered IMO Class text */}
      <text
        x="16"
        y="17"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#FFFFFF"
        fontSize={displayClass.length > 3 ? "8" : "11"}
        fontWeight="800"
        fontFamily="monospace"
        style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.8)' }}
      >
        {displayClass}
      </text>
    </svg>
  );
}

/**
 * Empty Container (Ⓔ) Badge SVG
 */
export function EmptyBadgeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="inline-block flex-shrink-0">
      <circle cx="12" cy="12" r="10" fill="rgba(0, 0, 0, 0.6)" stroke="#9CA3AF" strokeWidth="1.5" />
      <text
        x="12"
        y="12.5"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#E5E7EB"
        fontSize="12"
        fontWeight="900"
        fontFamily="sans-serif"
      >
        E
      </text>
    </svg>
  );
}

/**
 * Reefer Snowflake SVG
 */
export function ReeferSnowflakeIcon({ size = 14 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center text-cyan-300 font-bold drop-shadow-sm"
      style={{ fontSize: `${size}px`, lineHeight: 1 }}
      title="Reefer (Conexión requerida)"
    >
      ❄
    </span>
  );
}

/**
 * ISO Corner Casting (Esquinero ISO)
 */
export function ISOCornerCasting({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const posClasses = {
    tl: 'top-0 left-0 border-r border-b',
    tr: 'top-0 right-0 border-l border-b',
    bl: 'bottom-0 left-0 border-r border-t',
    br: 'bottom-0 right-0 border-l border-t'
  }[position];

  return (
    <div
      className={`absolute w-1.5 h-1.5 bg-neutral-900 border-neutral-400 z-10 opacity-80 ${posClasses}`}
      style={{ boxShadow: 'inset 0 0 1px rgba(255,255,255,0.4)' }}
    />
  );
}
