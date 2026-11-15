import { z } from 'zod';
import { TierSchema } from '../tier-schema';
import { SourceReferenceSchema } from './source';
import {
  BodySystemSchema,
  HazardSchema,
  RuleSourceSchema,
  SymptomKindSchema,
  VerificationFlagSchema,
} from './vocabulary';

export const ComparisonOpSchema = z.enum(['gt', 'gte', 'lt', 'lte']);
export type ComparisonOp = z.infer<typeof ComparisonOpSchema>;

export const ComparisonSchema = z.strictObject({
  op: ComparisonOpSchema,
  value: z.number(),
});
export type Comparison = z.infer<typeof ComparisonSchema>;

/** Any tier a rule can raise. Green is the absence of a finding, so rules never name it. */
export const FindingTierSchema = TierSchema.exclude(['green']);
export type FindingTier = z.infer<typeof FindingTierSchema>;

export const SequenceConditionSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('absolute'),
    op: ComparisonOpSchema,
    value: z.number(),
  }),
  z.strictObject({
    kind: z.literal('baseline-relative'),
    op: ComparisonOpSchema,
    fraction: z.number(),
  }),
  z.strictObject({
    kind: z.literal('background-multiple'),
    op: ComparisonOpSchema,
    multiple: z.number().positive(),
  }),
]);
export type SequenceCondition = z.infer<typeof SequenceConditionSchema>;

export const SequenceRuleSchema = z.strictObject({
  tier: FindingTierSchema,
  periods: z.int().min(1),
  condition: SequenceConditionSchema,
  source: RuleSourceSchema,
});
export type SequenceRule = z.infer<typeof SequenceRuleSchema>;

export const ConditionalRuleSchema = z.strictObject({
  tier: FindingTierSchema,
  // Absent means "any value".
  comparison: ComparisonSchema.optional(),
  requires: z.discriminatedUnion('kind', [
    z.strictObject({
      kind: z.literal('symptom'),
      symptoms: z.union([z.array(SymptomKindSchema).min(1), z.literal('any')]),
    }),
    z.strictObject({ kind: z.literal('safety-flag') }),
  ]),
});
export type ConditionalRule = z.infer<typeof ConditionalRuleSchema>;

export const ContextRuleSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('allowance-fraction'),
    tier: FindingTierSchema,
    fraction: z.number().positive(),
    op: z.enum(['gt', 'gte']),
  }),
  z.strictObject({
    kind: z.literal('external-alert'),
    tier: FindingTierSchema,
    alert: z.literal('solar-particle-event'),
  }),
]);
export type ContextRule = z.infer<typeof ContextRuleSchema>;

export const DeviationSettingsSchema = z.strictObject({
  // Absent values fall back to `EngineConfig.deviationDefaults`.
  yellowSd: z.number().positive().optional(),
  orangeSd: z.number().positive().optional(),
  // null means the floor has not been supplied yet (TD-11).
  minAbsoluteChange: z.number().min(0).nullable(),
  direction: z.enum(['both', 'high', 'low']).default('both'),
});
export type DeviationSettings = z.infer<typeof DeviationSettingsSchema>;

/** Deviation settings after config defaults are applied. Every field is present. */
export type ResolvedDeviation = Required<DeviationSettings>;

export const IndicatorDefinitionSchema = z.strictObject({
  id: z.string().min(1),
  label: z.string().min(1),
  unit: z.string().min(1),
  periodDays: z.int().min(1),
  // Informational only. The classifier never reads it (Requirement 3.9).
  earthReference: z
    .strictObject({
      low: z.number().optional(),
      high: z.number().optional(),
      note: z.string().optional(),
    })
    .optional(),
  // Only for indicators with a stated scale.
  validRange: z.strictObject({ min: z.number(), max: z.number() }).optional(),
  careerLimitMsv: z.number().positive().optional(),
  hardLimits: z.strictObject({
    orange: z.array(ComparisonSchema),
    red: z.array(ComparisonSchema),
  }),
  sequenceRules: z.array(SequenceRuleSchema),
  conditionalRules: z.array(ConditionalRuleSchema),
  contextRules: z.array(ContextRuleSchema),
  deviation: DeviationSettingsSchema.optional(),
  verification: z.strictObject({
    // Every listed flag is kept.
    thresholds: z.array(VerificationFlagSchema).min(1),
    deviation: z.array(VerificationFlagSchema).optional(),
    mapping: z.array(VerificationFlagSchema).min(1),
  }),
  // An empty array means unverified, and is valid (Requirement 29.13).
  sources: z.array(SourceReferenceSchema),
  hazards: z.array(HazardSchema).min(1),
  system: BodySystemSchema,
});
export type IndicatorDefinition = z.infer<typeof IndicatorDefinitionSchema>;

/** A definition without the fields that `mapping.ts` supplies: hazards, system and verification.mapping. */
export type IndicatorDraft = Omit<
  IndicatorDefinition,
  'hazards' | 'system' | 'verification'
> & {
  verification: Omit<IndicatorDefinition['verification'], 'mapping'>;
};
