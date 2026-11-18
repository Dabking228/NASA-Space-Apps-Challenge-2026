import type { DemoPack } from './demo-pack-schema';

// Judges' 3-minute demo pack. It follows the in-app steps 2 to 7 of the demo plan in
// docs/PROJECT.md section 16. Steps 1 and 8 are not in-app segments, so they are not listed.
// The target durations add up to 170 seconds, under the 180-second cap.
// Days are mission days (0 to 29). Captions are plain-language text for non-experts.
// The scenarios use synthetic data and draft values. The captions describe decision
// support, not a diagnosis.
export const judgesDemo = {
  id: 'judges-3min',
  label: "Judges' 3-minute demo",
  segments: [
    {
      id: 'dashboard-body-map',
      planStep: 2,
      scenarioId: 'mars-transit-30d',
      firstDay: 0,
      lastDay: 9,
      focusAstronautId: 'aria',
      targetSeconds: 30,
      caption:
        'Everything looks calm. The body map compares each body system with the usual values for that astronaut, and sleep is just starting to drift.',
    },
    {
      id: 'guided-check-in',
      planStep: 3,
      scenarioId: 'mars-transit-30d',
      firstDay: 10,
      lastDay: 11,
      focusAstronautId: 'aria',
      targetSeconds: 30,
      caption:
        'A guided daily check-in. Simple steps and plain instructions help someone who is not a medical expert take a measurement.',
    },
    {
      id: 'fatigue-cluster',
      planStep: 4,
      scenarioId: 'mars-transit-30d',
      firstDay: 12,
      lastDay: 17,
      focusAstronautId: 'aria',
      targetSeconds: 40,
      caption:
        'Sleep, mood and heart rate each slip a little. Together they point to a pattern of fatigue and stress, and the tool explains why it raised the flag.',
    },
    {
      id: 'personal-baseline',
      planStep: 5,
      scenarioId: 'mars-transit-30d',
      firstDay: 16,
      lastDay: 21,
      focusAstronautId: 'mei',
      targetSeconds: 20,
      caption:
        'This astronaut is an athlete. A resting heart rate can sit in the usual Earth range and still be a change for them, because the tool compares each person with their own baseline.',
    },
    {
      id: 'escalation',
      planStep: 6,
      scenarioId: 'mars-transit-30d',
      firstDay: 17,
      lastDay: 22,
      focusAstronautId: 'aria',
      targetSeconds: 30,
      caption:
        'A summary for the ground team, sent with a simulated message delay. A solar particle event on day 21 also raises the radiation reading.',
    },
    {
      id: 'environment-switch',
      planStep: 7,
      scenarioId: 'iss-early-adaptation-30d',
      firstDay: 20,
      lastDay: 25,
      focusAstronautId: 'aria',
      targetSeconds: 20,
      caption:
        'Switching to the space station changes which hazards matter most. Here, rising cabin air CO₂ and a few symptoms together raise a possible air-quality flag.',
    },
  ],
} satisfies DemoPack;
