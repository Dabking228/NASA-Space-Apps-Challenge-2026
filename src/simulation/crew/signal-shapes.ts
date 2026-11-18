import type { SignalSpec } from '@/simulation/engine/signal-spec-schema';
import type { AstronautIndicatorId } from './crew-schema';

export type SignalShape = Omit<SignalSpec, 'baseline'>;

export type CrewBaselines = Readonly<Record<AstronautIndicatorId, number>>;

// Shared by all crew. Synthetic placeholder values, not thresholds or references.
// Noise values follow SD-10 of the design. Periods equal the catalog periodDays.
// Bounds equal the catalog valid range for mood and who5. The SpO2 cap of 100 is a
// scale limit of the unit, not a threshold.
export const SIGNAL_SHAPES = {
  'resting-hr': { noiseSd: 1.5, decimals: 0, periodDays: 1 },
  'bp-systolic': { noiseSd: 3, decimals: 0, periodDays: 1 },
  'bp-diastolic': { noiseSd: 3, decimals: 0, periodDays: 1 },
  'body-temperature': { noiseSd: 0.3, decimals: 1, periodDays: 1 },
  spo2: { noiseSd: 1, decimals: 0, periodDays: 1, bounds: { max: 100 } },
  'sleep-hours': { noiseSd: 0.3, decimals: 1, periodDays: 1 },
  mood: {
    noiseSd: 0.4,
    decimals: 1,
    periodDays: 1,
    bounds: { min: 1, max: 5 },
  },
  who5: {
    noiseSd: 6,
    decimals: 0,
    periodDays: 7,
    bounds: { min: 0, max: 100 },
  },
  'reaction-time': { noiseSd: 15, decimals: 0, periodDays: 1 },
  'body-mass-change-30d': { noiseSd: 0.3, decimals: 1, periodDays: 1 },
  'energy-intake': { noiseSd: 3, decimals: 0, periodDays: 1 },
  'exercise-adherence': { noiseSd: 5, decimals: 0, periodDays: 7 },
} as const satisfies Readonly<Record<AstronautIndicatorId, SignalShape>>;

// Each key is written out so the result has all twelve keys without a type assertion.
export function withShapes(
  baselines: CrewBaselines,
): Readonly<Record<AstronautIndicatorId, SignalSpec>> {
  return {
    'resting-hr': {
      baseline: baselines['resting-hr'],
      ...SIGNAL_SHAPES['resting-hr'],
    },
    'bp-systolic': {
      baseline: baselines['bp-systolic'],
      ...SIGNAL_SHAPES['bp-systolic'],
    },
    'bp-diastolic': {
      baseline: baselines['bp-diastolic'],
      ...SIGNAL_SHAPES['bp-diastolic'],
    },
    'body-temperature': {
      baseline: baselines['body-temperature'],
      ...SIGNAL_SHAPES['body-temperature'],
    },
    spo2: { baseline: baselines.spo2, ...SIGNAL_SHAPES.spo2 },
    'sleep-hours': {
      baseline: baselines['sleep-hours'],
      ...SIGNAL_SHAPES['sleep-hours'],
    },
    mood: { baseline: baselines.mood, ...SIGNAL_SHAPES.mood },
    who5: { baseline: baselines.who5, ...SIGNAL_SHAPES.who5 },
    'reaction-time': {
      baseline: baselines['reaction-time'],
      ...SIGNAL_SHAPES['reaction-time'],
    },
    'body-mass-change-30d': {
      baseline: baselines['body-mass-change-30d'],
      ...SIGNAL_SHAPES['body-mass-change-30d'],
    },
    'energy-intake': {
      baseline: baselines['energy-intake'],
      ...SIGNAL_SHAPES['energy-intake'],
    },
    'exercise-adherence': {
      baseline: baselines['exercise-adherence'],
      ...SIGNAL_SHAPES['exercise-adherence'],
    },
  };
}
