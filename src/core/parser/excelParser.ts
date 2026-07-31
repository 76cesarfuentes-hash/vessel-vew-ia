import * as XLSX from 'xlsx';
import { Container } from '../models/container';
import { normalizePortCode, NO_DATA } from './portNormalizer';

export function parseExcelContainerList(fileBuffer: ArrayBuffer): Partial<Container>[] {
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  if (!workbook.SheetNames.length) return [];
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

  return rawRows.map(r => {
    const stRaw = String(r.FULL_EMPTY || r.STATUS || r.CARGO_TYPE || r.ESTADO || '').toUpperCase().trim();
    const isMT = stRaw === 'E' || stRaw === 'MT' || stRaw === 'EMPTY' || stRaw === 'VACIO' || stRaw === '4';
    const finalStatus: 'FULL' | 'EMPTY' = isMT ? 'EMPTY' : 'FULL';

    const rawId = String(r.CONTENEDOR || r.CONTAINER || r.CONTAINERS || r.ID || r.EQUIPMENT || '').trim().toUpperCase();
    const id = rawId || NO_DATA;

    const rawIso = String(r.ISO || r.CNTR_TYSZ_ISO || r.CNTR_TYSZ || r.TIPO_ISO || '').trim().toUpperCase();
    const iso = rawIso || NO_DATA;

    const pol = normalizePortCode(r.POL || r['PUERTO DE CARGA'] || r.PUERTO_CARGA);
    const pod = normalizePortCode(r.POD || r['PUERTO DE DESCARGA'] || r.PUERTO_DESCARGA);

    const imo = String(r.IMO || r.CLASE_IMO || r.IMO_CLASS || '').trim() || NO_DATA;
    const temp = String(r.RF || r.TEMP || r.TEMPERATURA || r.TEMPERATURE || '').trim() || NO_DATA;
    const oog = String(r.OS || r.OOG || r.SOBREDIMENSION || r.DIMENSION || '').trim();

    const weightStr = String(r.PESO || r.WEIGHT || r.VGM || r['PESO(TON)'] || '').trim();
    const position = String(r.POSICION || r.POSITION || r.CELL || r.PREPOS || '').trim() || NO_DATA;

    return {
      id,
      iso,
      pol,
      pod,
      status: finalStatus,
      imoClass: imo,
      temp: temp !== NO_DATA ? temp : 'DRY',
      oogDim: oog,
      weight: weightStr || NO_DATA,
      position
    };
  }).filter(c => c.id !== NO_DATA || c.iso !== NO_DATA);
}
