import type { CrewProfile } from './crew-schema';
import { withShapes } from './signal-shapes';

// PLACEHOLDER: every baseline and the career dose below are synthetic values for
// the demo. They are not reference ranges, thresholds or sourced figures.
export const aria = {
  id: 'aria',
  label: 'Aria',
  synthetic: true,
  baselineStatus: 'placeholder',
  careerDoseBeforeMissionMsv: 120, // placeholder (SD-8)
  preflightSamples: 10,
  signals: withShapes({
    'resting-hr': 68, // placeholder
    'bp-systolic': 112, // placeholder
    'bp-diastolic': 72, // placeholder
    'body-temperature': 36.6, // placeholder
    spo2: 98, // placeholder
    'sleep-hours': 7.4, // placeholder
    mood: 3.8, // placeholder
    who5: 72, // placeholder
    'reaction-time': 300, // placeholder
    'body-mass-change-30d': 0.5, // placeholder
    'energy-intake': 95, // placeholder
    'exercise-adherence': 90, // placeholder
  }),
} satisfies CrewProfile;
