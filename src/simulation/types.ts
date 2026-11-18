// Every simulation type is inferred from its Zod schema and re-exported here, so other
// modules import types from one place. `type-guards.ts` asserts at compile time that
// each re-export equals its schema output.
export type {
  SimulationProblem,
  SimulationProblemCode,
  SimulationProblemEntryKind,
} from './engine/problem';
export type { SignalBounds, SignalSpec } from './engine/signal-spec-schema';
export type {
  EventSettings,
  NoiseSettings,
  SimulationSettings,
  SolarParticleEventSettings,
  SymptomEventSettings,
} from './engine/settings-schema';
// `GroundLinkConfig` is defined with the environment shape and is exported once, from there.
export type {
  BlackoutRule,
  EnvironmentConfig,
  EvacuationClass,
  GroundLinkConfig,
  HabitatSignals,
  OneWayDelayRange,
} from './environments/environment-schema';
export type {
  AstronautRun,
  GroundLinkStatus,
  PreFlightSeeds,
  SimulationRun,
} from './engine/run-schema';
export type { EventKind, ScenarioEvent } from './events/event-schemas';
export type { AstronautIndicatorId, CrewProfile } from './crew/crew-schema';
export type {
  ExpectationScope,
  Scenario,
  StorylineExpectation,
} from './scenarios/scenario-schema';
export type { DemoPack, DemoSegment } from './demo-packs/demo-pack-schema';
