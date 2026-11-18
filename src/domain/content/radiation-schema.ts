import { z } from 'zod';
import { SourceReferenceSchema } from '../schemas/source';
import { VerificationFlagSchema } from '../schemas/vocabulary';

/** Shelter flow and radiation wording (Requirements 33.3, 33.6, 33.9). */
export const RadiationContentSchema = z.strictObject({
  shelterTitle: z.string().min(1),
  // Steps hold no numbers. The view numbers them.
  shelterSteps: z.array(z.string().min(1)).min(1),
  // Text that points the crew to the escalation page.
  shelterEscalationText: z.string().min(1),
  doseRateExplanation: z.string().min(1),
  // States no career limit as a fact.
  careerDoseExplanation: z.string().min(1),
  // Wording of the marker for values that rest on flag C.
  draftMarkerText: z.string().min(1),
  verification: VerificationFlagSchema,
  // An empty array means unverified, and is valid.
  sources: z.array(SourceReferenceSchema),
});
export type RadiationContent = Readonly<z.infer<typeof RadiationContentSchema>>;
