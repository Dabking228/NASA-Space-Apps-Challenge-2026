import type { Scenario } from '../scenario-schema';

// Mars long-haul storyline from docs/PROJECT.md section 11.2.
// Seed 2026 and the first three events (sleep drift, mood dip, solar particle event) come from
// section 11.2. The crew-wide `resting-hr` drift is an extra event from design decision SD-6.
// It feeds the fatigue-stress cluster and the athlete expectation.
// All numbers are synthetic placeholders for a demo, not measurements of real people.
export const marsTransit30d = {
  id: 'mars-transit-30d',
  label: 'Mars transit, 30 days: sleep and mood decline, then a solar storm',
  environmentId: 'mars-transit',
  seed: 2026,
  crew: ['aria', 'kofi', 'mei'],
  durationDays: 30,
  events: [
    {
      type: 'drift',
      day: 6,
      indicator: 'sleep-hours',
      perDay: -0.12,
    },
    {
      type: 'moodDip',
      day: 14,
      depth: 1.5,
      lengthDays: 5,
    },
    {
      type: 'solarParticleEvent',
      day: 21,
      severity: 'moderate',
    },
    {
      type: 'drift',
      day: 14,
      indicator: 'resting-hr',
      perDay: 2,
      lengthDays: 8,
    },
  ],
  expectations: [
    {
      form: 'cluster',
      scope: { who: 'any-crew-member' },
      clusterId: 'fatigue-stress',
      byDay: 29,
    },
    {
      form: 'indicator',
      scope: { who: 'astronaut', astronautId: 'mei' },
      indicatorId: 'resting-hr',
      minTier: 'yellow',
      withinEarthReference: true,
      byDay: 29,
    },
    {
      form: 'indicator',
      scope: { who: 'every-crew-member' },
      indicatorId: 'dose-rate',
      minTier: 'red',
      byDay: 21,
    },
  ],
} satisfies Scenario;
