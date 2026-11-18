import { z } from 'zod';
import { VerificationFlagSchema } from '../schemas/vocabulary';

/** A page of the NASA Human Research Program. A reading list entry, not a citation. */
export const ReadingListEntrySchema = z.strictObject({
  title: z.string().min(1),
  url: z.url(),
});
export type ReadingListEntry = Readonly<z.infer<typeof ReadingListEntrySchema>>;

/** One step of the core loop, or the idea of a personal baseline. */
export const HowItWorksStepSchema = z.strictObject({
  title: z.string().min(1),
  text: z.string().min(1),
});
export type HowItWorksStep = Readonly<z.infer<typeof HowItWorksStepSchema>>;

/** Titles of the four sections of the About page (Requirement 39.1). */
export const AboutSectionTitlesSchema = z.strictObject({
  notice: z.string().min(1),
  draftData: z.string().min(1),
  sources: z.string().min(1),
  howItWorks: z.string().min(1),
});
export type AboutSectionTitles = Readonly<
  z.infer<typeof AboutSectionTitlesSchema>
>;

/** About page text. The decision-support notice is not held here. */
export const AboutContentSchema = z.strictObject({
  sectionTitles: AboutSectionTitlesSchema,
  // Plain statements: decision support, synthetic data, draft thresholds.
  statements: z.array(z.string().min(1)).min(1),
  // Zod 4 requires every flag as a key when the key schema is an enum.
  flagExplanations: z.record(VerificationFlagSchema, z.string().min(1)),
  // Shown while no indicator has a source (Requirement 39.8).
  noThresholdSourceText: z.string().min(1),
  // Shown while no source reference exists (Requirement 39.9).
  noSourcesText: z.string().min(1),
  readingListLabel: z.string().min(1),
  readingList: z.array(ReadingListEntrySchema),
  // The core loop, in order.
  howItWorksSteps: z.array(HowItWorksStepSchema).min(1),
  personalBaseline: HowItWorksStepSchema,
});
export type AboutContent = Readonly<z.infer<typeof AboutContentSchema>>;
