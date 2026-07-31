export interface TerminalConfig {
  key: string;
  name: string;
  homePorts: string[]; // Normalized 3-letter codes, e.g. ["VER"]
  description: string;
}

export const TERMINAL_PROFILES: Record<string, TerminalConfig> = {
  CLSAI: {
    key: 'CLSAI',
    name: 'San Antonio, Chile (CLSAI / STI)',
    homePorts: ['CLSAI', 'SAI', 'SAN ANTONIO'],
    description: 'San Antonio Terminal Internacional, Chile'
  },
  VER: {
    key: 'VER',
    name: 'Veracruz (VER / ICAVE)',
    homePorts: ['VER', 'ICAVE'],
    description: 'Terminal Portuaria de Veracruz, México'
  },
  LZC: {
    key: 'LZC',
    name: 'Lázaro Cárdenas (LZC / LCT)',
    homePorts: ['LZC', 'LCT'],
    description: 'Lázaro Cárdenas Terminal Portuaria'
  },
  ETI: {
    key: 'ETI',
    name: 'Ensenada International Terminal (ETI)',
    homePorts: ['ETI', 'ESE'],
    description: 'Ensenada Terminal Internacional'
  },
  ZLO: {
    key: 'ZLO',
    name: 'Manzanillo (ZLO / TIMSA)',
    homePorts: ['ZLO', 'TIMSA'],
    description: 'Manzanillo Terminal Internacional'
  },
  HUTCHISON: {
    key: 'HUTCHISON',
    name: 'Hutchison Ports Network',
    homePorts: ['VER', 'LZC', 'ESE', 'ZLO'],
    description: 'Red Hutchison Ports México'
  },
  OTRA: {
    key: 'OTRA',
    name: 'Otra Terminal Marítima',
    homePorts: [],
    description: 'Configuración personalizada de puerto local'
  }
};
