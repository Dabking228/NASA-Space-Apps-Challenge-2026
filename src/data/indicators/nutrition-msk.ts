import type { IndicatorDraft } from '@/domain/schemas/indicator';

// Values from docs/PROJECT.md section 6.5 (DRAFT, UNVERIFIED). Every `sources`
// array is empty until the team supplies citations. Deviation settings omit
// yellowSd and orangeSd so the engine-wide 2 SD and 3 SD apply (section 6.2, flag B).
// `minAbsoluteChange: null` means the floor is not supplied yet (TD-11, TD-12).
// Deviation directions follow TD-22: mass loss above baseline, intake below baseline.

// The caller supplies the 30-day percentage loss. The engine does not compute it
// (Requirement 6.4). A positive value is a loss. It is read once per day.
export const bodyMassChange30d = {
  id: 'body-mass-change-30d',
  label: 'Body mass change (30 days)',
  unit: '% loss',
  periodDays: 1,
  hardLimits: {
    orange: [{ op: 'gte', value: 5 }],
    red: [{ op: 'gte', value: 10 }],
  },
  sequenceRules: [],
  conditionalRules: [],
  contextRules: [],
  deviation: { minAbsoluteChange: null, direction: 'high' },
  verification: { thresholds: ['A'], deviation: ['B'] },
  sources: [],
} satisfies IndicatorDraft;

export const energyIntake = {
  id: 'energy-intake',
  label: 'Energy intake',
  unit: '% of plan',
  periodDays: 1,
  earthReference: { low: 90 },
  hardLimits: { orange: [], red: [] },
  sequenceRules: [
    {
      tier: 'orange',
      periods: 3,
      condition: { kind: 'absolute', op: 'lt', value: 70 },
      source: 'project-doc',
    },
  ],
  conditionalRules: [],
  contextRules: [],
  deviation: { minAbsoluteChange: null, direction: 'low' },
  verification: { thresholds: ['B', 'C'], deviation: ['B'] },
  sources: [],
} satisfies IndicatorDraft;

// Weekly reading. The mission-plan target is the reference, so no Earth range is stored.
export const exerciseAdherence = {
  id: 'exercise-adherence',
  label: 'Exercise adherence',
  unit: '% of target',
  periodDays: 7,
  earthReference: {
    note: 'Reference is the mission plan. ISS is roughly 2 h/day, 6 days/week.',
  },
  hardLimits: { orange: [], red: [] },
  sequenceRules: [
    {
      tier: 'orange',
      periods: 2,
      condition: { kind: 'absolute', op: 'lt', value: 50 },
      source: 'project-doc',
    },
  ],
  conditionalRules: [],
  contextRules: [],
  verification: { thresholds: ['B', 'C'] },
  sources: [],
} satisfies IndicatorDraft;
