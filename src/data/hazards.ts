import { HazardsSchema, type Hazards } from '../domain/content/hazards-schema';
import { parseContent } from './content-parse';

// One entry per hazard of the NASA Human Research Program (PROJECT.md section
// 9). The health effects come from that section, which is a draft written from
// memory and not checked against NASA pages. Every entry is flag C, so each
// text says it is a draft in plain words and none states a fact. The text holds
// no number, dose or drug.
const hazardsValue = {
  radiation: {
    label: 'Radiation',
    description:
      'Draft summary: space radiation may raise long-term health risks and may affect the brain, heart and immune system. This has not been checked against NASA sources yet.',
    verification: 'C',
    sources: [],
  },
  'isolation-confinement': {
    label: 'Isolation and confinement',
    description:
      'Draft summary: living in a small group in a small space for a long time may affect mood, sleep, thinking and how the team gets along. This has not been checked against NASA sources yet.',
    verification: 'C',
    sources: [],
  },
  'distance-from-earth': {
    label: 'Distance from Earth',
    description:
      'Draft summary: far from Earth, help and supplies come late or not at all, so the crew must manage more on its own. This has not been checked against NASA sources yet.',
    verification: 'C',
    sources: [],
  },
  'gravity-fields': {
    label: 'Gravity fields',
    description:
      'Draft summary: changes in gravity may weaken bones and muscles, shift body fluids, strain the heart and blood vessels, change vision and upset balance. This has not been checked against NASA sources yet.',
    verification: 'C',
    sources: [],
  },
  'hostile-closed-environment': {
    label: 'Hostile closed environment',
    description:
      'Draft summary: a sealed habitat can affect air quality, noise, food, hygiene and the spread of infection. This has not been checked against NASA sources yet.',
    verification: 'C',
    sources: [],
  },
} satisfies Hazards;

export const hazards = parseContent(
  'src/data/hazards.ts',
  HazardsSchema,
  hazardsValue,
);
