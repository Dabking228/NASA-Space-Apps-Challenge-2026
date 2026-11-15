import type { IndicatorDraft } from '@/domain/schemas/indicator';

// Values from docs/PROJECT.md section 6.4 (DRAFT, UNVERIFIED). Every `sources`
// array is empty until the team supplies citations. Deviation settings omit
// yellowSd and orangeSd so the engine-wide 2 SD and 3 SD apply (section 6.2, flag B).
// `minAbsoluteChange: null` means the floor is not supplied yet (TD-11, TD-12).

export const sleepHours = {
  id: 'sleep-hours',
  label: 'Sleep',
  unit: 'h',
  periodDays: 1,
  earthReference: { low: 7, high: 9 },
  hardLimits: { orange: [], red: [] },
  sequenceRules: [
    {
      tier: 'orange',
      periods: 3,
      condition: { kind: 'absolute', op: 'lt', value: 6 },
      source: 'project-doc',
    },
    {
      tier: 'red',
      periods: 1,
      condition: { kind: 'absolute', op: 'lt', value: 4 },
      source: 'project-doc',
    },
    {
      tier: 'red',
      periods: 5,
      condition: { kind: 'absolute', op: 'lt', value: 5 },
      source: 'project-doc',
    },
  ],
  conditionalRules: [],
  contextRules: [],
  deviation: { minAbsoluteChange: null, direction: 'both' },
  verification: { thresholds: ['B', 'C'], deviation: ['B'] },
  sources: [],
} satisfies IndicatorDraft;

export const mood = {
  id: 'mood',
  label: 'Daily mood',
  unit: 'score',
  periodDays: 1,
  validRange: { min: 1, max: 5 },
  hardLimits: { orange: [], red: [] },
  sequenceRules: [
    {
      tier: 'orange',
      periods: 3,
      condition: { kind: 'absolute', op: 'lte', value: 2 },
      source: 'project-doc',
    },
  ],
  conditionalRules: [
    {
      tier: 'red',
      comparison: { op: 'lte', value: 1 },
      requires: { kind: 'safety-flag' },
    },
  ],
  contextRules: [],
  deviation: { minAbsoluteChange: null, direction: 'both' },
  verification: { thresholds: ['B'], deviation: ['B'] },
  sources: [],
} satisfies IndicatorDraft;

export const who5 = {
  id: 'who5',
  label: 'WHO-5 wellbeing',
  unit: 'score',
  periodDays: 7,
  earthReference: { low: 50 },
  validRange: { min: 0, max: 100 },
  hardLimits: {
    orange: [{ op: 'lt', value: 50 }],
    red: [{ op: 'lte', value: 28 }],
  },
  sequenceRules: [],
  conditionalRules: [],
  contextRules: [],
  verification: { thresholds: ['A'] },
  sources: [],
} satisfies IndicatorDraft;

// PROJECT.md gives the +25% on 2 consecutive tests but not how often the PVT-B
// runs. periodDays 1 is a proposed-default (TD-17), so the sequence rule that
// counts those periods carries the same marker.
export const reactionTime = {
  id: 'reaction-time',
  label: 'Reaction time',
  unit: 'ms',
  periodDays: 1,
  hardLimits: { orange: [], red: [] },
  sequenceRules: [
    {
      tier: 'orange',
      periods: 2,
      condition: { kind: 'baseline-relative', op: 'gte', fraction: 0.25 },
      source: 'proposed-default',
    },
  ],
  conditionalRules: [],
  contextRules: [],
  deviation: { minAbsoluteChange: null, direction: 'high' },
  verification: { thresholds: ['B', 'C'], deviation: ['B'] },
  sources: [],
} satisfies IndicatorDraft;
