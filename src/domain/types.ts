export type Tier = 'green' | 'yellow' | 'orange' | 'red';

// Every other domain type is inferred from its Zod schema and re-exported here.
// `type-guards.ts` asserts at compile time that each re-export equals its schema output.
export type {
  BodySystem,
  Confidence,
  Hazard,
  MissionDay,
  QualityFlag,
  RuleSource,
  SymptomKind,
  VerificationFlag,
} from './schemas/vocabulary';
export type { SourceReference } from './schemas/source';
export type {
  AlertReport,
  Reading,
  SafetyFlag,
  SymptomReport,
} from './schemas/reading';
export type {
  Comparison,
  ComparisonOp,
  ConditionalRule,
  ContextRule,
  DeviationSettings,
  FindingTier,
  IndicatorDefinition,
  IndicatorDraft,
  ResolvedDeviation,
  SequenceCondition,
  SequenceRule,
} from './schemas/indicator';
export type {
  BaselineConfig,
  ConfidenceConfig,
  DeviationDefaults,
  EngineConfig,
  FreezeConfig,
  PersistenceConfig,
} from './schemas/config';
export type { ClusterDefinition, ClusterMember } from './schemas/cluster';
export type { Finding } from './schemas/finding';
export type {
  CatalogProblem,
  CatalogProblemCode,
} from './schemas/catalog-problem';
export type { EnvironmentProfile } from './environments/environment-profile';
export type { DomainError, Result } from './result';
