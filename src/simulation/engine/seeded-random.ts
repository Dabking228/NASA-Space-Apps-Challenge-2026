import type { Result } from '@/domain/result';
import { hashKey, type RandomKey } from './hash';
import { makeProblem, type SimulationProblem } from './problem';
import type { NoiseSettings } from './settings-schema';

export interface SeededRandom {
  /** [0, 1). `stream` selects one of many independent numbers for the same key. */
  readonly uniform: (key: RandomKey, stream: number) => number;
  /** Standard normal, truncated to [-clip, +clip]. */
  readonly truncatedNormal: (key: RandomKey) => number;
}

const TWO_POW_32 = 4294967296;
// Sum of 12 uniforms minus 6 has mean 0 and variance 1 (Irwin-Hall approximation of a standard normal).
const UNIFORMS_PER_SAMPLE = 12;
const SAMPLE_OFFSET = 6;

function invalidArgument(field: string, message: string): SimulationProblem {
  return makeProblem(
    'invalid-argument',
    'run',
    'seeded-random',
    field,
    message,
  );
}

/**
 * Builds a random source from a scenario seed. Every number is derived from the seed and the key
 * alone, so no sequence position or other state exists.
 */
export function createSeededRandom(
  seed: number,
  noise: Pick<NoiseSettings, 'clip' | 'maxDraws'>,
): Result<SeededRandom, readonly SimulationProblem[]> {
  const problems: SimulationProblem[] = [];
  if (!Number.isSafeInteger(seed)) {
    problems.push(
      invalidArgument(
        'seed',
        `The seed ${String(seed)} is not a safe integer.`,
      ),
    );
  }
  if (!Number.isFinite(noise.clip) || noise.clip <= 0) {
    problems.push(
      invalidArgument(
        'noiseClip',
        `The noise clip ${String(noise.clip)} is not a positive finite number.`,
      ),
    );
  }
  if (problems.length > 0) {
    return { ok: false, error: problems };
  }

  const { clip, maxDraws } = noise;

  const uniform = (key: RandomKey, stream: number): number =>
    hashKey(seed, [...key, 'u', stream]) / TWO_POW_32;

  const drawSample = (key: RandomKey, attempt: number): number => {
    let sum = 0;
    for (let i = 0; i < UNIFORMS_PER_SAMPLE; i += 1) {
      sum += uniform(key, UNIFORMS_PER_SAMPLE * attempt + i);
    }
    return sum - SAMPLE_OFFSET;
  };

  const truncatedNormal = (key: RandomKey): number => {
    let sample = drawSample(key, 0);
    for (
      let attempt = 1;
      attempt < maxDraws && Math.abs(sample) > clip;
      attempt += 1
    ) {
      sample = drawSample(key, attempt);
    }
    // Reached only when every attempt was rejected. Within the clip this leaves the sample unchanged.
    return Math.min(clip, Math.max(-clip, sample));
  };

  return { ok: true, value: { uniform, truncatedNormal } };
}
