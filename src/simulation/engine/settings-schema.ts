import { z } from 'zod';

export const NoiseSettingsSchema = z.strictObject({
  // Truncation bound of the normal sample, in standard deviations.
  clip: z.number().positive(),
  // SD-10: (1 + spread) / (1 - spread) must stay below 2.83, so spread is at most 0.4.
  spread: z.number().gt(0).max(0.4),
  // Redraw limit of the truncated normal sample before it is clamped.
  maxDraws: z.int().min(1),
});
export type NoiseSettings = Readonly<z.infer<typeof NoiseSettingsSchema>>;

export const SolarParticleEventSettingsSchema = z.strictObject({
  defaultLengthDays: z.int().min(1),
  // Requirement 11.2: the multiple must exceed 20 so the dose rate agrees with the red rule.
  doseRateMultiple: z.strictObject({ moderate: z.number().gt(20) }),
  valueSource: z.literal('proposed-default'),
  verification: z.literal('C'),
});
export type SolarParticleEventSettings = Readonly<
  z.infer<typeof SolarParticleEventSettingsSchema>
>;

export const SymptomEventSettingsSchema = z.strictObject({
  defaultLengthDays: z.int().min(1),
});
export type SymptomEventSettings = Readonly<
  z.infer<typeof SymptomEventSettingsSchema>
>;

export const EventSettingsSchema = z.strictObject({
  solarParticleEvent: SolarParticleEventSettingsSchema,
  symptom: SymptomEventSettingsSchema,
});
export type EventSettings = Readonly<z.infer<typeof EventSettingsSchema>>;

export const SimulationSettingsSchema = z.strictObject({
  noise: NoiseSettingsSchema,
  events: EventSettingsSchema,
});
export type SimulationSettings = Readonly<
  z.infer<typeof SimulationSettingsSchema>
>;
