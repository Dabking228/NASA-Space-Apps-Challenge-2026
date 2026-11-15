import { z } from 'zod';
import { HazardSchema } from '../schemas/vocabulary';

/**
 * Minimal environment shape. The domain holds no ISS, lunar or Mars values:
 * those belong to the simulation layer.
 */
export const EnvironmentProfileSchema = z.strictObject({
  id: z.string().min(1),
  label: z.string().min(1),
  backgroundDoseRateMsvPerDay: z.number().min(0),
  // Zod 4 requires every hazard key when the key schema is an enum.
  hazardWeights: z.record(HazardSchema, z.number().min(0)),
});
export type EnvironmentProfile = z.infer<typeof EnvironmentProfileSchema>;
