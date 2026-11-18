/**
 * Compile-time assertions only. This file holds types and no runtime code.
 * Each alias fails `npm run typecheck` if an exported simulation type drifts from its schema.
 * The aliases are exported so ESLint does not report them as unused.
 * Object types are `Readonly` (shallow) wrappers of the schema output; enum types are the output itself.
 */
import type { z } from 'zod';
import type { Equal, Expect } from '@/domain/type-guards';
import type {
  AstronautIndicatorIdSchema,
  CrewProfileSchema,
} from './crew/crew-schema';
import type {
  DemoPackSchema,
  DemoSegmentSchema,
} from './demo-packs/demo-pack-schema';
import type {
  NoiseSettingsSchema,
  EventSettingsSchema,
  SimulationSettingsSchema,
  SolarParticleEventSettingsSchema,
  SymptomEventSettingsSchema,
} from './engine/settings-schema';
import type {
  SimulationProblemCodeSchema,
  SimulationProblemEntryKindSchema,
  SimulationProblemSchema,
} from './engine/problem';
import type {
  AstronautRunSchema,
  GroundLinkStatusSchema,
  PreFlightSeedsSchema,
  SimulationRunSchema,
} from './engine/run-schema';
import type {
  SignalBoundsSchema,
  SignalSpecSchema,
} from './engine/signal-spec-schema';
import type {
  BlackoutRuleSchema,
  EnvironmentConfigSchema,
  EvacuationClassSchema,
  GroundLinkConfigSchema,
  HabitatSignalsSchema,
  OneWayDelayRangeSchema,
} from './environments/environment-schema';
import type { EVENT_KINDS, ScenarioEventSchema } from './events/event-schemas';
import type {
  ExpectationScopeSchema,
  ScenarioSchema,
  StorylineExpectationSchema,
} from './scenarios/scenario-schema';
import type {
  AstronautIndicatorId,
  AstronautRun,
  BlackoutRule,
  CrewProfile,
  DemoPack,
  DemoSegment,
  EnvironmentConfig,
  EvacuationClass,
  EventKind,
  EventSettings,
  ExpectationScope,
  GroundLinkConfig,
  GroundLinkStatus,
  HabitatSignals,
  NoiseSettings,
  OneWayDelayRange,
  PreFlightSeeds,
  Scenario,
  ScenarioEvent,
  SignalBounds,
  SignalSpec,
  SimulationProblem,
  SimulationProblemCode,
  SimulationProblemEntryKind,
  SimulationRun,
  SimulationSettings,
  SolarParticleEventSettings,
  StorylineExpectation,
  SymptomEventSettings,
} from './types';

// Problems
export type SimulationProblemCodeMatchesSchema = Expect<
  Equal<z.infer<typeof SimulationProblemCodeSchema>, SimulationProblemCode>
>;
export type SimulationProblemEntryKindMatchesSchema = Expect<
  Equal<
    z.infer<typeof SimulationProblemEntryKindSchema>,
    SimulationProblemEntryKind
  >
>;
export type SimulationProblemMatchesSchema = Expect<
  Equal<Readonly<z.infer<typeof SimulationProblemSchema>>, SimulationProblem>
>;

// Signal spec and settings
export type SignalBoundsMatchesSchema = Expect<
  Equal<Readonly<z.infer<typeof SignalBoundsSchema>>, SignalBounds>
>;
export type SignalSpecMatchesSchema = Expect<
  Equal<Readonly<z.infer<typeof SignalSpecSchema>>, SignalSpec>
>;
export type NoiseSettingsMatchesSchema = Expect<
  Equal<Readonly<z.infer<typeof NoiseSettingsSchema>>, NoiseSettings>
>;
export type SolarParticleEventSettingsMatchesSchema = Expect<
  Equal<
    Readonly<z.infer<typeof SolarParticleEventSettingsSchema>>,
    SolarParticleEventSettings
  >
>;
export type SymptomEventSettingsMatchesSchema = Expect<
  Equal<
    Readonly<z.infer<typeof SymptomEventSettingsSchema>>,
    SymptomEventSettings
  >
>;
export type EventSettingsMatchesSchema = Expect<
  Equal<Readonly<z.infer<typeof EventSettingsSchema>>, EventSettings>
>;
export type SimulationSettingsMatchesSchema = Expect<
  Equal<Readonly<z.infer<typeof SimulationSettingsSchema>>, SimulationSettings>
>;

// Events
export type ScenarioEventMatchesSchema = Expect<
  Equal<Readonly<z.infer<typeof ScenarioEventSchema>>, ScenarioEvent>
>;

// Environments and ground link
export type EvacuationClassMatchesSchema = Expect<
  Equal<z.infer<typeof EvacuationClassSchema>, EvacuationClass>
>;
export type BlackoutRuleMatchesSchema = Expect<
  Equal<z.infer<typeof BlackoutRuleSchema>, BlackoutRule>
>;
export type OneWayDelayRangeMatchesSchema = Expect<
  Equal<Readonly<z.infer<typeof OneWayDelayRangeSchema>>, OneWayDelayRange>
>;
export type GroundLinkConfigMatchesSchema = Expect<
  Equal<Readonly<z.infer<typeof GroundLinkConfigSchema>>, GroundLinkConfig>
>;
export type HabitatSignalsMatchesSchema = Expect<
  Equal<Readonly<z.infer<typeof HabitatSignalsSchema>>, HabitatSignals>
>;
export type EnvironmentConfigMatchesSchema = Expect<
  Equal<Readonly<z.infer<typeof EnvironmentConfigSchema>>, EnvironmentConfig>
>;

// Crew
export type AstronautIndicatorIdMatchesSchema = Expect<
  Equal<z.infer<typeof AstronautIndicatorIdSchema>, AstronautIndicatorId>
>;
export type CrewProfileMatchesSchema = Expect<
  Equal<Readonly<z.infer<typeof CrewProfileSchema>>, CrewProfile>
>;

// Scenarios
export type ExpectationScopeMatchesSchema = Expect<
  Equal<Readonly<z.infer<typeof ExpectationScopeSchema>>, ExpectationScope>
>;
export type StorylineExpectationMatchesSchema = Expect<
  Equal<
    Readonly<z.infer<typeof StorylineExpectationSchema>>,
    StorylineExpectation
  >
>;
export type ScenarioMatchesSchema = Expect<
  Equal<Readonly<z.infer<typeof ScenarioSchema>>, Scenario>
>;

// Demo packs
export type DemoSegmentMatchesSchema = Expect<
  Equal<Readonly<z.infer<typeof DemoSegmentSchema>>, DemoSegment>
>;
export type DemoPackMatchesSchema = Expect<
  Equal<Readonly<z.infer<typeof DemoPackSchema>>, DemoPack>
>;

// Run
export type PreFlightSeedsMatchesSchema = Expect<
  Equal<Readonly<z.infer<typeof PreFlightSeedsSchema>>, PreFlightSeeds>
>;
export type GroundLinkStatusMatchesSchema = Expect<
  Equal<Readonly<z.infer<typeof GroundLinkStatusSchema>>, GroundLinkStatus>
>;
export type AstronautRunMatchesSchema = Expect<
  Equal<Readonly<z.infer<typeof AstronautRunSchema>>, AstronautRun>
>;
export type SimulationRunMatchesSchema = Expect<
  Equal<Readonly<z.infer<typeof SimulationRunSchema>>, SimulationRun>
>;

// `EventKind` is the `type` field of the event union, and `EVENT_KINDS` lists every kind.
// The `satisfies` clause on `EVENT_KINDS` only rejects an unknown entry. The union equality
// below rejects a missing kind, and the duplicate check rejects a repeated one.
export type EventKindMatchesSchema = Expect<
  Equal<z.infer<typeof ScenarioEventSchema>['type'], EventKind>
>;
export type EventKindsCoverEveryKind = Expect<
  Equal<(typeof EVENT_KINDS)[number], EventKind>
>;

type HasDuplicate<T extends readonly unknown[]> = T extends readonly [
  infer Head,
  ...infer Rest,
]
  ? Head extends Rest[number]
    ? true
    : HasDuplicate<Rest>
  : false;
export type EventKindsListEachKindOnce = Expect<
  Equal<HasDuplicate<typeof EVENT_KINDS>, false>
>;
