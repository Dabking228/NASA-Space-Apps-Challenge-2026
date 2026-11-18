import {
  DirectorPresetsSchema,
  type DirectorPresets,
} from '../domain/content/director-presets-schema';
import { parseContent } from './content-parse';

// Events the director panel can inject (FD-14). Each payload holds the event
// `type` and its parameters and no `day`: the day field of the panel adds it.
// The kinds and parameter names follow src/simulation/events/event-schemas.ts.
// Presets with origin `from-scenario` copy their values from the shipped scenarios:
// - mars-transit-30d: sleep drift, mood dip, solar particle event
// - iss-early-adaptation-30d: treadmill outage, headache
// - lunar-dust-eva-14d: EVA
// `co2Spike` and `commsBlackout` appear in no shipped scenario, so their values
// are proposed defaults for the team to review. All numbers are synthetic.
// Omitting `astronauts` means the whole crew. The EVA kind needs an astronaut
// list, so it names `aria` and `kofi` as the lunar scenario does; both are in
// every shipped scenario. The simulation reports a problem if the crew lacks them.
const directorPresetsValue = [
  {
    id: 'sleep-drift',
    label: 'Sleep drift',
    payload: { type: 'drift', indicator: 'sleep-hours', perDay: -0.12 },
    origin: 'from-scenario',
  },
  {
    id: 'mood-dip',
    label: 'Mood dip',
    payload: { type: 'moodDip', depth: 1.5, lengthDays: 5 },
    origin: 'from-scenario',
  },
  {
    id: 'solar-particle-event',
    label: 'Solar particle event',
    payload: { type: 'solarParticleEvent', severity: 'moderate' },
    origin: 'from-scenario',
  },
  {
    id: 'eva',
    label: 'EVA',
    payload: {
      type: 'eva',
      heartRateDeltaBpm: 20,
      lengthDays: 1,
      astronauts: ['aria', 'kofi'],
    },
    origin: 'from-scenario',
  },
  {
    id: 'treadmill-outage',
    label: 'Treadmill outage',
    payload: {
      type: 'equipmentOutage',
      equipment: 'treadmill',
      reductionFraction: 0.6,
      lengthDays: 12,
    },
    origin: 'from-scenario',
  },
  {
    id: 'headache',
    label: 'Headache',
    payload: { type: 'symptom', kind: 'headache', lengthDays: 3 },
    origin: 'from-scenario',
  },
  // Proposed default: a short rise that stays below the draft orange limit of cabin CO₂.
  {
    id: 'co2-spike',
    label: 'CO₂ spike',
    payload: { type: 'co2Spike', deltaMmHg: 3, lengthDays: 2 },
    origin: 'proposed-default',
  },
  // Proposed default: a short loss of the ground link.
  {
    id: 'comms-blackout',
    label: 'Comms blackout',
    payload: { type: 'commsBlackout', lengthDays: 2 },
    origin: 'proposed-default',
  },
] satisfies DirectorPresets;

export const directorPresets = parseContent(
  'src/data/director-presets.ts',
  DirectorPresetsSchema,
  directorPresetsValue,
);
