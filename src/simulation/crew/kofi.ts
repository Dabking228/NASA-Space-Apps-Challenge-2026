import type { CrewProfile } from './crew-schema';
import { withShapes } from './signal-shapes';

// PLACEHOLDER: every baseline and the career dose below are synthetic values for
// the demo. They are not reference ranges, thresholds or sourced figures.
export const kofi = {
  id: 'kofi',
  label: 'Kofi',
  synthetic: true,
  baselineStatus: 'placeholder',
  careerDoseBeforeMissionMsv: 60, // placeholder (SD-8)
  preflightSamples: 10,
  signals: withShapes({
    'resting-hr': 74, // placeholder
    'bp-systolic': 118, // placeholder
    'bp-diastolic': 76, // placeholder
    'body-temperature': 36.7, // placeholder
    spo2: 97, // placeholder
    'sleep-hours': 7.6, // placeholder
    mood: 4.0, // placeholder
    who5: 76, // placeholder
    'reaction-time': 290, // placeholder
    'body-mass-change-30d': 0.5, // placeholder
    'energy-intake': 96, // placeholder
    'exercise-adherence': 92, // placeholder
  }),
} satisfies CrewProfile;
