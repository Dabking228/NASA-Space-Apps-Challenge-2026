import type { PersistenceConfig } from '../schemas/config';
import { compareTiers, maxTier } from '../tiers';
import type { Tier } from '../types';

/**
 * Raises a lingering tier. `earlierBaseTiers[0]` is the base tier one period back.
 * The result is `max(tier, raisesTo)` when `tier` and the previous
 * `consecutivePeriods - 1` base tiers are all at or above `minTier`. A `no-data`
 * entry or a history that is too short breaks the chain. Only base tiers are read,
 * so earlier raises cannot cascade.
 */
export function applyPersistence(
  tier: Tier,
  earlierBaseTiers: readonly (Tier | 'no-data')[],
  cfg: PersistenceConfig,
): Tier {
  if (compareTiers(tier, cfg.minTier) < 0) {
    return tier;
  }

  const needed = cfg.consecutivePeriods - 1;
  const recent = earlierBaseTiers.slice(0, needed);
  const chainHolds =
    recent.length === needed &&
    recent.every((earlier) => {
      if (earlier === 'no-data') {
        return false;
      }
      return compareTiers(earlier, cfg.minTier) >= 0;
    });

  return chainHolds ? maxTier(tier, cfg.raisesTo) : tier;
}
