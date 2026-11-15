import type { IndicatorDraft } from '@/domain/schemas/indicator';

// Vitals from docs/PROJECT.md section 6.3. Limits and operators are kept as written.
// Every `sources` array is empty, so each indicator is unverified until the team cites a source.
// `earthReference` is information for display only. The classifier never reads it.

export const restingHr = {
  id: 'resting-hr',
  label: 'Resting heart rate',
  unit: 'bpm',
  periodDays: 1,
  earthReference: { low: 60, high: 100 },
  hardLimits: {
    orange: [
      { op: 'gt', value: 110 },
      { op: 'lt', value: 45 },
    ],
    red: [
      { op: 'gt', value: 130 },
      { op: 'lt', value: 40 },
    ],
  },
  sequenceRules: [],
  // Red for any value when chest pain or fainting is reported on the same day.
  conditionalRules: [
    {
      tier: 'red',
      requires: { kind: 'symptom', symptoms: ['chest-pain', 'fainting'] },
    },
  ],
  contextRules: [],
  deviation: {
    yellowSd: 2,
    orangeSd: 3,
    minAbsoluteChange: 5,
    direction: 'both',
  },
  verification: { thresholds: ['A', 'B'], deviation: ['B'] },
  sources: [],
} satisfies IndicatorDraft;

export const bpSystolic = {
  id: 'bp-systolic',
  label: 'Systolic blood pressure',
  unit: 'mmHg',
  periodDays: 1,
  earthReference: { high: 120, note: 'Earth reference is below 120/80.' },
  hardLimits: {
    orange: [
      { op: 'gte', value: 140 },
      { op: 'lt', value: 90 },
    ],
    red: [{ op: 'gte', value: 180 }],
  },
  sequenceRules: [],
  // Red below 80 only when any symptom is reported on the same day.
  conditionalRules: [
    {
      tier: 'red',
      comparison: { op: 'lt', value: 80 },
      requires: { kind: 'symptom', symptoms: 'any' },
    },
  ],
  contextRules: [],
  // The floor has not been supplied yet (TD-11, TD-12).
  deviation: { minAbsoluteChange: null, direction: 'both' },
  verification: { thresholds: ['A', 'C'], deviation: ['B'] },
  sources: [],
} satisfies IndicatorDraft;

export const bpDiastolic = {
  id: 'bp-diastolic',
  label: 'Diastolic blood pressure',
  unit: 'mmHg',
  periodDays: 1,
  earthReference: { high: 80, note: 'Earth reference is below 120/80.' },
  hardLimits: {
    orange: [{ op: 'gte', value: 90 }],
    red: [{ op: 'gte', value: 120 }],
  },
  sequenceRules: [],
  conditionalRules: [],
  contextRules: [],
  // The floor has not been supplied yet (TD-11, TD-12).
  deviation: { minAbsoluteChange: null, direction: 'both' },
  verification: { thresholds: ['A', 'C'], deviation: ['B'] },
  sources: [],
} satisfies IndicatorDraft;

export const bodyTemperature = {
  id: 'body-temperature',
  label: 'Body temperature',
  unit: '°C',
  periodDays: 1,
  earthReference: { low: 36.1, high: 37.2 },
  hardLimits: {
    orange: [
      { op: 'gte', value: 38.0 },
      { op: 'lt', value: 35.5 },
    ],
    red: [
      { op: 'gte', value: 39.0 },
      { op: 'lt', value: 35.0 },
    ],
  },
  sequenceRules: [],
  conditionalRules: [],
  contextRules: [],
  // The floor has not been supplied yet (TD-11, TD-12).
  deviation: { minAbsoluteChange: null, direction: 'both' },
  verification: { thresholds: ['A', 'B'], deviation: ['B'] },
  sources: [],
} satisfies IndicatorDraft;

export const spo2 = {
  id: 'spo2',
  label: 'Blood oxygen saturation (SpO₂)',
  unit: '%',
  periodDays: 1,
  earthReference: { low: 95 },
  hardLimits: {
    orange: [{ op: 'lt', value: 92 }],
    red: [{ op: 'lt', value: 90 }],
  },
  sequenceRules: [],
  conditionalRules: [],
  contextRules: [],
  verification: { thresholds: ['A', 'C'] },
  sources: [],
} satisfies IndicatorDraft;

// On-demand indicator. It shows as no data on days without a reading (TD-17).
export const fastingGlucose = {
  id: 'fasting-glucose',
  label: 'Fasting glucose',
  unit: 'mg/dL',
  periodDays: 1,
  earthReference: { low: 70, high: 99 },
  hardLimits: {
    orange: [
      { op: 'gte', value: 126 },
      { op: 'lt', value: 70 },
    ],
    red: [
      { op: 'lt', value: 54 },
      { op: 'gt', value: 300 },
    ],
  },
  sequenceRules: [],
  conditionalRules: [],
  contextRules: [],
  verification: { thresholds: ['A', 'B'] },
  sources: [],
} satisfies IndicatorDraft;
