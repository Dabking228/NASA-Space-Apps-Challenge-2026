import { z } from 'zod';
import { SourceReferenceSchema } from '../schemas/source';
import {
  BodySystemSchema,
  VerificationFlagSchema,
} from '../schemas/vocabulary';

export const BodyRegionSchema = z.strictObject({
  label: z.string().min(1),
  functionText: z.string().min(1),
  // Null when the system has no usable indicator (vision, FD-15).
  leadIndicatorId: z.string().min(1).nullable(),
  mapRegionId: z.string().min(1),
  verification: VerificationFlagSchema,
  // An empty array means unverified, and is valid.
  sources: z.array(SourceReferenceSchema),
});
export type BodyRegion = Readonly<z.infer<typeof BodyRegionSchema>>;

// Zod 4 requires every body system as a key when the key schema is an enum.
export const BodyRegionsSchema = z.record(BodySystemSchema, BodyRegionSchema);
export type BodyRegions = Readonly<z.infer<typeof BodyRegionsSchema>>;
