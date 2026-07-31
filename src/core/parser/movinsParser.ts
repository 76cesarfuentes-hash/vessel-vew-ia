import { normalizePortCode, NO_DATA } from './portNormalizer';

export interface MovinsMovement {
  id: string;
  iso: string;
  position: string;
  pod: string;
  pol: string;
  operator: string;
  imoClass: string;
  temp: string;
  hasHanRes: boolean;
  hasDim: boolean;
  weight: string;
  seq: number;
  status: 'FULL' | 'EMPTY';
  rawStatus?: string;
}

/**
 * Parses EDIFACT EQD segment for status:
 * 5 = FULL (Lleno)
 * 4 = EMPTY (Vacío)
 */
export function parseEqdStatus(comp: string[]): { status: 'FULL' | 'EMPTY'; rawStatus: string } {
  const candidates = comp.slice(4).map(s => s.trim().toUpperCase());

  // Check elements backwards as 8169 status indicator is near the end
  for (let i = candidates.length - 1; i >= 0; i--) {
    const val = candidates[i];
    if (val === '4' || val === 'EMPTY' || val === 'VACIO' || val === 'MT') {
      return { status: 'EMPTY', rawStatus: candidates[i] };
    }
    if (val === '5' || val === 'FULL' || val === 'LLENO') {
      return { status: 'FULL', rawStatus: candidates[i] };
    }
  }

  // Fallback: search for character '4' or '5' in components
  for (let i = candidates.length - 1; i >= 0; i--) {
    const val = candidates[i];
    if (val.includes('4')) return { status: 'EMPTY', rawStatus: candidates[i] };
    if (val.includes('5')) return { status: 'FULL', rawStatus: candidates[i] };
  }

  return { status: 'FULL', rawStatus: '' };
}

export function parseMovinsText(text: string): MovinsMovement[] {
  if (!text || !text.trim()) return [];

  const segments = text.split(/['\r\n]+/).map(s => s.trim()).filter(Boolean);
  const movements: MovinsMovement[] = [];
  let seq = 0;

  const createFresh = () => ({
    id: NO_DATA,
    iso: NO_DATA,
    position: NO_DATA,
    pod: NO_DATA,
    pol: NO_DATA,
    operator: NO_DATA,
    imoClass: NO_DATA,
    temp: NO_DATA,
    hasHanRes: false,
    hasDim: false,
    weight: NO_DATA,
    seq: 0,
    status: 'FULL' as 'FULL' | 'EMPTY',
    rawStatus: ''
  });

  let current = createFresh();

  const commit = (m: typeof current) => {
    if (!m || (m.id === NO_DATA && m.position === NO_DATA)) return;
    m.seq = seq++;
    movements.push(m);
  };

  segments.forEach(seg => {
    const comp = seg.split('+');
    const tag = (comp[0] || '').toUpperCase();

    if (tag === 'LOC' && comp[1] === '147') {
      if (current.position !== NO_DATA) {
        commit(current);
        current = createFresh();
      }
      current.position = (comp[2] || '').split(':')[0].trim() || NO_DATA;
    } else if (tag === 'LOC' && comp[1] === '11') {
      const raw = (comp[2] || '').split(':')[0].trim();
      current.pod = normalizePortCode(raw);
    } else if (tag === 'LOC' && comp[1] === '9') {
      const raw = (comp[2] || '').split(':')[0].trim();
      current.pol = normalizePortCode(raw);
    } else if (tag === 'EQD') {
      if (current.id !== NO_DATA) {
        commit(current);
        current = createFresh();
      }
      current.id = (comp[2] || '').trim().toUpperCase() || NO_DATA;
      current.iso = (comp[3] || '').trim() || NO_DATA;
      
      const stResult = parseEqdStatus(comp);
      current.status = stResult.status;
      current.rawStatus = stResult.rawStatus;
    } else if (tag === 'NAD') {
      const qual = (comp[1] || '').toUpperCase();
      if (qual === 'CF' || qual === 'CA' || qual === 'VO' || qual === 'CN' || qual === 'N2' || current.operator === NO_DATA) {
        const op = (comp[2] || '').split(':')[0].trim().toUpperCase();
        if (op) current.operator = op;
      }
    } else if (tag === 'HAN') {
      if (seg.toUpperCase().includes('RES')) {
        current.hasHanRes = true;
      }
    } else if (tag === 'DGS') {
      const imo = (comp[2] || '').trim();
      if (imo) current.imoClass = imo;
    } else if (tag === 'TMP') {
      const tv = comp[2] || comp[1] || '';
      const m = tv.match(/([-\d.]+)/);
      if (m) current.temp = m[1] + '°C';
    } else if (tag === 'DIM') {
      current.hasDim = true;
    } else if (tag === 'MEA') {
      const m = seg.match(/(?:KGM)[:+]*(\d+(?:\.\d+)?)/) || seg.match(/[:+](\d+(?:\.\d+)?)/);
      if (m && current.weight === NO_DATA) {
        current.weight = Math.round(parseFloat(m[1])).toString();
      }
    }
  });

  commit(current);
  return movements;
}
