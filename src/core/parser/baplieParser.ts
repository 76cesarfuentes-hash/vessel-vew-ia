import { Container, CargoType } from '../models/container';
import { normalizePortCode, NO_DATA } from './portNormalizer';
import { parseEqdStatus } from './movinsParser';

export interface BaplieHeaderInfo {
  vesselName: string;
  voyage: string;
  callSign?: string;
  imoNumber?: string;
  eta?: string;
  etb?: string;
  etd?: string;
  pol?: string;
  pod?: string;
}

export function formatEdiDate(raw: string): string {
  if (!raw) return '';
  const clean = raw.replace(/\D/g, '');
  if (clean.length >= 8) {
    const yyyy = clean.substring(0, 4);
    const mm = clean.substring(4, 6);
    const dd = clean.substring(6, 8);
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const monthIndex = parseInt(mm, 10) - 1;
    const monthStr = (monthIndex >= 0 && monthIndex < 12) ? months[monthIndex] : mm;
    let timeStr = '';
    if (clean.length >= 12) {
      const hh = clean.substring(8, 10);
      const min = clean.substring(10, 12);
      timeStr = ` ${hh}:${min}`;
    }
    return `${dd}-${monthStr}-${yyyy}${timeStr}`;
  }
  return raw;
}

export function parseBaplieText(ediText: string): { containers: Container[]; uniqueBays: string[]; headerInfo: BaplieHeaderInfo } {
  const headerInfo: BaplieHeaderInfo = {
    vesselName: '',
    voyage: '',
    callSign: '',
    imoNumber: '',
    eta: '',
    etb: '',
    etd: '',
    pol: '',
    pod: ''
  };

  if (!ediText || !ediText.trim()) {
    return { containers: [], uniqueBays: [], headerInfo };
  }

  const segments = ediText.split(/['\r\n]+/).map(s => s.trim()).filter(s => s.length > 0);
  const containers: Container[] = [];
  const uniqueBaysSet = new Set<string>();

  let current: Partial<Container> & { _committed?: boolean; rawSegments?: string[] } | null = null;

  function commitCurrent() {
    if (!current || current._committed) return;
    if (!current.position || current.position === NO_DATA || current.position === '') return;

    current._committed = true;

    const iso = (current.iso && current.iso !== NO_DATA) ? current.iso : NO_DATA;
    const isoUp = iso.toUpperCase();

    // Size detection
    let size: 20 | 40 | 45 = 20;
    if (isoUp.startsWith('4') || isoUp.startsWith('L') || isoUp.startsWith('M')) {
      size = 40;
    } else if (isoUp.startsWith('P') || isoUp.startsWith('F')) {
      size = 20;
    }

    // Status detection ('4' = empty, '5' = full in EDIFACT EQD)
    const isStatusEmpty = current.status === 'EMPTY' || (current as any).rawStatus === '4' || current.status === '4' as any;
    const finalStatus: 'FULL' | 'EMPTY' = isStatusEmpty ? 'EMPTY' : 'FULL';

    // Cargo Type classification
    let cargoType: CargoType = 'DC';
    const isRefIso = (isoUp.includes('R') || isoUp.includes('3')) && isoUp !== NO_DATA;

    if (finalStatus === 'EMPTY') {
      cargoType = 'MT';
    } else if (current.imoClass && current.imoClass !== NO_DATA) {
      cargoType = 'DG';
    } else if (isoUp.includes('T') || isoUp.includes('K')) {
      cargoType = 'TK';
    } else if (current.hasDim || current.oogTop || current.oogLeft || current.oogRight) {
      cargoType = 'OS';
    } else if (isRefIso || (current.temp && current.temp !== NO_DATA)) {
      cargoType = 'RF';
    }

    const containerId = current.id && current.id.trim() ? current.id.trim().toUpperCase() : NO_DATA;
    const pos = current.position || NO_DATA;

    let bay = NO_DATA;
    let row = NO_DATA;
    let tier = NO_DATA;

    if (pos.length >= 6) {
      const rBay = pos.length === 7 ? pos.substring(0, 3) : pos.substring(0, 2);
      bay = parseInt(rBay, 10).toString().padStart(2, '0');
      row = pos.length === 7 ? pos.substring(3, 5) : pos.substring(2, 4);
      tier = pos.length === 7 ? pos.substring(5, 7) : pos.substring(4, 6);
      uniqueBaysSet.add(bay);
    }

    const wStr = current.weight && current.weight !== NO_DATA ? current.weight : NO_DATA;
    const wNum = parseFloat(wStr);

    const containerObj: Container = {
      id: containerId,
      iso: iso,
      position: pos,
      bay: bay,
      row: row,
      tier: tier,
      size: size,
      status: finalStatus,
      pol: normalizePortCode(current.pol),
      pod: normalizePortCode(current.pod),
      operator: current.operator && current.operator !== NO_DATA ? current.operator : NO_DATA,
      cargoType: cargoType,
      weight: wStr,
      weightKg: !isNaN(wNum) ? wNum : undefined,
      imoClass: current.imoClass && current.imoClass !== NO_DATA ? current.imoClass : NO_DATA,
      unNumber: current.unNumber && current.unNumber !== NO_DATA ? current.unNumber : NO_DATA,
      temp: current.temp && current.temp !== NO_DATA ? current.temp : NO_DATA,
      hasDim: !!current.hasDim,
      oogTop: !!current.oogTop,
      oogLeft: !!current.oogLeft,
      oogRight: !!current.oogRight,
      oogFront: !!current.oogFront,
      oogBack: !!current.oogBack,
      oogDim: current.oogDim ? current.oogDim.trim() : undefined,
      source: 'BAPLIE',
      operation: 'NO MOVE'
    };

    containers.push(containerObj);
  }

  for (const seg of segments) {
    const comp = seg.split('+');
    const tag = (comp[0] || '').toUpperCase();

    if (tag === 'TDT') {
      if (comp[2]) headerInfo.voyage = comp[2].trim();
      const vComp = comp[8] || comp[5] || comp[4] || '';
      if (vComp) {
        const parts = vComp.split(':').map(p => p.trim()).filter(Boolean);
        const namePart = [...parts].reverse().find(p => /[A-Za-z]/.test(p) && p !== '103' && p !== '172' && p !== '139' && p !== '102');
        if (namePart) headerInfo.vesselName = namePart;
        const imoPart = parts.find(p => /^\d{7}$/.test(p));
        if (imoPart) headerInfo.imoNumber = imoPart;
      }
    } else if (tag === 'DTM') {
      const sub = (comp[1] || '').split(':');
      const qual = sub[0];
      const dateVal = sub[1];
      if (dateVal) {
        const formatted = formatEdiDate(dateVal);
        if (qual === '132') headerInfo.eta = formatted;
        else if (qual === '178') headerInfo.etb = formatted;
        else if (qual === '133') headerInfo.etd = formatted;
      }
    } else if (tag === 'LOC') {
      const type = comp[1];
      const val = (comp[2] || '').split(':')[0].trim();

      if (!current && (type === '5' || type === '9')) {
        headerInfo.pol = normalizePortCode(val);
      } else if (!current && (type === '6' || type === '11')) {
        headerInfo.pod = normalizePortCode(val);
      }

      if (type === '147') { // Stowage position
        if (current && current.id !== NO_DATA && current.position) commitCurrent();

        current = {
          id: NO_DATA,
          iso: NO_DATA,
          position: val,
          status: 'FULL',
          pol: NO_DATA,
          pod: NO_DATA,
          operator: NO_DATA,
          weight: NO_DATA,
          imoClass: NO_DATA,
          unNumber: NO_DATA,
          temp: NO_DATA,
          hasDim: false,
          oogDim: ''
        };
      } else if (type === '9' && current) {
        current.pol = val || NO_DATA;
      } else if (type === '11' && current) {
        current.pod = val || NO_DATA;
      }
    } else if (tag === 'EQD') {
      if (current && current.id !== NO_DATA && current.position) commitCurrent();
      if (!current) {
        current = {
          id: NO_DATA,
          iso: NO_DATA,
          position: NO_DATA,
          status: 'FULL',
          pol: NO_DATA,
          pod: NO_DATA,
          operator: NO_DATA,
          weight: NO_DATA,
          imoClass: NO_DATA,
          unNumber: NO_DATA,
          temp: NO_DATA,
          hasDim: false,
          oogDim: ''
        };
      }

      current.id = (comp[2] || '').trim() || NO_DATA;
      current.iso = (comp[3] || '').trim() || NO_DATA;
      const stResult = parseEqdStatus(comp);
      (current as any).rawStatus = stResult.rawStatus;
      current.status = stResult.status;

    } else if (tag === 'MOV' && current) {
      if (comp[1]) current.position = comp[1].trim();
    } else if (tag === 'NAD' && current) {
      const qual = (comp[1] || '').toUpperCase();
      if (qual === 'CF' || qual === 'CA' || qual === 'VO' || qual === 'CN' || qual === 'N2' || current.operator === NO_DATA) {
        const op = (comp[2] || '').split(':')[0].trim().toUpperCase();
        if (op) current.operator = op;
      }
    } else if (tag === 'DGS' && current) {
      const newImo = (comp[2] || '').trim();
      const newUn = comp[3] ? comp[3].split(':')[0].trim() : '';
      if (newImo || newUn) {
        if (current.imoClass === NO_DATA) {
          current.imoClass = newImo || NO_DATA;
          current.unNumber = newUn || NO_DATA;
        } else {
          if (newImo) current.imoClass += '/' + newImo;
          if (newUn) current.unNumber += '/' + newUn;
        }
      }
    } else if (tag === 'TMP' && current) {
      const tv = comp[2] || comp[1] || '';
      const m = tv.match(/([-\d.]+)/);
      if (m) {
        current.temp = m[1] + '°C';
      }
    } else if (tag === 'DIM' && current) {
      const dc = (comp[1] || '').trim();
      if (['5', '6', '7', '8', '9', '13', '14'].includes(dc)) {
        current.hasDim = true;
        const rawVal = comp[2] ? comp[2].replace(/'/g, '').trim() : '';
        const cleanStr = rawVal.replace(/[a-zA-Z:]+/g, ' ').trim();
        const numStr = cleanStr.split(/\s+/)[0];
        const num = parseFloat(numStr);

        if (!isNaN(num) && num > 0) {
          const valObj = (num > 10 ? num / 100 : num).toFixed(2);
          if (dc === '9' || dc === '13') { current.oogTop = true; current.oogDim = (current.oogDim || '') + `T:${valObj}cm `; }
          else if (dc === '7') { current.oogRight = true; current.oogDim = (current.oogDim || '') + `R:${valObj}cm `; }
          else if (dc === '8') { current.oogLeft = true; current.oogDim = (current.oogDim || '') + `L:${valObj}cm `; }
          else if (dc === '5') { current.oogFront = true; current.oogDim = (current.oogDim || '') + `F:${valObj}cm `; }
          else if (dc === '6') { current.oogBack = true; current.oogDim = (current.oogDim || '') + `B:${valObj}cm `; }
        }
      }
    } else if (tag === 'MEA' && current) {
      const fs = seg.toUpperCase();
      if (fs.includes('WT') || fs.includes('VGM') || fs.includes('AAE')) {
        const m = fs.match(/(?:KGM|LBR)[:+]*(\d+(?:\.\d+)?)/) || fs.match(/[:+](\d+(?:\.\d+)?)/);
        if (m && current.weight === NO_DATA) {
          const vr = parseFloat(m[1]);
          current.weight = Math.round(vr).toString();
        }
      }
    }
  }

  if (current && current.position && current.position !== NO_DATA) {
    commitCurrent();
  }

  // Deduplicate by key
  const dedupeMap = new Map<string, Container>();
  containers.forEach(c => {
    const key = `${c.position}|${c.id}|${c.iso}`;
    if (!dedupeMap.has(key)) dedupeMap.set(key, c);
  });

  const finalContainers = Array.from(dedupeMap.values());
  const sortedBays = Array.from(uniqueBaysSet).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  return { containers: finalContainers, uniqueBays: sortedBays, headerInfo };
}
