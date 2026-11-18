import type { Scenario } from '../scenario-schema';

// ISS early adaptation storyline from docs/PROJECT.md section 11.2 and section 17.
// The extra events (week-1 fluid shift, headaches, reaction-time pulse) come from design
// decision SD-6. They feed the `possible-co2-exposure` cluster and the week-1 story.
// The week-1 events are sized small on purpose (SD-9), so unrelated indicators stay green.
// Seed 7001 is a placeholder (SD-15). Changing it means re-running the checks.
// All numbers are synthetic placeholders for a demo, not measurements of real people.
export const issEarlyAdaptation30d = {
  id: 'iss-early-adaptation-30d',
  label:
    'ISS early adaptation, 30 days: week-1 fluid shift, a treadmill outage, then rising cabin CO₂',
  environmentId: 'iss',
  seed: 7001,
  crew: ['aria', 'kofi', 'mei', 'tomas'],
  durationDays: 30,
  events: [
    // Week-1 fluid shift: mild drifts on whole crew.
    {
      type: 'drift',
      day: 0,
      indicator: 'resting-hr',
      perDay: 0.6,
      lengthDays: 5,
    },
    {
      type: 'drift',
      day: 0,
      indicator: 'bp-systolic',
      perDay: -0.8,
      lengthDays: 5,
    },
    {
      type: 'drift',
      day: 0,
      indicator: 'bp-diastolic',
      perDay: -0.6,
      lengthDays: 5,
    },
    {
      type: 'symptom',
      day: 1,
      kind: 'headache',
      lengthDays: 3,
      astronauts: ['aria', 'kofi'],
    },
    // Treadmill outage: weekly readings on days 14 and 21 fall inside it.
    {
      type: 'equipmentOutage',
      day: 12,
      equipment: 'treadmill',
      reductionFraction: 0.6,
      lengthDays: 12,
    },
    // Habitat drift: no astronaut list. Peaks near 4.0 mmHg, below the orange limit of 5.
    {
      type: 'drift',
      day: 20,
      indicator: 'cabin-co2',
      perDay: 0.15,
    },
    // CO2 cluster members for `aria`: a headache and a one-day reaction-time pulse.
    {
      type: 'symptom',
      day: 24,
      kind: 'headache',
      lengthDays: 3,
      astronauts: ['aria'],
    },
    {
      type: 'drift',
      day: 25,
      indicator: 'reaction-time',
      perDay: 100,
      lengthDays: 1,
      astronauts: ['aria'],
    },
  ],
  expectations: [
    {
      form: 'cluster',
      scope: { who: 'any-crew-member' },
      clusterId: 'possible-co2-exposure',
      byDay: 29,
    },
    {
      form: 'indicator',
      scope: { who: 'any-crew-member' },
      indicatorId: 'exercise-adherence',
      minTier: 'orange',
      byDay: 29,
    },
  ],
} satisfies Scenario;
