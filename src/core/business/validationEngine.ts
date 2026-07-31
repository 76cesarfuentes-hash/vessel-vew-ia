import { Container } from '../models/container';
import { BaplieValidationReport, AuditError } from '../models/validation';
import { NO_DATA } from '../parser/portNormalizer';

const FLAT_RACK_CHARS = new Set(['P', 'F']);

export function isFlatRackOrPlatform(iso: string): boolean {
  if (!iso || iso.length < 3) return false;
  return FLAT_RACK_CHARS.has(iso.toUpperCase()[2]);
}

export function validateBaplie(containers: Container[]): BaplieValidationReport {
  const byPos: Record<string, Container[]> = {};

  containers.forEach(c => {
    if (!c.position || c.position === NO_DATA) return;
    if (!byPos[c.position]) byPos[c.position] = [];
    byPos[c.position].push(c);
  });

  const duplicateErrors: BaplieValidationReport['duplicateErrors'] = [];
  const bundles: BaplieValidationReport['bundles'] = [];
  const bundleSet = new Set<string>();
  const dupErrSet = new Set<string>();

  Object.entries(byPos).forEach(([pos, ctrs]) => {
    if (ctrs.length <= 1) return;
    const allBundle = ctrs.every(c => isFlatRackOrPlatform(c.iso));

    if (allBundle) {
      bundles.push({
        position: pos,
        bay: pos.slice(0, 3),
        row: pos.slice(3, 5),
        tier: pos.slice(5, 7),
        count: ctrs.length,
        containers: ctrs.map(c => ({ id: c.id, iso: c.iso, pod: c.pod }))
      });
      bundleSet.add(pos);
    } else {
      duplicateErrors.push({
        position: pos,
        bay: pos.slice(0, 3),
        row: pos.slice(3, 5),
        tier: pos.slice(5, 7),
        count: ctrs.length,
        containers: ctrs.map(c => ({ id: c.id, iso: c.iso, pod: c.pod }))
      });
      dupErrSet.add(pos);
    }
  });

  // Floating containers check
  const HOLD_MAX = 64;
  const minTierByZone: Record<string, number> = {};

  containers.forEach(c => {
    if (!c.position || c.position === NO_DATA) return;
    const bay = c.position.slice(0, 3);
    const row = c.position.slice(3, 5);
    const tier = parseInt(c.tier || c.position.slice(5, 7), 10);
    if (isNaN(tier)) return;

    const zone = tier <= HOLD_MAX ? 'hold' : 'deck';
    const key = `${bay}|${row}|${zone}`;

    if (minTierByZone[key] === undefined || tier < minTierByZone[key]) {
      minTierByZone[key] = tier;
    }
  });

  const occupiedSet = new Set(Object.keys(byPos));
  const floatingContainers: BaplieValidationReport['floatingContainers'] = [];
  const floatSet = new Set<string>();

  containers.forEach(c => {
    if (!c.position || c.position === NO_DATA) return;
    if (bundleSet.has(c.position) || dupErrSet.has(c.position)) return;

    const bay = c.position.slice(0, 3);
    const row = c.position.slice(3, 5);
    const tier = parseInt(c.tier || c.position.slice(5, 7), 10);
    if (isNaN(tier)) return;

    const zone = tier <= HOLD_MAX ? 'hold' : 'deck';
    const minTier = minTierByZone[`${bay}|${row}|${zone}`];

    if (tier === minTier) return; // Base of hold or deck structure

    const tierBelow = (tier - 2).toString().padStart(2, '0');
    const posBelow = `${bay}${row}${tierBelow}`;

    if (!occupiedSet.has(posBelow)) {
      floatingContainers.push({
        position: c.position,
        bay,
        row,
        tier: tier.toString().padStart(2, '0'),
        id: c.id,
        iso: c.iso,
        pod: c.pod,
        posBelow
      });
      floatSet.add(c.position);
    }
  });

  const status = (duplicateErrors.length > 0 || floatingContainers.length > 0) ? 'INVALID' : 'VALID';

  return {
    duplicateErrors,
    bundles,
    floatingContainers,
    status,
    bundleSet,
    dupErrSet,
    floatSet,
    byPos
  };
}
