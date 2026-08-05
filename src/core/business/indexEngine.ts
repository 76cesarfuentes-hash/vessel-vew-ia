import { Container, getEffectiveCargoType } from '../models/container';
import { normalizePortCode, NO_DATA } from '../parser/portNormalizer';

export interface MasterIndexes {
  containerIndex: Map<string, Container>;
  positionIndex: Map<string, Container>;
  bayIndex: Map<string, Container[]>;
  podIndex: Map<string, Container[]>;
  polIndex: Map<string, Container[]>;
  imoIndex: Map<string, Container[]>;
  unIndex: Map<string, Container[]>;
  isoIndex: Map<string, Container[]>;
  cargoTypeIndex: Map<string, Container[]>;
  operatorIndex: Map<string, Container[]>;
  agentIndex: Map<string, Container[]>;
  reeferIndex: Container[];
  oogIndex: Container[];
  emptyIndex: Container[];
  tankIndex: Container[];
  allPods: string[];
  allPols: string[];
  allOperators: string[];
}

export function buildMasterIndexes(containers: Container[]): MasterIndexes {
  const containerIndex = new Map<string, Container>();
  const positionIndex = new Map<string, Container>();
  const bayIndex = new Map<string, Container[]>();
  const podIndex = new Map<string, Container[]>();
  const polIndex = new Map<string, Container[]>();
  const imoIndex = new Map<string, Container[]>();
  const unIndex = new Map<string, Container[]>();
  const isoIndex = new Map<string, Container[]>();
  const cargoTypeIndex = new Map<string, Container[]>();
  const operatorIndex = new Map<string, Container[]>();
  const agentIndex = new Map<string, Container[]>();

  const reeferIndex: Container[] = [];
  const oogIndex: Container[] = [];
  const emptyIndex: Container[] = [];
  const tankIndex: Container[] = [];

  const podSet = new Set<string>();
  const polSet = new Set<string>();
  const operatorSet = new Set<string>();

  containers.forEach(c => {
    // Container ID Index
    if (c.id && c.id !== NO_DATA) {
      const cleanId = c.id.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      containerIndex.set(cleanId, c);
      containerIndex.set(c.id.trim().toUpperCase(), c);
    }

    // Position Index (BayRowTier)
    if (c.position && c.position !== NO_DATA) {
      positionIndex.set(c.position.trim(), c);
    }

    // Bay Index
    if (c.bay && c.bay !== NO_DATA) {
      const bKey = c.bay.trim().padStart(2, '0');
      if (!bayIndex.has(bKey)) bayIndex.set(bKey, []);
      bayIndex.get(bKey)!.push(c);
    }

    // POD Index
    const normPod = normalizePortCode(c.pod);
    if (normPod !== NO_DATA) {
      podSet.add(normPod);
      if (!podIndex.has(normPod)) podIndex.set(normPod, []);
      podIndex.get(normPod)!.push(c);
    }

    // POL Index
    const normPol = normalizePortCode(c.pol);
    if (normPol !== NO_DATA) {
      polSet.add(normPol);
      if (!polIndex.has(normPol)) polIndex.set(normPol, []);
      polIndex.get(normPol)!.push(c);
    }

    // IMO Index
    if (c.imoClass && c.imoClass !== NO_DATA && c.imoClass !== '-') {
      const imoKey = c.imoClass.trim();
      if (!imoIndex.has(imoKey)) imoIndex.set(imoKey, []);
      imoIndex.get(imoKey)!.push(c);
    }

    // UN Number Index
    if (c.unNumber && c.unNumber !== NO_DATA && c.unNumber !== '-') {
      const unKey = c.unNumber.trim();
      if (!unIndex.has(unKey)) unIndex.set(unKey, []);
      unIndex.get(unKey)!.push(c);
    }

    // ISO Index
    if (c.iso && c.iso !== NO_DATA) {
      const isoKey = c.iso.trim().toUpperCase();
      if (!isoIndex.has(isoKey)) isoIndex.set(isoKey, []);
      isoIndex.get(isoKey)!.push(c);
    }

    // Cargo Type Index
    const effType = getEffectiveCargoType(c);
    if (!cargoTypeIndex.has(effType)) cargoTypeIndex.set(effType, []);
    cargoTypeIndex.get(effType)!.push(c);

    // Special Category Indexes
    if (effType === 'RF' || (c.temp && c.temp !== 'DRY' && c.temp !== NO_DATA)) {
      reeferIndex.push(c);
    }
    if (effType === 'OS' || c.hasDim || c.oogDim) {
      oogIndex.push(c);
    }
    if (effType === 'MT' || c.status === 'EMPTY') {
      emptyIndex.push(c);
    }
    if (c.iso && (c.iso.includes('T') || c.iso.startsWith('22T') || c.iso.startsWith('42T') || effType === 'TK')) {
      tankIndex.push(c);
    }

    // Operator Index
    if (c.operator && c.operator !== NO_DATA) {
      const opKey = c.operator.trim().toUpperCase();
      operatorSet.add(opKey);
      if (!operatorIndex.has(opKey)) operatorIndex.set(opKey, []);
      operatorIndex.get(opKey)!.push(c);
    }

    // Agent Index
    if (c.source) {
      const agKey = String(c.source).trim().toUpperCase();
      if (!agentIndex.has(agKey)) agentIndex.set(agKey, []);
      agentIndex.get(agKey)!.push(c);
    }
  });

  return {
    containerIndex,
    positionIndex,
    bayIndex,
    podIndex,
    polIndex,
    imoIndex,
    unIndex,
    isoIndex,
    cargoTypeIndex,
    operatorIndex,
    agentIndex,
    reeferIndex,
    oogIndex,
    emptyIndex,
    tankIndex,
    allPods: Array.from(podSet),
    allPols: Array.from(polSet),
    allOperators: Array.from(operatorSet)
  };
}

/**
 * Searches master containers by ID, position, or query string.
 * Returns match or null if NOT FOUND ("No hay registro").
 */
export function findContainerInIndexes(query: string, indexes: MasterIndexes): Container | null {
  if (!query) return null;
  const clean = query.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Direct lookup
  if (indexes.containerIndex.has(clean)) {
    return indexes.containerIndex.get(clean)!;
  }

  // Lookup by position
  if (indexes.positionIndex.has(query.trim())) {
    return indexes.positionIndex.get(query.trim())!;
  }

  // Partial match fallback
  for (const [key, container] of indexes.containerIndex.entries()) {
    if (key.includes(clean) || clean.includes(key)) {
      return container;
    }
  }

  return null;
}
