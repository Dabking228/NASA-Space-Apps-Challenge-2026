import type { IndicatorDraft } from '@/domain/schemas/indicator';

// Radiation from docs/PROJECT.md section 6.6 (DRAFT, UNVERIFIED). Every `sources`
// array is empty until the team supplies citations. Neither indicator has deviation settings (TD-12).

// The reading value is the projected mission dose in mSv, supplied by the caller (TD-7).
// The 600 mSv career limit is written from memory (flag C). The classifier subtracts the
// career dose accrued before the mission to get the remaining allowance.
export const careerEffectiveDose = {
  id: 'career-effective-dose',
  label: 'Projected career effective dose',
  unit: 'mSv',
  periodDays: 1,
  careerLimitMsv: 600,
  hardLimits: { orange: [], red: [] },
  sequenceRules: [],
  conditionalRules: [],
  contextRules: [
    // Orange at 80% or more of the remaining allowance.
    { kind: 'allowance-fraction', tier: 'orange', fraction: 0.8, op: 'gte' },
    // Red when the projected dose is above the remaining allowance.
    { kind: 'allowance-fraction', tier: 'red', fraction: 1, op: 'gt' },
  ],
  verification: { thresholds: ['C'] },
  sources: [],
} satisfies IndicatorDraft;

// PROJECT.md says "sustained" without a duration. The orange rule uses 2 periods,
// a proposed-default (TD-14). The red rule is not sustained.
export const doseRate = {
  id: 'dose-rate',
  label: 'Dose rate',
  unit: 'mSv/day',
  periodDays: 1,
  hardLimits: { orange: [], red: [] },
  sequenceRules: [
    {
      tier: 'orange',
      periods: 2,
      condition: { kind: 'background-multiple', op: 'gt', multiple: 5 },
      source: 'proposed-default',
    },
    {
      tier: 'red',
      periods: 1,
      condition: { kind: 'background-multiple', op: 'gt', multiple: 20 },
      source: 'project-doc',
    },
  ],
  conditionalRules: [],
  // Red while a solar particle event alert covers the day (shelter flow).
  contextRules: [
    { kind: 'external-alert', tier: 'red', alert: 'solar-particle-event' },
  ],
  verification: { thresholds: ['B', 'C'] },
  sources: [],
} satisfies IndicatorDraft;
