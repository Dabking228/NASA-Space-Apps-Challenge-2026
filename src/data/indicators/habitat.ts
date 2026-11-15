import type { IndicatorDraft } from '@/domain/schemas/indicator';

// Habitat from docs/PROJECT.md section 6.7 (DRAFT, UNVERIFIED, flag C: least reliable memory).
// Every `sources` array is empty until the team supplies citations.

// PROJECT.md gives "about 5" and "about 10" as placeholders with no operator.
// Both limits use `gte`, proposed operators (TD-16). Readings are also judged against the
// habitat baseline with the engine-wide 2 SD and 3 SD (TD-12). `minAbsoluteChange: null`
// means the floor is not supplied yet (TD-11).
export const cabinCo2 = {
  id: 'cabin-co2',
  label: 'Cabin CO₂',
  unit: 'mmHg',
  periodDays: 1,
  earthReference: {
    high: 0.3,
    note: 'Earth air is about 0.3 mmHg. ISS is typically a few mmHg.',
  },
  hardLimits: {
    orange: [{ op: 'gte', value: 5 }],
    red: [{ op: 'gte', value: 10 }],
  },
  sequenceRules: [],
  conditionalRules: [],
  contextRules: [],
  deviation: { minAbsoluteChange: null, direction: 'both' },
  verification: { thresholds: ['C'], deviation: ['B'] },
  sources: [],
} satisfies IndicatorDraft;
