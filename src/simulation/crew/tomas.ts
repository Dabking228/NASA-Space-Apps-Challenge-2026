import type { CrewProfile } from './crew-schema';
import { withShapes } from './signal-shapes';

// PLACEHOLDER: every baseline and the career dose below are synthetic values for
// the demo. They are not reference ranges, thresholds or sourced figures.
export const tomas = {
  id: 'tomas',
  label: 'Tomas',
  synthetic: true,
  baselineStatus: 'placeholder',
  careerDoseBeforeMissionMsv: 200, // placeholder (SD-8)
  preflightSamples: 10,
  signals: withShapes({
    'resting-hr': 62, // placeholder
    'bp-systolic': 116, // placeholder
    'bp-diastolic': 74, // placeholder
    'body-temperature': 36.6, // placeholder
    spo2: 98, // placeholder
    'sleep-hours': 7.2, // placeholder
    mood: 3.6, // placeholder
    who5: 70, // placeholder
    'reaction-time': 310, // placeholder
    'body-mass-change-30d': 0.5, // placeholder
    'energy-intake': 94, // placeholder
    'exercise-adherence': 88, // placeholder
  }),
} satisfies CrewProfile;
