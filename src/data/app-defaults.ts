import {
  AppDefaultsSchema,
  type AppDefaults,
} from '../domain/content/app-defaults-schema';
import { parseContent } from './content-parse';

// Start state and timing of the app. PROJECT.md gives no value for any of
// these, so each one is a proposed default for the team to review:
// start state FD-13 (Mars transit, aria, day 9, so charts have history),
// link time-scale FD-11 (120 link-seconds per real second),
// findings shown Requirement 22.5.
const appDefaultsValue = {
  startScenarioId: { value: 'mars-transit-30d', source: 'proposed-default' },
  startAstronautId: { value: 'aria', source: 'proposed-default' },
  startDay: { value: 9, source: 'proposed-default' },
  linkTimeScale: { value: 120, source: 'proposed-default' },
  activeFindingsShown: { value: 3, source: 'proposed-default' },
} satisfies AppDefaults;

export const appDefaults = parseContent(
  'src/data/app-defaults.ts',
  AppDefaultsSchema,
  appDefaultsValue,
);
