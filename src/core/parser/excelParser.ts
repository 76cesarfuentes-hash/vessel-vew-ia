import * as XLSX from 'xlsx';
import { Container, CargoType } from '../models/container';
import { normalizePortCode, NO_DATA } from './portNormalizer';

export interface ExtendedExcelContainer extends Partial<Container> {
  yardPosition?: string;
  cargoType?: CargoType;
  size?: 20 | 40 | 45;
  weightKg?: number;
}

export function parseExcelContainerList(fileBuffer: ArrayBuffer): ExtendedExcelContainer[] {
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  if (!workbook.SheetNames.length) return [];
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

  return rawRows.map((r, idx) => {
    const stRaw = String(r.FULL_EMPTY || r.STATUS || r.ESTADO || r.TYPE || '').toUpperCase().trim();
    const isMT = stRaw === 'E' || stRaw === 'MT' || stRaw === 'EMPTY' || stRaw === 'VACIO' || stRaw === '4';
    const finalStatus: 'FULL' | 'EMPTY' = isMT ? 'EMPTY' : 'FULL';

    const rawId = String(r.CONTENEDOR || r.CONTAINER || r.CONTAINER_NUMBER || r.CONTAINERS || r.ID || r.EQUIPMENT || '').trim().toUpperCase();
    const id = rawId || `CNTR-${1000 + idx}`;

    const rawIso = String(r.ISO || r.ISO_TYPE || r.CNTR_TYSZ_ISO || r.CNTR_TYSZ || r.TIPO_ISO || r.SIZE || '').trim().toUpperCase();
    const iso = rawIso || '4510';

    // Size determination
    let size: 20 | 40 | 45 = 40;
    if (iso.startsWith('2') || rawIso.includes('20') || rawIso === '2210' || rawIso === '22G1' || rawIso === '22R1') {
      size = 20;
    } else if (iso.startsWith('L') || iso.startsWith('9') || rawIso.includes('45')) {
      size = 45;
    } else {
      size = 40;
    }

    const pol = normalizePortCode(r.POL || r['PUERTO DE CARGA'] || r.PUERTO_CARGA || 'VER');
    const pod = normalizePortCode(r.POD || r['PUERTO DE DESCARGA'] || r.PUERTO_DESCARGA || 'HOU');

    const imo = String(r.IMO || r.CLASE_IMO || r.IMO_CLASS || r.DG || '').trim() || NO_DATA;
    const temp = String(r.RF || r.TEMP || r.TEMPERATURA || r.TEMPERATURE || r.REEFER || '').trim() || NO_DATA;
    const oog = String(r.OS || r.OOG || r.SOBREDIMENSION || r.DIMENSION || '').trim();

    // Cargo Type
    let cargoType: CargoType = 'DC';
    if (isMT) {
      cargoType = 'MT';
    } else if (temp !== NO_DATA && temp !== 'DRY' && temp !== 'N/A') {
      cargoType = 'RF';
    } else if (imo !== NO_DATA && imo !== 'NONE' && imo !== 'NO') {
      cargoType = 'DG';
    } else if (oog && oog !== NO_DATA && oog !== 'NONE') {
      cargoType = 'OS';
    } else if (r.CARGO_TYPE) {
      const ct = String(r.CARGO_TYPE).trim().toUpperCase();
      if (['DC', 'RF', 'DG', 'OS', 'MT', 'TK'].includes(ct)) {
        cargoType = ct as CargoType;
      }
    }

    // Weight parsing
    const weightValRaw = String(r.PESO || r.WEIGHT || r.VGM || r['PESO(TON)'] || r['PESO_KG'] || '').trim();
    let weightKg = 18000;
    if (weightValRaw) {
      const num = parseFloat(weightValRaw.replace(/[^0-9.]/g, ''));
      if (!isNaN(num) && num > 0) {
        // If weight < 100, assume Tons -> convert to KG
        weightKg = num < 100 ? Math.round(num * 1000) : Math.round(num);
      }
    }
    const weightStr = `${Math.round(weightKg / 1000)}T (${weightKg} KG)`;

    // Yard Position / Tonga
    const yardPosition = String(r.YARD_POSITION || r.YARD_POS || r.TONGA || r.POSICION_PATIO || r.PATIO || r.CELL || r.PREPOS || '').trim() || `PATIO-Y${Math.floor(idx / 5) + 1}-S${(idx % 5) + 1}`;

    const operator = String(r.OPERATOR || r.OPERADOR || r.LINE || r.LINEA || r.CARRIER || '').trim().toUpperCase() || 'MSC';

    return {
      id,
      iso,
      size,
      pol,
      pod,
      status: finalStatus,
      cargoType,
      operator,
      imoClass: imo,
      temp: temp !== NO_DATA ? temp : (cargoType === 'RF' ? '-18.0°C' : 'DRY'),
      oogDim: oog,
      weight: weightStr,
      weightKg,
      yardPosition,
      position: 'UNASSIGNED',
      hasDim: cargoType === 'OS'
    };
  }).filter(c => c.id !== NO_DATA);
}

