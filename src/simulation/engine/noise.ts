import type { RandomKey } from './hash';
import type { SeededRandom } from './seeded-random';
import type { NoiseSettings } from './settings-schema';

/** Reserved id of the shared habitat series. No crew profile may use it, so no astronaut key equals a habitat key. */
export const HABITAT_ID = 'habitat';

/**
 * Key layouts passed to `pairedNoiseSample` (a fixed part of the design, because the observed results depend on them):
 * - In-flight astronaut reading:  [astronautId, indicatorId, 'noise'], index = day / periodDays
 * - Pre-flight astronaut sample:  [astronautId, indicatorId, 'pre-flight'], index = sample number 0..n-1
 * - In-flight habitat reading:    [HABITAT_ID, indicatorId] for cabin-co2 and dose-rate, index = day (period 1)
 * - Pre-flight habitat sample:    [HABITAT_ID, indicatorId, 'pre-flight'], index = sample number
 */

/**
 * Noise sample for position `index` of a series (SD-1). Positions 2j and 2j+1 form a pair: they share
 * one amplitude and have opposite signs. The order inside a pair comes from a keyed bit.
 * The result is in [-(1 + spread), -(1 - spread)] or [(1 - spread), (1 + spread)].
 */
export function pairedNoiseSample(
  random: SeededRandom,
  key: RandomKey,
  index: number,
  noise: Pick<NoiseSettings, 'clip' | 'spread'>,
): number {
  const pair = Math.floor(index / 2);
  const firstSign = random.uniform([...key, 'order', pair], 0) < 0.5 ? 1 : -1;
  const sign = index % 2 === 0 ? firstSign : -firstSign;
  const z = random.truncatedNormal([...key, 'amp', pair]);
  return sign * (1 + (noise.spread * z) / noise.clip);
}
