import type { Scenario } from '../scenario-schema';

// Lunar dust and EVA storyline from docs/PROJECT.md section 11.2 and section 17.
// The EVA, dust symptoms and solar particle event come from design decisions SD-6 and MR-16.
// No vision symptom is generated; dust irritation uses `sore-throat` and `other` (MR-16).
// Seed 4004 is a placeholder (SD-15). Changing it means re-running the checks.
// All numbers are synthetic placeholders for a demo, not measurements of real people.
export const lunarDustEva14d = {
  id: 'lunar-dust-eva-14d',
  label:
    'Lunar surface, 14 days: two EVAs, dust irritation, then a solar particle event',
  environmentId: 'lunar-surface',
  seed: 4004,
  crew: ['aria', 'kofi', 'mei', 'tomas'],
  durationDays: 14,
  events: [
    // Two EVAs: a one-day heart rate rise for the two crew members who go outside.
    {
      type: 'eva',
      day: 3,
      heartRateDeltaBpm: 20,
      lengthDays: 1,
      astronauts: ['aria', 'kofi'],
    },
    {
      type: 'eva',
      day: 7,
      heartRateDeltaBpm: 20,
      lengthDays: 1,
      astronauts: ['aria', 'kofi'],
    },
    // Dust irritation after the first EVA: throat and eye symptoms.
    {
      type: 'symptom',
      day: 5,
      kind: 'sore-throat',
      lengthDays: 4,
      astronauts: ['aria', 'kofi'],
    },
    {
      type: 'symptom',
      day: 5,
      kind: 'other',
      lengthDays: 4,
      astronauts: ['aria', 'kofi'],
    },
    // Solar particle event: raises the habitat dose rate for the whole crew.
    {
      type: 'solarParticleEvent',
      day: 9,
      severity: 'moderate',
    },
  ],
  expectations: [
    {
      form: 'indicator',
      scope: { who: 'every-crew-member' },
      indicatorId: 'dose-rate',
      minTier: 'red',
      byDay: 9,
    },
  ],
} satisfies Scenario;
