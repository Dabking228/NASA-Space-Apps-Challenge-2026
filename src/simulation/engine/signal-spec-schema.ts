import { z } from 'zod';

export const SignalBoundsSchema = z.strictObject({
  min: z.number().optional(),
  max: z.number().optional(),
});
export type SignalBounds = Readonly<z.infer<typeof SignalBoundsSchema>>;

// Generator parameters of one indicator. Synthetic placeholder values, not thresholds or references.
export const SignalSpecSchema = z.strictObject({
  baseline: z.number(),
  noiseSd: z.number().min(0),
  decimals: z.int().min(0).max(6),
  periodDays: z.int().min(1),
  bounds: SignalBoundsSchema.optional(),
});
export type SignalSpec = Readonly<z.infer<typeof SignalSpecSchema>>;
