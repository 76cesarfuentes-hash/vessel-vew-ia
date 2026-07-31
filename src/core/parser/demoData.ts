import { Container } from '../models/container';

/**
 * Demo Realista de la Lógica BAPLIE + MOVINS
 * Puerto Actual: CLSAI (San Antonio, Chile)
 * Próximos Puertos: CLVAP (Valparaíso) -> PECLL (Callao) -> ECMEC (Guayaquil)
 */

export function generateSampleBaplieContainers(): Container[] {
  const common = {
    imoClass: 'Dato no disponible',
    unNumber: 'Dato no disponible',
    temp: 'DRY',
    hasDim: false
  };

  return [
    // 1. Bahía 11 (20') - Importación (CLSAI - San Antonio) -> Se descarga completa
    {
      id: 'TEMU1234567',
      iso: '22G1',
      position: '0110282',
      bay: '011',
      row: '02',
      tier: '82',
      size: 20,
      status: 'FULL',
      pol: 'LIR',
      pod: 'CLSAI',
      operator: 'MSC',
      cargoType: 'DC',
      weight: '18200',
      weightKg: 18200,
      source: 'BAPLIE',
      operation: 'DISCHARGE',
      ...common
    },
    {
      id: 'TEMU1234568',
      iso: '22G1',
      position: '0110284',
      bay: '011',
      row: '02',
      tier: '84',
      size: 20,
      status: 'FULL',
      pol: 'LIR',
      pod: 'CLSAI',
      operator: 'MSC',
      cargoType: 'DC',
      weight: '19100',
      weightKg: 19100,
      source: 'BAPLIE',
      operation: 'DISCHARGE',
      ...common
    },
    {
      id: 'TEMU1234569',
      iso: '22G1',
      position: '0110482',
      bay: '011',
      row: '04',
      tier: '82',
      size: 20,
      status: 'FULL',
      pol: 'LIR',
      pod: 'CLSAI',
      operator: 'MSC',
      cargoType: 'DC',
      weight: '17800',
      weightKg: 17800,
      source: 'BAPLIE',
      operation: 'DISCHARGE',
      ...common
    },

    // 2. Bahía 15 (40') - Tránsito (CLVAP - Valparaíso)
    {
      id: 'TGHU7654321',
      iso: '45G1',
      position: '0150282',
      bay: '015',
      row: '02',
      tier: '82',
      size: 40,
      status: 'FULL',
      pol: 'LIR',
      pod: 'CLVAP',
      operator: 'ONE',
      cargoType: 'DC',
      weight: '24500',
      weightKg: 24500,
      source: 'BAPLIE',
      operation: 'NO MOVE',
      ...common
    },
    {
      id: 'TGHU7654322',
      iso: '45G1',
      position: '0150284',
      bay: '015',
      row: '02',
      tier: '84',
      size: 40,
      status: 'FULL',
      pol: 'LIR',
      pod: 'CLVAP',
      operator: 'ONE',
      cargoType: 'DC',
      weight: '26100',
      weightKg: 26100,
      source: 'BAPLIE',
      operation: 'NO MOVE',
      ...common
    },
    {
      id: 'TGHU7654323',
      iso: '45G1',
      position: '0150482',
      bay: '015',
      row: '04',
      tier: '82',
      size: 40,
      status: 'FULL',
      pol: 'LIR',
      pod: 'CLVAP',
      operator: 'ONE',
      cargoType: 'DC',
      weight: '23800',
      weightKg: 23800,
      source: 'BAPLIE',
      operation: 'NO MOVE',
      ...common
    },

    // 3. Bahía 19 (20') - Tránsito (PECLL - Callao)
    {
      id: 'MSKU9876543',
      iso: '22G1',
      position: '0190282',
      bay: '019',
      row: '02',
      tier: '82',
      size: 20,
      status: 'FULL',
      pol: 'LIR',
      pod: 'PECLL',
      operator: 'MSK',
      cargoType: 'DC',
      weight: '16500',
      weightKg: 16500,
      source: 'BAPLIE',
      operation: 'NO MOVE',
      ...common
    },
    {
      id: 'MSKU9876544',
      iso: '22G1',
      position: '0190284',
      bay: '019',
      row: '02',
      tier: '84',
      size: 20,
      status: 'FULL',
      pol: 'LIR',
      pod: 'PECLL',
      operator: 'MSK',
      cargoType: 'DC',
      weight: '15900',
      weightKg: 15900,
      source: 'BAPLIE',
      operation: 'NO MOVE',
      ...common
    },
    {
      id: 'MSKU9876545',
      iso: '22G1',
      position: '0190482',
      bay: '019',
      row: '04',
      tier: '82',
      size: 20,
      status: 'FULL',
      pol: 'LIR',
      pod: 'PECLL',
      operator: 'MSK',
      cargoType: 'DC',
      weight: '17200',
      weightKg: 17200,
      source: 'BAPLIE',
      operation: 'NO MOVE',
      ...common
    },

    // 4. Bahía 23 (40') - Tránsito (ECMEC - Guayaquil)
    {
      id: 'HLCU5544332',
      iso: '45G1',
      position: '0230282',
      bay: '023',
      row: '02',
      tier: '82',
      size: 40,
      status: 'FULL',
      pol: 'LIR',
      pod: 'ECMEC',
      operator: 'HAP',
      cargoType: 'DC',
      weight: '28000',
      weightKg: 28000,
      source: 'BAPLIE',
      operation: 'NO MOVE',
      ...common
    },
    {
      id: 'HLCU5544333',
      iso: '45G1',
      position: '0230284',
      bay: '023',
      row: '02',
      tier: '84',
      size: 40,
      status: 'FULL',
      pol: 'LIR',
      pod: 'ECMEC',
      operator: 'HAP',
      cargoType: 'DC',
      weight: '27400',
      weightKg: 27400,
      source: 'BAPLIE',
      operation: 'NO MOVE',
      ...common
    },
    {
      id: 'HLCU5544334',
      iso: '45G1',
      position: '0230482',
      bay: '023',
      row: '04',
      tier: '82',
      size: 40,
      status: 'FULL',
      pol: 'LIR',
      pod: 'ECMEC',
      operator: 'HAP',
      cargoType: 'DC',
      weight: '25900',
      weightKg: 25900,
      source: 'BAPLIE',
      operation: 'NO MOVE',
      ...common
    }
  ];
}

/**
 * Generate EDI string for MOVINS demo
 */
export function generateSampleMovinsEDIString(): string {
  return [
    "UNA:+.? '",
    "UNB+UNOA:2+LINE+TERMINAL+260726:1000+00001'",
    "UNH+1+MOVINS:D:95B:UN:EDF01'",
    "BGM+110+MOVINS_DEMO_CLSAI+9'",
    "TDT+2+0123W+1++MSC:172+++MN SAN ANTONIO'",
    "LOC+9+CLSAI:139:6'",
    
    // 1. TEMU1234567 - Restiba de Importación -> Export
    "EQD+CN+TEMU1234567+22G1+5++5'",
    "LOC+147+0150682:139:6'",
    "LOC+11+CLVAP:139:6'",
    "LOC+9+CLSAI:139:6'",
    "MEA+WT+KGM+18200'",

    // 2. CAIU1122334 - Nueva Carga (Ocupa posición 0150282)
    "EQD+CN+CAIU1122334+45G1+5++5'",
    "LOC+147+0150282:139:6'",
    "LOC+11+CLVAP:139:6'",
    "LOC+9+CLSAI:139:6'",
    "MEA+WT+KGM+25000'",

    // 3. CAIU1122335 - Nueva Carga
    "EQD+CN+CAIU1122335+45G1+5++5'",
    "LOC+147+0150284:139:6'",
    "LOC+11+CLVAP:139:6'",
    "LOC+9+CLSAI:139:6'",
    "MEA+WT+KGM+24800'",

    // 4. CAIU1122336 - Nueva Carga
    "EQD+CN+CAIU1122336+45G1+5++5'",
    "LOC+147+0150482:139:6'",
    "LOC+11+CLVAP:139:6'",
    "LOC+9+CLSAI:139:6'",
    "MEA+WT+KGM+26200'",

    // 5. CAIU1122337 - Nueva Carga
    "EQD+CN+CAIU1122337+45G1+5++5'",
    "LOC+147+0150484:139:6'",
    "LOC+11+CLVAP:139:6'",
    "LOC+9+CLSAI:139:6'",
    "MEA+WT+KGM+25500'",

    // 6. CAIU1122338 - Nueva Carga
    "EQD+CN+CAIU1122338+45G1+5++5'",
    "LOC+147+0150684:139:6'",
    "LOC+11+CLVAP:139:6'",
    "LOC+9+CLSAI:139:6'",
    "MEA+WT+KGM+24100'",

    // 7. SEGU9988776 - Nueva Carga (PECLL)
    "EQD+CN+SEGU9988776+22G1+5++5'",
    "LOC+147+0190682:139:6'",
    "LOC+11+PECLL:139:6'",
    "LOC+9+CLSAI:139:6'",
    "MEA+WT+KGM+16800'",

    // 8. SEGU9988777 - Nueva Carga (PECLL)
    "EQD+CN+SEGU9988777+22G1+5++5'",
    "LOC+147+0190684:139:6'",
    "LOC+11+PECLL:139:6'",
    "LOC+9+CLSAI:139:6'",
    "MEA+WT+KGM+17400'",

    "UNT+35+1'",
    "UNZ+1+00001'"
  ].join("\n");
}
