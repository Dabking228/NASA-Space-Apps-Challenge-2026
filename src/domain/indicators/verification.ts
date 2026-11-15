import type { Finding } from '../schemas/finding';
import type { Catalog } from './build-catalog';

// These checks report data. They never throw and never signal failure (TD-10).

/** Ids of indicators with no source reference, in catalog order. */
export function findUnverifiedIndicators(catalog: Catalog): readonly string[] {
  return catalog.indicators
    .filter((indicator) => indicator.sources.length === 0)
    .map((indicator) => indicator.id);
}

/** The finding's indicator ids that have no source reference, in the finding's order. */
export function unverifiedForFinding(
  catalog: Catalog,
  finding: Finding,
): readonly string[] {
  const unverified: ReadonlySet<string> = new Set(
    findUnverifiedIndicators(catalog),
  );
  return finding.indicators.filter((id) => unverified.has(id));
}

/** Ids of indicators whose deviation floor has not been supplied yet (TD-11), in catalog order. */
export function findPendingFloors(catalog: Catalog): readonly string[] {
  return catalog.indicators
    .filter((indicator) => indicator.deviation?.minAbsoluteChange === null)
    .map((indicator) => indicator.id);
}
