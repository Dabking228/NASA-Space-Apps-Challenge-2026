import { z } from 'zod';
import { SignalSpecSchema } from '@/simulation/engine/signal-spec-schema';

// The twelve indicators an astronaut profile generates (Requirement 7.4).
// `fasting-glucose` is left out on purpose (Requirement 7.5).
export const AstronautIndicatorIdSchema = z.enum([
  'resting-hr',
  'bp-systolic',
  'bp-diastolic',
  'body-temperature',
  'spo2',
  'sleep-hours',
  'mood',
  'who5',
  'reaction-time',
  'body-mass-change-30d',
  'energy-intake',
  'exercise-adherence',
]);
export type AstronautIndicatorId = z.infer<typeof AstronautIndicatorIdSchema>;

export const CrewProfileSchema = z.strictObject({
  id: z.string().min(1),
  label: z.string().min(1),
  synthetic: z.literal(true),
  // Requirement 7.9: every baseline is a placeholder, not a reference range or a threshold.
  baselineStatus: z.literal('placeholder'),
  careerDoseBeforeMissionMsv: z.number().min(0),
  preflightSamples: z.int().min(2),
  // Zod 4: a record over an enum requires every key, so all twelve specs are present.
  signals: z.record(AstronautIndicatorIdSchema, SignalSpecSchema),
});
export type CrewProfile = Readonly<z.infer<typeof CrewProfileSchema>>;
