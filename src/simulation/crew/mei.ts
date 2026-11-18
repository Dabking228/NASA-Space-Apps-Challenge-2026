import type { CrewProfile } from './crew-schema';
import { withShapes } from './signal-shapes';

// PLACEHOLDER: every baseline and the career dose below are synthetic values for
// the demo. They are not reference ranges, thresholds or sourced figures.
// Mei is the athlete profile (Requirement 7.6).
export const mei = {
  id: 'mei',
  label: 'Mei',
  synthetic: true,
  baselineStatus: 'placeholder',
  careerDoseBeforeMissionMsv: 30, // placeholder (SD-8)
  preflightSamples: 10,
  signals: withShapes({
    // Placeholder athlete resting heart rate. A reading of 62 is inside the Earth
    // reference but far above this baseline, which the demo shows.
    'resting-hr': 48,
    'bp-systolic': 108, // placeholder
    'bp-diastolic': 68, // placeholder
    'body-temperature': 36.4, // placeholder
    spo2: 99, // placeholder
    'sleep-hours': 7.8, // placeholder
    mood: 4.2, // placeholder
    who5: 80, // placeholder
    'reaction-time': 280, // placeholder
    'body-mass-change-30d': 0.5, // placeholder
    'energy-intake': 97, // placeholder
    'exercise-adherence': 95, // placeholder
  }),
} satisfies CrewProfile;
