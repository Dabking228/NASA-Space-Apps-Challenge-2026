import { z } from 'zod';

export const VerificationFlagSchema = z.enum(['A', 'B', 'C']);
export type VerificationFlag = z.infer<typeof VerificationFlagSchema>;

export const ConfidenceSchema = z.enum(['low', 'medium', 'high']);
export type Confidence = z.infer<typeof ConfidenceSchema>;

export const HazardSchema = z.enum([
  'radiation',
  'isolation-confinement',
  'distance-from-earth',
  'gravity-fields',
  'hostile-closed-environment',
]);
export type Hazard = z.infer<typeof HazardSchema>;

export const BodySystemSchema = z.enum([
  'cardiovascular',
  'musculoskeletal',
  'vision',
  'immune',
  'mental',
  'sleep',
]);
export type BodySystem = z.infer<typeof BodySystemSchema>;

export const QualityFlagSchema = z.enum(['good', 'poor']);
export type QualityFlag = z.infer<typeof QualityFlagSchema>;

export const SymptomKindSchema = z.enum([
  'chest-pain',
  'fainting',
  'headache',
  'cough',
  'sore-throat',
  'vision-blurring',
  'acuity-change',
  'sudden-vision-loss',
  'other',
]);
export type SymptomKind = z.infer<typeof SymptomKindSchema>;

export const MissionDaySchema = z.int().nonnegative();
export type MissionDay = z.infer<typeof MissionDaySchema>;

/** Where a rule value comes from: PROJECT.md as written, or a design proposal to review. */
export const RuleSourceSchema = z.enum(['project-doc', 'proposed-default']);
export type RuleSource = z.infer<typeof RuleSourceSchema>;

/** Display order of the body systems. Covers every BodySystem exactly once. */
export const BODY_SYSTEM_ORDER = [
  'cardiovascular',
  'musculoskeletal',
  'vision',
  'immune',
  'mental',
  'sleep',
] as const satisfies readonly BodySystem[];

export const BODY_SYSTEM_LABELS = {
  cardiovascular: 'Cardiovascular',
  musculoskeletal: 'Bones and muscles',
  vision: 'Vision',
  immune: 'Immune',
  mental: 'Mental',
  sleep: 'Sleep',
} satisfies Record<BodySystem, string>;
