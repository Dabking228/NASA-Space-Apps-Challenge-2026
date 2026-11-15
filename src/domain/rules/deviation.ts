import type { Baseline } from '../baseline/compute-baseline';
import type { Tier } from '../types';
import type {
  DeviationEvidence,
  ResolvedDeviation,
} from './classification-types';

type DeviationDirection = ResolvedDeviation['direction'];

/** True when a signed difference is on a side the indicator watches. */
function isWatchedSide(
  difference: number,
  direction: DeviationDirection,
): boolean {
  switch (direction) {
    case 'both':
      return true;
    case 'high':
      return difference > 0;
    case 'low':
      return difference < 0;
    default: {
      const unreachable: never = direction;
      return unreachable;
    }
  }
}

/**
 * Tier from the distance to the personal baseline.
 *
 * One floor gate covers both tiers (TD-2). A `null` floor counts as 0 and is
 * flagged in the evidence (TD-11). A zero difference is never a deviation, so a
 * zero SD cannot turn an exact match into a finding; this also keeps the tier
 * non-decreasing in the distance.
 */
export function classifyDeviation(
  value: number,
  baseline: Baseline,
  settings: ResolvedDeviation,
): { tier: Tier; evidence: DeviationEvidence } {
  const difference = value - baseline.mean;
  const distance = Math.abs(difference);
  const floor = settings.minAbsoluteChange;
  const floorValue = floor ?? 0;

  const evidence: DeviationEvidence = {
    mean: baseline.mean,
    sd: baseline.sd,
    difference,
    floor,
    floorPending: floor === null,
    yellowSd: settings.yellowSd,
    orangeSd: settings.orangeSd,
    direction: difference < 0 ? 'below' : 'above',
  };

  const counts =
    isWatchedSide(difference, settings.direction) &&
    distance > 0 &&
    distance >= floorValue;

  if (counts && distance >= settings.orangeSd * baseline.sd) {
    return { tier: 'orange', evidence };
  }
  if (counts && distance >= settings.yellowSd * baseline.sd) {
    return { tier: 'yellow', evidence };
  }
  return { tier: 'green', evidence };
}
