import { Container, getEffectiveCargoType } from '../models/container';
import { FilterState, DEFAULT_FILTER_STATE } from '../models/filter';
import { normalizePortCode, NO_DATA } from '../parser/portNormalizer';
import { TERMINAL_PROFILES } from '../models/terminal';

export function applyFilters(
  containers: Container[],
  filters: FilterState,
  activeTerminalKey: string
): Container[] {
  if (!containers || containers.length === 0) return [];

  const terminalProfile = TERMINAL_PROFILES[activeTerminalKey] || TERMINAL_PROFILES.VER;
  const homePorts = terminalProfile.homePorts.map(p => normalizePortCode(p));
  const activeTerminalPortNorm = normalizePortCode(activeTerminalKey);

  const isHomePort = (port: string) => {
    const norm = normalizePortCode(port);
    return norm === activeTerminalPortNorm || homePorts.includes(norm);
  };

  return containers.filter(c => {
    const cPodNorm = normalizePortCode(c.pod);
    const cPolNorm = normalizePortCode(c.pol);
    const effType = getEffectiveCargoType(c);

    // 1. Category Filter
    if (filters.category === 'IMPORT') {
      if (!isHomePort(c.pod)) return false;
    } else if (filters.category === 'EXPORT') {
      if (!isHomePort(c.pol)) return false;
    } else if (filters.category === 'TRANSIT') {
      if (isHomePort(c.pod) || isHomePort(c.pol)) return false;
    }

    // 2. Status Filter (Full / Empty)
    if (filters.status === 'EMPTY') {
      if (c.status !== 'EMPTY' && effType !== 'MT') return false;
    } else if (filters.status === 'FULL') {
      if (c.status === 'EMPTY' || effType === 'MT') return false;
    }

    // 3. Cargo Type Filter
    if (filters.cargoType && filters.cargoType !== 'ALL') {
      if (effType !== filters.cargoType) return false;
    }

    // 4. Operator Filter
    if (filters.operator !== 'ALL' && c.operator !== filters.operator) {
      return false;
    }

    // 5. POD Filter
    if (filters.pod !== 'ALL' && cPodNorm !== normalizePortCode(filters.pod)) {
      return false;
    }

    // 6. POL Filter
    if (filters.pol !== 'ALL' && cPolNorm !== normalizePortCode(filters.pol)) {
      return false;
    }

    // 7. Bay Filter
    if (filters.bay !== 'ALL' && c.bay !== filters.bay) {
      return false;
    }

    // 8. Row Filter
    if (filters.row !== 'ALL' && c.row !== filters.row) {
      return false;
    }

    // 9. Tier Filter
    if (filters.tier !== 'ALL' && c.tier !== filters.tier) {
      return false;
    }

    // 10. ISO Type Filter
    if (filters.iso !== 'ALL' && c.iso !== filters.iso) {
      return false;
    }

    // 11. IMO Class Filter
    if (filters.imoClass !== 'ALL' && c.imoClass !== filters.imoClass) {
      return false;
    }

    // 12. Search Query (Container ID / Position / ISO / Operator - supports bulk multi-container search)
    if (filters.searchQuery && filters.searchQuery.trim() !== '') {
      const terms = filters.searchQuery.trim().split(/[\s,;\n]+/).filter(t => t.length > 0);
      if (terms.length > 0) {
        const matchesAnyTerm = terms.some(t => {
          const q = t.toUpperCase();
          const digits = q.replace(/\D/g, '');
          const cId = (c.id || '').toUpperCase();
          const cDigits = cId.replace(/\D/g, '');
          const cPos = (c.position || '').toUpperCase();
          const cIso = (c.iso || '').toUpperCase();
          const cOp = (c.operator || '').toUpperCase();
          const cPod = (c.pod || '').toUpperCase();

          // Exact or precise container ID match
          const matchesExactId = cId === q;
          const matchesIdSubstring = q.length >= 3 && cId.includes(q);
          const matchesDigits = digits.length >= 6
            ? cDigits.includes(digits)
            : (digits.length >= 2 && cDigits === digits);

          const matchesPos = cPos === q || (q.length >= 4 && cPos.includes(q));
          const matchesIso = cIso === q;
          const matchesOp = cOp === q;
          const matchesPod = cPod === q;

          return matchesExactId || matchesIdSubstring || matchesDigits || matchesPos || matchesIso || matchesOp || matchesPod;
        });

        if (!matchesAnyTerm) {
          return false;
        }
      }
    }

    return true;
  });
}

export interface OperationalSummaryStats {
  total: number;
  importCount: number;
  exportCount: number;
  transitCount: number;
  emptyCount: number;
  fullCount: number;
  dgCount: number;
  reeferCount: number;
  oogCount: number;
  tankCount: number;
  dryCount: number;
  totalWeightKg: number;
}

export function computeOperationalSummary(
  containers: Container[],
  activeTerminalKey: string
): OperationalSummaryStats {
  const terminalProfile = TERMINAL_PROFILES[activeTerminalKey] || TERMINAL_PROFILES.VER;
  const homePorts = terminalProfile.homePorts.map(p => normalizePortCode(p));
  const activeTerminalPortNorm = normalizePortCode(activeTerminalKey);

  const isHomePort = (port: string) => {
    const norm = normalizePortCode(port);
    return norm === activeTerminalPortNorm || homePorts.includes(norm);
  };

  let importCount = 0;
  let exportCount = 0;
  let transitCount = 0;
  let emptyCount = 0;
  let fullCount = 0;
  let dgCount = 0;
  let reeferCount = 0;
  let oogCount = 0;
  let tankCount = 0;
  let dryCount = 0;
  let totalWeightKg = 0;

  containers.forEach(c => {
    const effType = getEffectiveCargoType(c);

    if (isHomePort(c.pod)) importCount++;
    else if (isHomePort(c.pol)) exportCount++;
    else transitCount++;

    if (effType === 'MT' || c.status === 'EMPTY') emptyCount++;
    else fullCount++;

    if (effType === 'DG') dgCount++;
    if (effType === 'RF') reeferCount++;
    if (effType === 'OS') oogCount++;
    if (effType === 'TK') tankCount++;
    if (effType === 'DC') dryCount++;

    const w = parseFloat(c.weight);
    if (!isNaN(w)) totalWeightKg += w;
  });

  return {
    total: containers.length,
    importCount,
    exportCount,
    transitCount,
    emptyCount,
    fullCount,
    dgCount,
    reeferCount,
    oogCount,
    tankCount,
    dryCount,
    totalWeightKg
  };
}
