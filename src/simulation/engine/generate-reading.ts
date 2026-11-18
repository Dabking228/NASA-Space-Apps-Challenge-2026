import type { Reading } from '@/domain/types';
import type { CombinedEffects } from '@/simulation/events/effects';
import type { SignalSpec } from './signal-spec-schema';

/** Additive and multiplicative effect totals of one reading target. Neutral values are 0 and 1. */
export type EffectTotals = CombinedEffects;

// Constant table for rounding, indexed by `decimals`. It avoids `Math.pow` and `**`.
const DECIMAL_FACTORS: readonly number[] = [
  1, 10, 100, 1000, 10000, 100000, 1000000,
];

/**
 * Round to `decimals` places with `Math.round(v * f) / f`.
 * `decimals` is validated 0 to 6 by `SignalSpecSchema`. For any other value no factor exists
 * and the value is returned unrounded.
 */
function roundTo(value: number, decimals: number): number {
  const factor = DECIMAL_FACTORS.find((_, index) => index === decimals);
  return factor === undefined ? value : Math.round(value * factor) / factor;
}

/**
 * value = clamp( (baseline + additive + noiseSd * noiseSample) * multiplicative ), then round to `decimals`.
 * Order (Requirement 8.2): baseline, additive effects, noise, multiplicative effects, bounds, rounding.
 * A bound applies only where it is present.
 */
export function composeReading(
  spec: SignalSpec,
  effects: EffectTotals,
  noiseSample: number,
): number {
  const raw =
    (spec.baseline + effects.additive + spec.noiseSd * noiseSample) *
    effects.multiplicative;
  const min = spec.bounds?.min;
  const max = spec.bounds?.max;
  const aboveMin = min === undefined ? raw : Math.max(raw, min);
  const bounded = max === undefined ? aboveMin : Math.min(aboveMin, max);
  return roundTo(bounded, spec.decimals);
}

/** True when the series has a reading on `day`: a multiple of `periodDays`, at most `lastDay`. */
export function hasReadingOnDay(
  spec: Pick<SignalSpec, 'periodDays'>,
  day: number,
  lastDay: number,
): boolean {
  return day >= 0 && day <= lastDay && day % spec.periodDays === 0;
}

/**
 * All reading days of a series from day 0 to `lastDay`, ascending. The runner clamps `lastDay` to
 * `durationDays - 1`. A `lastDay` that is not a whole number of 0 or more gives no days.
 */
export function readingDays(
  spec: Pick<SignalSpec, 'periodDays'>,
  lastDay: number,
): readonly number[] {
  if (!Number.isSafeInteger(lastDay) || lastDay < 0) return [];
  return Array.from(
    { length: Math.floor(lastDay / spec.periodDays) + 1 },
    (_, position) => position * spec.periodDays,
  );
}

/** Position of the reading of `day` in its series: the `index` argument of `pairedNoiseSample`. */
export function noiseIndexOfDay(
  spec: Pick<SignalSpec, 'periodDays'>,
  day: number,
): number {
  return day / spec.periodDays;
}

/** One generated reading. The quality flag is always `good` (Requirement 8.5). */
export function buildReading(
  astronautId: string,
  indicatorId: string,
  day: number,
  value: number,
): Reading {
  return { astronautId, indicatorId, day, value, quality: 'good' };
}
