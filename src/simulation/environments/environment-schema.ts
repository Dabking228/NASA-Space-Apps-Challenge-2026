import { z } from 'zod';
import { SourceReferenceSchema } from '@/domain/schemas/source';
import { HazardSchema } from '@/domain/schemas/vocabulary';
import { SignalSpecSchema } from '../engine/signal-spec-schema';

export const EvacuationClassSchema = z.enum([
  'hours-to-days',
  'days',
  'not-possible',
]);
export type EvacuationClass = z.infer<typeof EvacuationClassSchema>;

export const BlackoutRuleSchema = z.enum(['signal-gaps', 'conjunction']);
export type BlackoutRule = z.infer<typeof BlackoutRuleSchema>;

// Order checks (minimum above maximum) are in `validateEnvironmentConfig`.
export const OneWayDelayRangeSchema = z.strictObject({
  min: z.number().min(0),
  max: z.number().min(0),
});
export type OneWayDelayRange = Readonly<z.infer<typeof OneWayDelayRangeSchema>>;

export const GroundLinkConfigSchema = z.strictObject({
  // null means no meaningful delay (for example the ISS).
  oneWayDelaySeconds: OneWayDelayRangeSchema.nullable(),
  blackoutRules: z.array(BlackoutRuleSchema),
});
export type GroundLinkConfig = Readonly<z.infer<typeof GroundLinkConfigSchema>>;

export const HabitatSignalsSchema = z.strictObject({
  'cabin-co2': SignalSpecSchema,
  'dose-rate': SignalSpecSchema,
});
export type HabitatSignals = Readonly<z.infer<typeof HabitatSignalsSchema>>;

// Draft values: verification C, no sources. Order checks are in `validateEnvironmentConfig`.
export const EnvironmentConfigSchema = z.strictObject({
  id: z.string().min(1),
  label: z.string().min(1),
  gravityG: z.number().min(0),
  doseRateMsvPerDay: z.strictObject({
    low: z.number().min(0),
    high: z.number().min(0),
  }),
  evacuation: EvacuationClassSchema,
  groundLink: GroundLinkConfigSchema,
  emphasisedHazards: z.array(HazardSchema),
  // Zod 4 requires every hazard key when the key schema is an enum.
  hazardWeights: z.record(HazardSchema, z.number().min(0)),
  hazardWeightSource: z.literal('proposed-default'),
  habitat: HabitatSignalsSchema,
  verification: z.literal('C'),
  status: z.literal('unverified-draft'),
  // Empty until the team supplies citations. An empty array means unverified.
  sources: z.array(SourceReferenceSchema).length(0),
});
export type EnvironmentConfig = Readonly<
  z.infer<typeof EnvironmentConfigSchema>
>;
