import { z } from 'zod';
import { SourceReferenceSchema } from '../schemas/source';
import { HazardSchema, VerificationFlagSchema } from '../schemas/vocabulary';

export const HazardContentSchema = z.strictObject({
  label: z.string().min(1),
  description: z.string().min(1),
  verification: VerificationFlagSchema,
  // An empty array means unverified, and is valid.
  sources: z.array(SourceReferenceSchema),
});
export type HazardContent = Readonly<z.infer<typeof HazardContentSchema>>;

// Zod 4 requires every hazard as a key when the key schema is an enum.
export const HazardsSchema = z.record(HazardSchema, HazardContentSchema);
export type Hazards = Readonly<z.infer<typeof HazardsSchema>>;
