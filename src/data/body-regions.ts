import {
  BodyRegionsSchema,
  type BodyRegions,
} from '../domain/content/body-regions-schema';
import { parseContent } from './content-parse';

// One entry per body system (FD-15). The function texts say in plain words
// what each system does and make no space-specific claim, so they carry flag B
// (team wording, no source yet). The link from a hazard to a system is a
// separate flag C mapping and is marked in `hazards.ts` and on the panel.
//
// Lead indicator: the indicator whose chart the region panel shows. Each id
// belongs to that system in `src/data/indicators/mapping.ts`. `vision` has no
// indicator in the catalog, so its lead indicator is null.
//
// `mapRegionId` names the matching region of the body map figure.
const bodyRegionsValue = {
  cardiovascular: {
    label: 'Cardiovascular',
    functionText:
      'Your heart and blood vessels move blood around your body. This carries oxygen and nutrients to every part of you and takes waste away.',
    leadIndicatorId: 'resting-hr',
    mapRegionId: 'region-cardiovascular',
    verification: 'B',
    sources: [],
  },
  musculoskeletal: {
    label: 'Bones and muscles',
    functionText:
      'Your bones hold your body up and protect it. Your muscles move it. Both stay strong when they are used regularly.',
    leadIndicatorId: 'exercise-adherence',
    mapRegionId: 'region-musculoskeletal',
    verification: 'B',
    sources: [],
  },
  vision: {
    label: 'Vision',
    functionText:
      'Your eyes and the nerves behind them let you see clearly. Clear sight matters for reading displays, doing tasks and staying safe.',
    leadIndicatorId: null,
    mapRegionId: 'region-vision',
    verification: 'B',
    sources: [],
  },
  immune: {
    label: 'Immune',
    functionText:
      'Your immune system defends your body against germs and helps you recover from illness and injury.',
    leadIndicatorId: 'body-temperature',
    mapRegionId: 'region-immune',
    verification: 'B',
    sources: [],
  },
  mental: {
    label: 'Mental',
    functionText:
      'Your mood, thinking and focus shape how well you work, decide and get along with your crewmates.',
    leadIndicatorId: 'reaction-time',
    mapRegionId: 'region-mental',
    verification: 'B',
    sources: [],
  },
  sleep: {
    label: 'Sleep',
    functionText:
      'Sleep lets your body and mind rest and recover. Steady, good sleep supports your mood, memory and alertness.',
    leadIndicatorId: 'sleep-hours',
    mapRegionId: 'region-sleep',
    verification: 'B',
    sources: [],
  },
} satisfies BodyRegions;

export const bodyRegions = parseContent(
  'src/data/body-regions.ts',
  BodyRegionsSchema,
  bodyRegionsValue,
);
