import { Container } from '../models/container';
import { AuditError } from '../models/validation';
import { NO_DATA } from '../parser/portNormalizer';

export function runStowageAudit(
  containers: Container[],
  podSequence?: string[]
): { errors: AuditError[]; summary: Record<string, number> } {
  const errors: AuditError[] = [];
  let errorCounter = 1;
  const nextId = () => `AUD-${String(errorCounter++).padStart(4, '0')}`;

  // 1. CUADRE: Containers with no position assigned
  const noPos = containers.filter(c => !c.position || c.position === NO_DATA);
  noPos.forEach(c => {
    errors.push({
      id: nextId(),
      categoria: 'CUADRE',
      tipo: 'SIN_POSICION',
      ubicacion: 'N/A',
      contenedor: c.id || NO_DATA,
      prioridad: 'ALTO',
      descripcion: `Contenedor ${c.id} sin posición asignada. ISO: ${c.iso}, POD: ${c.pod}, Status: ${c.status}`
    });
  });

  // 2. POSICIONES: Duplicates, invalid format
  const byPos: Record<string, Container[]> = {};
  const byId: Record<string, Container[]> = {};

  containers.forEach(c => {
    const pos = c.position;
    if (pos && pos !== NO_DATA) {
      if (!byPos[pos]) byPos[pos] = [];
      byPos[pos].push(c);
    }
    const cid = (c.id || '').toUpperCase();
    if (cid && cid !== NO_DATA) {
      if (!byId[cid]) byId[cid] = [];
      byId[cid].push(c);
    }
  });

  // Duplicate positions
  Object.entries(byPos).forEach(([pos, ctrs]) => {
    if (ctrs.length <= 1) return;
    const allBundle = ctrs.every(c => {
      const iso = (c.iso || '').toUpperCase();
      return iso.length >= 3 && (iso[2] === 'P' || iso[2] === 'F');
    });
    if (!allBundle) {
      errors.push({
        id: nextId(),
        categoria: 'POSICIONES',
        tipo: 'POSICION_DUPLICADA',
        ubicacion: pos,
        contenedor: ctrs.map(c => c.id).join(', '),
        prioridad: 'CRÍTICO',
        descripcion: `Posición ${pos} ocupada por ${ctrs.length} contenedores: ${ctrs.map(c => `${c.id} (${c.iso})`).join(', ')}`
      });
    }
  });

  // Duplicate Container IDs
  Object.entries(byId).forEach(([cid, ctrs]) => {
    if (ctrs.length > 1) {
      errors.push({
        id: nextId(),
        categoria: 'POSICIONES',
        tipo: 'ID_DUPLICADO',
        ubicacion: ctrs.map(c => c.position).join(', '),
        contenedor: cid,
        prioridad: 'CRÍTICO',
        descripcion: `ID ${cid} aparece ${ctrs.length} veces en el archivo EDI`
      });
    }
  });

  // Invalid position formats
  containers.forEach(c => {
    const pos = c.position;
    if (!pos || pos === NO_DATA) return;
    if (pos.length !== 7) {
      errors.push({
        id: nextId(),
        categoria: 'POSICIONES',
        tipo: 'FORMATO_INVALIDO',
        ubicacion: pos,
        contenedor: c.id,
        prioridad: 'ALTO',
        descripcion: `Formato de posición de 7 dígitos requerido (actual: ${pos.length} caracteres)`
      });
    } else {
      const tier = parseInt(pos.slice(5, 7), 10);
      if (isNaN(tier) || tier % 2 !== 0 || tier < 2 || tier > 96) {
        errors.push({
          id: nextId(),
          categoria: 'POSICIONES',
          tipo: 'TIER_INVALIDO',
          ubicacion: pos,
          contenedor: c.id,
          prioridad: 'ALTO',
          descripcion: `Tier '${pos.slice(5, 7)}' no estándar (debe ser número par entre 02 y 96)`
        });
      }
    }
  });

  // 3. HUECOS (Structural gaps in stack)
  const cols: Record<string, { tier: number; container: Container }[]> = {};
  containers.forEach(c => {
    if (!c.position || c.position === NO_DATA) return;
    const bay = c.position.slice(0, 3);
    const row = c.position.slice(3, 5);
    const tier = parseInt(c.position.slice(5, 7), 10);
    if (isNaN(tier)) return;

    const zone = tier <= 64 ? 'hold' : 'deck';
    const key = `${bay}|${row}|${zone}`;
    if (!cols[key]) cols[key] = [];
    cols[key].push({ tier, container: c });
  });

  Object.entries(cols).forEach(([key, slots]) => {
    if (slots.length < 2) return;
    slots.sort((a, b) => a.tier - b.tier);

    for (let i = 1; i < slots.length; i++) {
      const gap = slots[i].tier - slots[i - 1].tier;
      if (gap > 2) {
        const [bay, row, zone] = key.split('|');
        errors.push({
          id: nextId(),
          categoria: 'HUECOS',
          tipo: 'HUECO_COLUMNA',
          ubicacion: `BAY ${bay} ROW ${row} (${zone.toUpperCase()})`,
          contenedor: `${slots[i - 1].container.id} ↑ ${slots[i].container.id}`,
          prioridad: 'MEDIO',
          descripcion: `Hueco estructural detectado entre tiers ${slots[i - 1].tier} y ${slots[i].tier} en columna ${bay}-${row}`
        });
      }
    }
  });

  // 4. DESCARGA (POD Sequence violations causing forced restows)
  if (podSequence && podSequence.length > 1) {
    const podOrder: Record<string, number> = {};
    podSequence.forEach((p, idx) => {
      podOrder[p.toUpperCase()] = idx;
    });

    Object.entries(cols).forEach(([key, slots]) => {
      if (slots.length < 2) return;
      slots.sort((a, b) => a.tier - b.tier); // Bottom to top

      for (let i = 0; i < slots.length - 1; i++) {
        const below = slots[i].container;
        const above = slots[i + 1].container;
        const podB = (below.pod || '').toUpperCase();
        const podA = (above.pod || '').toUpperCase();

        const ordB = podOrder[podB];
        const ordA = podOrder[podA];

        if (ordB !== undefined && ordA !== undefined && ordA > ordB) {
          const [bay, row] = key.split('|');
          errors.push({
            id: nextId(),
            categoria: 'DESCARGA',
            tipo: 'CONFLICTO_SECUENCIA_POD',
            ubicacion: `BAY ${bay} ROW ${row} TIER ${above.tier}`,
            contenedor: `${above.id} (POD: ${above.pod}) SOBRE ${below.id} (POD: ${below.pod})`,
            prioridad: 'CRÍTICO',
            descripcion: `Contenedor ${above.id} con descarga posterior en ${above.pod} bloquea descarga de ${below.id} en ${below.pod}`,
            _above: above,
            _below: below,
            _pos: above.position
          });
        }
      }
    });
  }

  // 5. CONSISTENCIA (Data validity)
  containers.forEach(c => {
    if (!c.iso || c.iso === NO_DATA || c.iso.length < 3) {
      errors.push({
        id: nextId(),
        categoria: 'CONSISTENCIA',
        tipo: 'ISO_FALTANTE',
        ubicacion: c.position || 'N/A',
        contenedor: c.id,
        prioridad: 'MEDIO',
        descripcion: `Código ISO no disponible o incompleto`
      });
    }
    if (!c.pod || c.pod === NO_DATA) {
      errors.push({
        id: nextId(),
        categoria: 'CONSISTENCIA',
        tipo: 'POD_FALTANTE',
        ubicacion: c.position || 'N/A',
        contenedor: c.id,
        prioridad: 'ALTO',
        descripcion: `Puerto de descarga (POD) no especificado en EDI`
      });
    }
    if (c.cargoType === 'DG' && (!c.imoClass || c.imoClass === NO_DATA)) {
      errors.push({
        id: nextId(),
        categoria: 'CONSISTENCIA',
        tipo: 'DG_SIN_IMO',
        ubicacion: c.position || 'N/A',
        contenedor: c.id,
        prioridad: 'CRÍTICO',
        descripcion: `Contenedor clasificado como Mercancía Peligrosa sin Clase IMO especificada`
      });
    }
  });

  const summary = {
    total: errors.length,
    critico: errors.filter(e => e.prioridad === 'CRÍTICO').length,
    alto: errors.filter(e => e.prioridad === 'ALTO').length,
    medio: errors.filter(e => e.prioridad === 'MEDIO').length,
    info: errors.filter(e => e.prioridad === 'INFO').length
  };

  return { errors, summary };
}
