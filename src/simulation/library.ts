import type { EvaluationInput } from '@/domain/evaluate-input';
import { crew } from './crew';
import { judgesDemo } from './demo-packs/judges-demo';
import { defaultSettings } from './engine/settings';
import { environments } from './environments';
import { issEarlyAdaptation30d } from './scenarios/iss/iss-early-adaptation-30d';
import { lunarDustEva14d } from './scenarios/lunar/lunar-dust-eva-14d';
import { marsTransit30d } from './scenarios/mars/mars-transit-30d';
import type {
  CrewProfile,
  DemoPack,
  EnvironmentConfig,
  Scenario,
  SimulationSettings,
} from './types';

/**
 * What the caller passes in. The fields match `EvaluationInput`, so the adapter copies
 * them unchanged. The library never imports `src/data/`; the caller supplies these.
 */
export type SimulationContext = Pick<
  EvaluationInput,
  'catalog' | 'clusters' | 'config' | 'text'
>;

export interface SimulationLibrary {
  readonly settings: SimulationSettings;
  readonly crew: readonly CrewProfile[];
  readonly environments: readonly EnvironmentConfig[];
  readonly scenarios: readonly Scenario[];
  readonly demoPacks: readonly DemoPack[];
}

// Scenarios in the library. One entry per line. The Mars, ISS and lunar scenarios are
// all registered.
const scenarios: readonly Scenario[] = [
  marsTransit30d,
  issEarlyAdaptation30d,
  lunarDustEva14d,
];

// Demo packs in the library. One entry per line. The judges' pack is registered.
const demoPacks: readonly DemoPack[] = [judgesDemo];

export const defaultLibrary: SimulationLibrary = {
  settings: defaultSettings,
  crew,
  environments,
  scenarios,
  demoPacks,
};
