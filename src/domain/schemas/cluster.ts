import { z } from 'zod';
import { FindingTierSchema } from './indicator';
import { SourceReferenceSchema } from './source';
import {
  BodySystemSchema,
  RuleSourceSchema,
  SymptomKindSchema,
  VerificationFlagSchema,
} from './vocabulary';

export const ClusterMemberSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('indicator'),
    id: z.string().min(1),
    indicatorId: z.string().min(1),
    minTier: FindingTierSchema,
    direction: z.enum(['any', 'above-baseline', 'below-baseline']),
  }),
  // Satisfied when value op mean·(1+fraction). No tier gate (TD-27).
  z.strictObject({
    kind: z.literal('baseline-relative'),
    id: z.string().min(1),
    indicatorId: z.string().min(1),
    op: z.enum(['gt', 'gte']),
    fraction: z.number().min(0),
  }),
  z.strictObject({
    kind: z.literal('symptom'),
    id: z.string().min(1),
    symptoms: z.array(SymptomKindSchema).min(1),
  }),
]);
export type ClusterMember = z.infer<typeof ClusterMemberSchema>;

export const ClusterDefinitionSchema = z.strictObject({
  id: z.string().min(1),
  label: z.string().min(1),
  windowDays: z.int().min(1),
  windowSource: RuleSourceSchema,
  tier: FindingTierSchema,
  system: BodySystemSchema,
  // All required.
  members: z.array(ClusterMemberSchema).min(1),
  // Optional. They raise confidence only.
  supporting: z.array(ClusterMemberSchema),
  tierRaises: z.array(
    z.strictObject({
      memberId: z.string(),
      whenSymptomIn: z.array(SymptomKindSchema).min(1),
      tier: FindingTierSchema,
    }),
  ),
  verification: z.array(VerificationFlagSchema).min(1),
  // An empty array means unverified, and is valid (Requirement 29.13).
  sources: z.array(SourceReferenceSchema),
});
export type ClusterDefinition = z.infer<typeof ClusterDefinitionSchema>;
