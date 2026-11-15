import type { Result, DomainError } from '../result';
import type { BaselineConfig } from '../schemas/config';
import type { Reading } from '../schemas/reading';
import { meanOf, sampleSd } from './stats';

/** Personal reference for one astronaut and one indicator. */
export interface Baseline {
  readonly mean: number;
  readonly sd: number;
  /** `seed` for pre-flight values, `window` for accepted in-flight readings. */
  readonly source: 'seed' | 'window';
  readonly sampleSize: number;
}

export interface BaselineInput {
  readonly astronautId: string;
  readonly indicatorId: string;
  /** Pre-flight values. */
  readonly seed: readonly number[];
  /** Already filtered by the caller: quality good and not dated on a frozen day. */
  readonly accepted: readonly Reading[];
  readonly asOfDay: number;
  readonly config: BaselineConfig;
}

function statsOf(
  values: readonly number[],
  source: Baseline['source'],
): Baseline {
  return {
    mean: meanOf(values),
    sd: sampleSd(values),
    source,
    sampleSize: values.length,
  };
}

/**
 * Baseline as of `asOfDay`. Uses accepted readings with `asOfDay - windowDays < day <= asOfDay`
 * when at least `minWindowReadings` remain. Otherwise uses the seed, or returns a
 * `baseline-unavailable` error when the seed is shorter than `minSeedReadings`.
 */
export function computeBaseline(
  input: BaselineInput,
): Result<Baseline, DomainError> {
  const { astronautId, indicatorId, seed, accepted, asOfDay, config } = input;

  const windowValues = accepted
    .filter(
      (reading) =>
        reading.day > asOfDay - config.windowDays && reading.day <= asOfDay,
    )
    .map((reading) => reading.value);

  if (windowValues.length >= config.minWindowReadings) {
    return { ok: true, value: statsOf(windowValues, 'window') };
  }

  if (seed.length >= config.minSeedReadings) {
    return { ok: true, value: statsOf(seed, 'seed') };
  }

  return {
    ok: false,
    error: {
      code: 'baseline-unavailable',
      astronautId,
      indicatorId,
      message: `No baseline for astronaut "${astronautId}" and indicator "${indicatorId}": the pre-flight seed has ${seed.length} reading(s) and ${config.minSeedReadings} are needed.`,
    },
  };
}
