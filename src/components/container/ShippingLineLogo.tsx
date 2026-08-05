import React from 'react';

export interface ShippingLineInfo {
  code: string;
  name: string;
  color: string; // Background color for container body
  textColor: string;
  prefixes: string[];
}

export const SHIPPING_LINES: Record<string, ShippingLineInfo> = {
  MAERSK: {
    code: 'MAERSK',
    name: 'Maersk Line',
    color: '#2B80BF',
    textColor: '#FFFFFF',
    prefixes: ['MAEU', 'MSK', 'MSCU', 'MAERSK', 'APM']
  },
  MSC: {
    code: 'MSC',
    name: 'Mediterranean Shipping Co.',
    color: '#D49B22',
    textColor: '#000000',
    prefixes: ['MSCU', 'MEDU', 'MSC', 'MED']
  },
  CMA_CGM: {
    code: 'CMA CGM',
    name: 'CMA CGM Line',
    color: '#1E3163',
    textColor: '#FFFFFF',
    prefixes: ['CMAU', 'CMA', 'CGMU', 'CNC']
  },
  COSCO: {
    code: 'COSCO',
    name: 'COSCO Shipping Lines',
    color: '#104E8B',
    textColor: '#FFFFFF',
    prefixes: ['COSU', 'CSNU', 'COSCO', 'CCL']
  },
  HAPAG: {
    code: 'HAPAG-LLOYD',
    name: 'Hapag-Lloyd',
    color: '#E85A1C',
    textColor: '#FFFFFF',
    prefixes: ['HLBU', 'HLCU', 'HAPAG', 'HLC', 'CSQU']
  },
  ONE: {
    code: 'ONE',
    name: 'Ocean Network Express',
    color: '#D11578',
    textColor: '#FFFFFF',
    prefixes: ['ONEU', 'ONE', 'NYKU', 'MOLU', 'KLFU']
  },
  EVERGREEN: {
    code: 'EVERGREEN',
    name: 'Evergreen Line',
    color: '#0F7D42',
    textColor: '#FFFFFF',
    prefixes: ['EISU', 'EMCU', 'EVERGREEN', 'EGM', 'EGL']
  },
  HMM: {
    code: 'HMM',
    name: 'HMM (Hyundai)',
    color: '#A02222',
    textColor: '#FFFFFF',
    prefixes: ['HMMU', 'HDMU', 'HMM', 'HYUNDAI']
  },
  YANG_MING: {
    code: 'YANG MING',
    name: 'Yang Ming Line',
    color: '#1A365D',
    textColor: '#FFFFFF',
    prefixes: ['YMMU', 'YMLU', 'YANGMING', 'YML']
  },
  ZIM: {
    code: 'ZIM',
    name: 'ZIM Integrated Shipping',
    color: '#17325C',
    textColor: '#FFFFFF',
    prefixes: ['ZIMU', 'ZIM', 'ZCLU']
  },
  OOCL: {
    code: 'OOCL',
    name: 'Orient Overseas Container Line',
    color: '#C82127',
    textColor: '#FFFFFF',
    prefixes: ['OOCL', 'OOLU', 'OOC']
  },
  PIL: {
    code: 'PIL',
    name: 'Pacific International Lines',
    color: '#B71C1C',
    textColor: '#FFFFFF',
    prefixes: ['PCIU', 'PIL', 'PCIL']
  },
  WAN_HAI: {
    code: 'WAN HAI',
    name: 'Wan Hai Lines',
    color: '#1E386B',
    textColor: '#FFFFFF',
    prefixes: ['WHLU', 'WANHAI', 'WHA']
  },
  KMTC: {
    code: 'KMTC',
    name: 'KMTC Line',
    color: '#1E88E5',
    textColor: '#FFFFFF',
    prefixes: ['KMTU', 'KMTC']
  },
  TS_LINES: {
    code: 'TS LINES',
    name: 'TS Lines',
    color: '#D32F2F',
    textColor: '#FFFFFF',
    prefixes: ['TSLU', 'TSL']
  },
  HAMBURG_SUD: {
    code: 'HAMBURG SÜD',
    name: 'Hamburg Süd',
    color: '#C62828',
    textColor: '#FFFFFF',
    prefixes: ['SUDU', 'HASU', 'HAMBURG']
  },
  SM_LINE: {
    code: 'SM LINE',
    name: 'SM Line Corporation',
    color: '#E65100',
    textColor: '#FFFFFF',
    prefixes: ['SMLU', 'SML']
  },
  UNIFEEDER: {
    code: 'UNIFEEDER',
    name: 'Unifeeder',
    color: '#37474F',
    textColor: '#FFFFFF',
    prefixes: ['UNFU', 'UNIFEEDER']
  },
  SITC: {
    code: 'SITC',
    name: 'SITC Container Lines',
    color: '#0288D1',
    textColor: '#FFFFFF',
    prefixes: ['SITU', 'SITC']
  },
  IRISL: {
    code: 'IRISL',
    name: 'IRISL Group',
    color: '#0D47A1',
    textColor: '#FFFFFF',
    prefixes: ['IRSU', 'IRISL']
  },
  HEUNG_A: {
    code: 'HEUNG-A',
    name: 'Heung-A Shipping',
    color: '#2E7D32',
    textColor: '#FFFFFF',
    prefixes: ['HALU', 'HEUNG-A']
  },
  CK_LINE: {
    code: 'CK LINE',
    name: 'CK Line',
    color: '#F57C00',
    textColor: '#FFFFFF',
    prefixes: ['CKLU', 'CK']
  },
  NAMSUNG: {
    code: 'NAMSUNG',
    name: 'Namsung Shipping',
    color: '#D32F2F',
    textColor: '#FFFFFF',
    prefixes: ['NSSU', 'NAMSUNG']
  },
  CULINES: {
    code: 'CULINES',
    name: 'China United Lines',
    color: '#0288D1',
    textColor: '#FFFFFF',
    prefixes: ['CULU', 'CULINES']
  },
  DONGJIN: {
    code: 'DONGJIN',
    name: 'Dongjin Shipping',
    color: '#00695C',
    textColor: '#FFFFFF',
    prefixes: ['DJLU', 'DONGJIN']
  },
  SEACO: {
    code: 'SEACO',
    name: 'Seaco Global',
    color: '#1A237E',
    textColor: '#FFFFFF',
    prefixes: ['SEGU', 'SEACO']
  },
  TRITON: {
    code: 'TRITON',
    name: 'Triton Container',
    color: '#795548',
    textColor: '#FFFFFF',
    prefixes: ['TCLU', 'TRITON']
  },
  TEX: {
    code: 'TEX',
    name: 'TEX Tainer',
    color: '#8D5B28',
    textColor: '#FFFFFF',
    prefixes: ['TGHU', 'TEX']
  }
};

/**
 * Resolve shipping line info from operator string or container ID prefix
 */
export function resolveShippingLine(operator: string = '', containerId: string = ''): ShippingLineInfo {
  const opClean = operator.toUpperCase().trim();
  const idClean = containerId.toUpperCase().trim().substring(0, 4);

  // Direct Operator Name Match
  for (const key of Object.keys(SHIPPING_LINES)) {
    const line = SHIPPING_LINES[key];
    if (line.code === opClean || line.name.toUpperCase().includes(opClean) || opClean.includes(line.code)) {
      return line;
    }
  }

  // Prefix Match
  for (const key of Object.keys(SHIPPING_LINES)) {
    const line = SHIPPING_LINES[key];
    if (line.prefixes.some(p => p === idClean || idClean.startsWith(p) || opClean.includes(p))) {
      return line;
    }
  }

  // Fallback default generic line
  return {
    code: opClean || 'NAV',
    name: operator || 'Línea Naviera',
    color: '#263238',
    textColor: '#FFFFFF',
    prefixes: []
  };
}

/**
 * Render Vector SVG Brand Logo for Shipping Line
 */
export const ShippingLineLogo: React.FC<{ operator: string; containerId?: string; size?: number }> = ({
  operator,
  containerId = '',
  size = 18
}) => {
  const line = resolveShippingLine(operator, containerId);
  const code = line.code;

  switch (code) {
    case 'MAERSK':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className="flex-shrink-0">
          <rect width="32" height="32" rx="4" fill="#2B80BF" />
          <polygon
            points="16,4 19.5,12 28,12 21,17 23.5,25 16,20 8.5,25 11,17 4,12 12.5,12"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'MSC':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className="flex-shrink-0">
          <rect width="32" height="32" rx="4" fill="#D49B22" />
          <circle cx="16" cy="16" r="12" fill="#000000" />
          <text x="16" y="20" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="900" fontFamily="sans-serif">
            m sc
          </text>
        </svg>
      );

    case 'CMA CGM':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className="flex-shrink-0">
          <rect width="32" height="32" rx="4" fill="#1E3163" />
          <path d="M 6 12 L 26 12 L 20 22 L 6 22 Z" fill="#EF4444" />
          <path d="M 12 10 L 26 10 L 26 18 L 12 18 Z" fill="#00E5FF" opacity="0.8" />
          <text x="16" y="21" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="900" fontFamily="sans-serif">
            CMA
          </text>
        </svg>
      );

    case 'COSCO':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className="flex-shrink-0">
          <rect width="32" height="32" rx="4" fill="#104E8B" />
          <circle cx="16" cy="16" r="10" fill="none" stroke="#FFFFFF" strokeWidth="2" />
          <path d="M 6 16 C 6 10 26 10 26 16 C 26 22 6 22 6 16 Z" fill="none" stroke="#EF4444" strokeWidth="1.5" />
          <text x="16" y="20" textAnchor="middle" fill="#FFFFFF" fontSize="7" fontWeight="900" fontFamily="sans-serif">
            COSCO
          </text>
        </svg>
      );

    case 'HAPAG-LLOYD':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className="flex-shrink-0">
          <rect width="32" height="32" rx="4" fill="#E85A1C" />
          <polygon points="6,6 26,6 20,26 6,26" fill="#1A365D" />
          <polygon points="12,10 22,10 18,22 8,22" fill="#FFFFFF" />
        </svg>
      );

    case 'ONE':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className="flex-shrink-0">
          <rect width="32" height="32" rx="4" fill="#D11578" />
          <text x="16" y="21" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="900" fontFamily="monospace">
            ONE
          </text>
        </svg>
      );

    case 'EVERGREEN':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className="flex-shrink-0">
          <rect width="32" height="32" rx="4" fill="#0F7D42" />
          <circle cx="16" cy="16" r="10" fill="none" stroke="#FFFFFF" strokeWidth="2" />
          <text x="16" y="20" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="900" fontFamily="sans-serif">
            EMC
          </text>
        </svg>
      );

    case 'HMM':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className="flex-shrink-0">
          <rect width="32" height="32" rx="4" fill="#A02222" />
          <text x="16" y="21" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="900" fontFamily="monospace">
            HMM
          </text>
        </svg>
      );

    case 'YANG MING':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className="flex-shrink-0">
          <rect width="32" height="32" rx="4" fill="#1A365D" />
          <polygon points="16,6 26,24 6,24" fill="#EF4444" />
          <text x="16" y="21" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="900" fontFamily="sans-serif">
            YML
          </text>
        </svg>
      );

    case 'ZIM':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className="flex-shrink-0">
          <rect width="32" height="32" rx="4" fill="#17325C" />
          <text x="16" y="21" textAnchor="middle" fill="#F59E0B" fontSize="11" fontWeight="900" fontFamily="sans-serif">
            ZIM
          </text>
        </svg>
      );

    case 'OOCL':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className="flex-shrink-0">
          <rect width="32" height="32" rx="4" fill="#C82127" />
          <circle cx="16" cy="16" r="10" fill="none" stroke="#FFFFFF" strokeWidth="2" />
          <text x="16" y="20" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="900" fontFamily="sans-serif">
            OOCL
          </text>
        </svg>
      );

    default:
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className="flex-shrink-0">
          <rect width="32" height="32" rx="4" fill={line.color} />
          <text x="16" y="20" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="900" fontFamily="monospace">
            {code.substring(0, 3)}
          </text>
        </svg>
      );
  }
};
