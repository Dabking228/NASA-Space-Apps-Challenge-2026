import type { Catalog } from '../indicators/build-catalog';
import { indicatorsForSystem } from '../indicators/build-catalog';
import type { Finding } from '../schemas/finding';
import { BODY_SYSTEM_ORDER } from '../schemas/vocabulary';
import type { BodySystem } from '../schemas/vocabulary';
import { maxTier, worstTier } from '../tiers';
import type { Tier } from '../types';
import type { Classification } from './classification-types';

export type SystemStatus =
  | {
      readonly system: BodySystem;
      readonly status: 'no-data';
      readonly indicatorIds: readonly [];
      readonly findingIds: readonly [];
    }
  | {
      readonly system: BodySystem;
      readonly status: 'classified';
      readonly tier: Tier;
      readonly indicatorIds: readonly string[];
      readonly findingIds: readonly string[];
    };

/** Final tier of each classified indicator, keyed by indicator id. `no-data` is skipped. */
function tiersByIndicator(
  classifications: readonly Classification[],
): ReadonlyMap<string, readonly Tier[]> {
  const result = new Map<string, Tier[]>();
  for (const classification of classifications) {
    if (classification.status === 'classified') {
      const id = classification.reading.indicatorId;
      result.set(id, [...(result.get(id) ?? []), classification.tier]);
    }
  }
  return result;
}

/** The worst tier of a list, or `undefined` when it is empty. */
function worstOrUndefined(tiers: readonly Tier[]): Tier | undefined {
  const [first, ...rest] = tiers;
  return first === undefined ? undefined : worstTier([first, ...rest]);
}

function aggregateSystem(
  system: BodySystem,
  catalog: Catalog,
  indicatorTiers: ReadonlyMap<string, readonly Tier[]>,
  findings: readonly Finding[],
): SystemStatus {
  const withData = indicatorsForSystem(catalog, system).filter((definition) =>
    indicatorTiers.has(definition.id),
  );
  const indicatorTier = worstOrUndefined(
    withData.flatMap((definition) => indicatorTiers.get(definition.id) ?? []),
  );
  const systemFindings = findings.filter(
    (finding) => finding.system === system,
  );
  const clusterTier = worstOrUndefined(
    systemFindings
      .filter((finding) => finding.kind === 'cluster')
      .map((finding) => finding.tier),
  );

  // TD-5: a cluster only raises the tier, never lowers it.
  const tier =
    indicatorTier === undefined
      ? clusterTier
      : clusterTier === undefined
        ? indicatorTier
        : maxTier(indicatorTier, clusterTier);
  if (tier === undefined) {
    return { system, status: 'no-data', indicatorIds: [], findingIds: [] };
  }

  return {
    system,
    status: 'classified',
    tier,
    indicatorIds: withData.map((definition) => definition.id).toSorted(),
    findingIds: systemFindings
      .filter((finding) => finding.tier !== 'green')
      .map((finding) => finding.id)
      .toSorted(),
  };
}

/** One status per body system, in `BODY_SYSTEM_ORDER`. Never throws. */
export function aggregateBodySystems(
  catalog: Catalog,
  classifications: readonly Classification[],
  findings: readonly Finding[],
): readonly SystemStatus[] {
  const indicatorTiers = tiersByIndicator(classifications);
  return BODY_SYSTEM_ORDER.map((system) =>
    aggregateSystem(system, catalog, indicatorTiers, findings),
  );
}
