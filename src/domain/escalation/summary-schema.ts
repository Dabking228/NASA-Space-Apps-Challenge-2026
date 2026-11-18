import { z } from 'zod';
import { TierSchema } from '../tier-schema';
import {
  ConfidenceSchema,
  MissionDaySchema,
  SymptomKindSchema,
} from '../schemas/vocabulary';

/** One finding the crew chose to send. Its text comes from the engine unchanged. */
export const SummaryFindingSchema = z.strictObject({
  id: z.string().min(1),
  tier: TierSchema,
  confidence: ConfidenceSchema,
  reason: z.string().min(1),
  // One string that holds the numbered steps, as `Finding.action` does.
  action: z.string().min(1),
});

/** One indicator behind a chosen finding. Both numbers are absent when the engine has none. */
export const SummaryTrendSchema = z.strictObject({
  id: z.string().min(1),
  label: z.string().min(1),
  unit: z.string(),
  baselineMean: z.number().optional(),
  latestReading: z.number().optional(),
});

/**
 * The structured summary for flight surgeons (Requirement 5). Every value is
 * copied from the evaluation or supplied by the caller; the schema holds no
 * threshold and no advice of its own.
 */
export const EscalationSummarySchema = z.strictObject({
  who: z.strictObject({
    astronautId: z.string().min(1),
    label: z.string().min(1),
  }),
  when: z.strictObject({
    day: MissionDaySchema,
  }),
  environment: z.strictObject({
    label: z.string().min(1),
    durationDays: z.int().positive(),
  }),
  findings: z.array(SummaryFindingSchema),
  trends: z.array(SummaryTrendSchema),
  context: z.strictObject({
    symptomKinds: z.array(SymptomKindSchema),
    recentEvents: z.array(z.string().min(1)),
    groundLinkState: z.string().min(1),
  }),
  actionsTaken: z.strictObject({
    completedCountermeasures: z.array(z.string().min(1)),
    checkInsDone: z.int().nonnegative(),
  }),
});

type DeepReadonly<T> = T extends readonly (infer U)[]
  ? readonly DeepReadonly<U>[]
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

export type SummaryFinding = DeepReadonly<z.infer<typeof SummaryFindingSchema>>;
export type SummaryTrend = DeepReadonly<z.infer<typeof SummaryTrendSchema>>;
export type EscalationSummary = DeepReadonly<
  z.infer<typeof EscalationSummarySchema>
>;
