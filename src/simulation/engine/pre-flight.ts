import { composeReading, type EffectTotals } from './generate-reading';
import type { RandomKey } from './hash';
import { HABITAT_ID, pairedNoiseSample } from './noise';
import type { SeededRandom } from './seeded-random';
import type { NoiseSettings } from './settings-schema';
import type { SignalSpec } from './signal-spec-schema';

const NO_EFFECTS: EffectTotals = { additive: 0, multiplicative: 1 };

/** Key of the pre-flight samples of one astronaut indicator. */
export function astronautPreFlightKey(
  astronautId: string,
  indicatorId: string,
): RandomKey {
  return [astronautId, indicatorId, 'pre-flight'];
}

/** Key of the pre-flight samples of one habitat indicator (`cabin-co2`, `dose-rate`). */
export function habitatPreFlightKey(indicatorId: string): RandomKey {
  return [HABITAT_ID, indicatorId, 'pre-flight'];
}

/**
 * Sample `i` is the reading formula with no effects and the paired noise sample at index `i`.
 * A `count` that is not a positive whole number gives no samples.
 */
export function preFlightSamples(
  random: SeededRandom,
  key: RandomKey,
  spec: SignalSpec,
  count: number,
  noise: Pick<NoiseSettings, 'clip' | 'spread'>,
): readonly number[] {
  if (!Number.isSafeInteger(count) || count < 1) return [];
  return Array.from({ length: count }, (_, index) =>
    composeReading(
      spec,
      NO_EFFECTS,
      pairedNoiseSample(random, key, index, noise),
    ),
  );
}

/** Pre-flight samples of one astronaut indicator. */
export function astronautPreFlightSamples(
  random: SeededRandom,
  astronautId: string,
  indicatorId: string,
  spec: SignalSpec,
  count: number,
  noise: Pick<NoiseSettings, 'clip' | 'spread'>,
): readonly number[] {
  return preFlightSamples(
    random,
    astronautPreFlightKey(astronautId, indicatorId),
    spec,
    count,
    noise,
  );
}

/** Pre-flight samples of one habitat indicator. They do not depend on the astronaut (Requirement 8.7). */
export function habitatPreFlightSamples(
  random: SeededRandom,
  indicatorId: string,
  spec: SignalSpec,
  count: number,
  noise: Pick<NoiseSettings, 'clip' | 'spread'>,
): readonly number[] {
  return preFlightSamples(
    random,
    habitatPreFlightKey(indicatorId),
    spec,
    count,
    noise,
  );
}
