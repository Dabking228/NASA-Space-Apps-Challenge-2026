/**
 * Compile-time assertions only. This file holds types and no runtime code.
 * Each alias fails `npm run typecheck` if an exported type drifts from its schema.
 * The aliases are exported so ESLint does not report them as unused.
 */
import type { z } from 'zod';
import type { EnvironmentProfileSchema } from './environments/environment-profile';
import type {
  AlertReportSchema,
  ReadingSchema,
  SafetyFlagSchema,
  SymptomReportSchema,
} from './schemas/reading';
import type {
  CatalogProblemCodeSchema,
  CatalogProblemSchema,
} from './schemas/catalog-problem';
import type {
  ClusterDefinitionSchema,
  ClusterMemberSchema,
} from './schemas/cluster';
import type {
  BaselineConfigSchema,
  ConfidenceConfigSchema,
  DeviationDefaultsSchema,
  EngineConfigSchema,
  FreezeConfigSchema,
  PersistenceConfigSchema,
} from './schemas/config';
import type { FindingSchema } from './schemas/finding';
import type {
  ComparisonOpSchema,
  ComparisonSchema,
  ConditionalRuleSchema,
  ContextRuleSchema,
  DeviationSettingsSchema,
  FindingTierSchema,
  IndicatorDefinitionSchema,
  SequenceConditionSchema,
  SequenceRuleSchema,
} from './schemas/indicator';
import type { SourceReferenceSchema } from './schemas/source';
import type {
  BODY_SYSTEM_ORDER,
  BodySystemSchema,
  ConfidenceSchema,
  HazardSchema,
  MissionDaySchema,
  QualityFlagSchema,
  RuleSourceSchema,
  SymptomKindSchema,
  VerificationFlagSchema,
} from './schemas/vocabulary';
import type { TierSchema } from './tier-schema';
import type { CONFIDENCE_ORDER, TIER_ORDER } from './tiers';
import type {
  AlertReport,
  BaselineConfig,
  BodySystem,
  CatalogProblem,
  CatalogProblemCode,
  ClusterDefinition,
  ClusterMember,
  Comparison,
  ComparisonOp,
  Confidence,
  ConfidenceConfig,
  ConditionalRule,
  ContextRule,
  DeviationDefaults,
  DeviationSettings,
  EngineConfig,
  EnvironmentProfile,
  Finding,
  FindingTier,
  FreezeConfig,
  Hazard,
  IndicatorDefinition,
  IndicatorDraft,
  MissionDay,
  PersistenceConfig,
  QualityFlag,
  Reading,
  ResolvedDeviation,
  RuleSource,
  SafetyFlag,
  SequenceCondition,
  SequenceRule,
  SourceReference,
  SymptomKind,
  SymptomReport,
  Tier,
  VerificationFlag,
} from './types';

export type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
export type Expect<T extends true> = T;

// Vocabulary
export type VerificationFlagMatchesSchema = Expect<
  Equal<z.infer<typeof VerificationFlagSchema>, VerificationFlag>
>;
export type ConfidenceMatchesSchema = Expect<
  Equal<z.infer<typeof ConfidenceSchema>, Confidence>
>;
export type HazardMatchesSchema = Expect<
  Equal<z.infer<typeof HazardSchema>, Hazard>
>;
export type BodySystemMatchesSchema = Expect<
  Equal<z.infer<typeof BodySystemSchema>, BodySystem>
>;
export type QualityFlagMatchesSchema = Expect<
  Equal<z.infer<typeof QualityFlagSchema>, QualityFlag>
>;
export type SymptomKindMatchesSchema = Expect<
  Equal<z.infer<typeof SymptomKindSchema>, SymptomKind>
>;
export type MissionDayMatchesSchema = Expect<
  Equal<z.infer<typeof MissionDaySchema>, MissionDay>
>;
export type RuleSourceMatchesSchema = Expect<
  Equal<z.infer<typeof RuleSourceSchema>, RuleSource>
>;

// The existing hand-written Tier union stays identical to the Zod schema.
export type TierMatchesSchema = Expect<Equal<z.infer<typeof TierSchema>, Tier>>;

// Sources and readings
export type SourceReferenceMatchesSchema = Expect<
  Equal<z.infer<typeof SourceReferenceSchema>, SourceReference>
>;
export type ReadingMatchesSchema = Expect<
  Equal<z.infer<typeof ReadingSchema>, Reading>
>;
export type SymptomReportMatchesSchema = Expect<
  Equal<z.infer<typeof SymptomReportSchema>, SymptomReport>
>;
export type SafetyFlagMatchesSchema = Expect<
  Equal<z.infer<typeof SafetyFlagSchema>, SafetyFlag>
>;
export type AlertReportMatchesSchema = Expect<
  Equal<z.infer<typeof AlertReportSchema>, AlertReport>
>;

// Indicator definitions
export type ComparisonOpMatchesSchema = Expect<
  Equal<z.infer<typeof ComparisonOpSchema>, ComparisonOp>
>;
export type ComparisonMatchesSchema = Expect<
  Equal<z.infer<typeof ComparisonSchema>, Comparison>
>;
export type FindingTierMatchesSchema = Expect<
  Equal<z.infer<typeof FindingTierSchema>, FindingTier>
>;
export type SequenceConditionMatchesSchema = Expect<
  Equal<z.infer<typeof SequenceConditionSchema>, SequenceCondition>
>;
export type SequenceRuleMatchesSchema = Expect<
  Equal<z.infer<typeof SequenceRuleSchema>, SequenceRule>
>;
export type ConditionalRuleMatchesSchema = Expect<
  Equal<z.infer<typeof ConditionalRuleSchema>, ConditionalRule>
>;
export type ContextRuleMatchesSchema = Expect<
  Equal<z.infer<typeof ContextRuleSchema>, ContextRule>
>;
export type DeviationSettingsMatchesSchema = Expect<
  Equal<z.infer<typeof DeviationSettingsSchema>, DeviationSettings>
>;
export type ResolvedDeviationMatchesSchema = Expect<
  Equal<Required<z.infer<typeof DeviationSettingsSchema>>, ResolvedDeviation>
>;
export type IndicatorDefinitionMatchesSchema = Expect<
  Equal<z.infer<typeof IndicatorDefinitionSchema>, IndicatorDefinition>
>;
export type IndicatorDraftMatchesSchema = Expect<
  Equal<
    Omit<
      z.infer<typeof IndicatorDefinitionSchema>,
      'hazards' | 'system' | 'verification'
    > & {
      verification: Omit<
        z.infer<typeof IndicatorDefinitionSchema>['verification'],
        'mapping'
      >;
    },
    IndicatorDraft
  >
>;

// Engine config
export type DeviationDefaultsMatchesSchema = Expect<
  Equal<z.infer<typeof DeviationDefaultsSchema>, DeviationDefaults>
>;
export type BaselineConfigMatchesSchema = Expect<
  Equal<z.infer<typeof BaselineConfigSchema>, BaselineConfig>
>;
export type FreezeConfigMatchesSchema = Expect<
  Equal<z.infer<typeof FreezeConfigSchema>, FreezeConfig>
>;
export type PersistenceConfigMatchesSchema = Expect<
  Equal<z.infer<typeof PersistenceConfigSchema>, PersistenceConfig>
>;
export type ConfidenceConfigMatchesSchema = Expect<
  Equal<z.infer<typeof ConfidenceConfigSchema>, ConfidenceConfig>
>;
export type EngineConfigMatchesSchema = Expect<
  Equal<z.infer<typeof EngineConfigSchema>, EngineConfig>
>;

// Clusters, findings, catalog problems, environments
export type ClusterMemberMatchesSchema = Expect<
  Equal<z.infer<typeof ClusterMemberSchema>, ClusterMember>
>;
export type ClusterDefinitionMatchesSchema = Expect<
  Equal<z.infer<typeof ClusterDefinitionSchema>, ClusterDefinition>
>;
export type FindingMatchesSchema = Expect<
  Equal<z.infer<typeof FindingSchema>, Finding>
>;
export type CatalogProblemCodeMatchesSchema = Expect<
  Equal<z.infer<typeof CatalogProblemCodeSchema>, CatalogProblemCode>
>;
export type CatalogProblemMatchesSchema = Expect<
  Equal<z.infer<typeof CatalogProblemSchema>, CatalogProblem>
>;
export type EnvironmentProfileMatchesSchema = Expect<
  Equal<z.infer<typeof EnvironmentProfileSchema>, EnvironmentProfile>
>;

// Order arrays cover exactly the union, no more and no less.
export type TierOrderIsComplete = Expect<
  Equal<(typeof TIER_ORDER)[number], Tier>
>;
export type ConfidenceOrderIsComplete = Expect<
  Equal<(typeof CONFIDENCE_ORDER)[number], Confidence>
>;
export type BodySystemOrderIsComplete = Expect<
  Equal<(typeof BODY_SYSTEM_ORDER)[number], BodySystem>
>;
