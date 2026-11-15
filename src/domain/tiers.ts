import type { Confidence } from './schemas/vocabulary';
import type { Tier } from './types';

/** Tiers from least to most severe. Covers every Tier exactly once. */
export const TIER_ORDER = [
  'green',
  'yellow',
  'orange',
  'red',
] as const satisfies readonly Tier[];

/** Confidence levels from least to most certain. Covers every Confidence exactly once. */
export const CONFIDENCE_ORDER = [
  'low',
  'medium',
  'high',
] as const satisfies readonly Confidence[];

/** Negative when `a` is less severe than `b`, zero when equal, positive when more severe. */
export function compareTiers(a: Tier, b: Tier): number {
  return TIER_ORDER.indexOf(a) - TIER_ORDER.indexOf(b);
}

/** The more severe of two tiers. */
export function maxTier(a: Tier, b: Tier): Tier {
  return compareTiers(a, b) >= 0 ? a : b;
}

/** The most severe tier in a non-empty list. The list is not modified and its order does not matter. */
export function worstTier(tiers: readonly [Tier, ...Tier[]]): Tier {
  return tiers.reduce<Tier>((worst, tier) => maxTier(worst, tier), tiers[0]);
}
