import { Container } from '../models/container';
import { NO_DATA } from '../parser/portNormalizer';

export interface ComparisonDelta {
  containerId: string;
  type: 'ADDED' | 'DELETED' | 'MODIFIED' | 'UNCHANGED';
  changes: string[]; // List of changed fields, e.g. ["Posición modificada", "ISO modificado"]
  original?: Container;
  updated?: Container;
}

export function compareBaplieVersions(
  originalList: Container[],
  updatedList: Container[]
): { deltas: ComparisonDelta[]; summary: Record<string, number> } {
  const origMap = new Map<string, Container>();
  originalList.forEach(c => {
    if (c.id && c.id !== NO_DATA) origMap.set(c.id.toUpperCase(), c);
  });

  const updatedMap = new Map<string, Container>();
  updatedList.forEach(c => {
    if (c.id && c.id !== NO_DATA) updatedMap.set(c.id.toUpperCase(), c);
  });

  const allIds = new Set([...origMap.keys(), ...updatedMap.keys()]);
  const deltas: ComparisonDelta[] = [];

  const summary = {
    total: allIds.size,
    added: 0,
    deleted: 0,
    modified: 0,
    unchanged: 0
  };

  allIds.forEach(id => {
    const orig = origMap.get(id);
    const upd = updatedMap.get(id);

    if (!orig && upd) {
      summary.added++;
      deltas.push({
        containerId: id,
        type: 'ADDED',
        changes: ['Contenedor agregado'],
        updated: upd
      });
      return;
    }

    if (orig && !upd) {
      summary.deleted++;
      deltas.push({
        containerId: id,
        type: 'DELETED',
        changes: ['Contenedor eliminado'],
        original: orig
      });
      return;
    }

    if (orig && upd) {
      const changes: string[] = [];

      if (orig.position !== upd.position) changes.push(`Posición modificada: ${orig.position} → ${upd.position}`);
      if (orig.iso !== upd.iso) changes.push(`ISO modificado: ${orig.iso} → ${upd.iso}`);
      if (orig.weight !== upd.weight) changes.push(`Peso modificado: ${orig.weight} → ${upd.weight}`);
      if (orig.pod !== upd.pod) changes.push(`POD modificado: ${orig.pod} → ${upd.pod}`);
      if (orig.pol !== upd.pol) changes.push(`POL modificado: ${orig.pol} → ${upd.pol}`);
      if (orig.imoClass !== upd.imoClass) changes.push(`IMO modificado: ${orig.imoClass} → ${upd.imoClass}`);
      if (orig.unNumber !== upd.unNumber) changes.push(`UN modificado: ${orig.unNumber} → ${upd.unNumber}`);
      if (orig.temp !== upd.temp) changes.push(`Temperatura modificada: ${orig.temp} → ${upd.temp}`);
      if (orig.status !== upd.status) changes.push(`Status modificado: ${orig.status} → ${upd.status}`);
      if (orig.cargoType !== upd.cargoType) changes.push(`Cargo Type modificado: ${orig.cargoType} → ${upd.cargoType}`);

      if (changes.length > 0) {
        summary.modified++;
        deltas.push({
          containerId: id,
          type: 'MODIFIED',
          changes,
          original: orig,
          updated: upd
        });
      } else {
        summary.unchanged++;
        deltas.push({
          containerId: id,
          type: 'UNCHANGED',
          changes: [],
          original: orig,
          updated: upd
        });
      }
    }
  });

  return { deltas, summary };
}
