import { z } from 'zod';
import { TierSchema } from '../tier-schema';
import {
  BodySystemSchema,
  ConfidenceSchema,
  MissionDaySchema,
} from './vocabulary';

export const FindingSchema = z.strictObject({
  id: z.string().min(1),
  kind: z.enum(['indicator', 'cluster']),
  clusterId: z.string().min(1).optional(),
  day: MissionDaySchema,
  tier: TierSchema,
  reason: z.string().min(1),
  confidence: ConfidenceSchema,
  action: z.string().min(1),
  // May be empty: no source has been supplied yet (TD-6).
  sourceIds: z.array(z.string().min(1)),
  indicators: z.array(z.string().min(1)),
  system: BodySystemSchema,
});
export type Finding = z.infer<typeof FindingSchema>;
