import { z } from 'zod';
import { EnvironmentProfileSchema } from '@/domain/environments/environment-profile';
import {
  AlertReportSchema,
  ReadingSchema,
  SafetyFlagSchema,
  SymptomReportSchema,
} from '@/domain/schemas/reading';
import { MissionDaySchema } from '@/domain/schemas/vocabulary';
import {
  GroundLinkConfigSchema,
  OneWayDelayRangeSchema,
} from '@/simulation/environments/environment-schema';

// The ground link config is defined with the environment shape. It is re-exported here
// because the run holds a copy of it.
export { GroundLinkConfigSchema };
export type { GroundLinkConfig } from '@/simulation/environments/environment-schema';

// Same shape as `EvaluationInput.seeds`: pre-flight values by indicator id.
export const PreFlightSeedsSchema = z.record(z.string(), z.array(z.number()));
export type PreFlightSeeds = Readonly<z.infer<typeof PreFlightSeedsSchema>>;

/** Ground link state on one mission day. */
export const GroundLinkStatusSchema = z.strictObject({
  available: z.boolean(),
  // The environment's one-way delay range in seconds, or null where PROJECT.md gives no figure.
  oneWayDelaySeconds: OneWayDelayRangeSchema.nullable(),
});
export type GroundLinkStatus = Readonly<z.infer<typeof GroundLinkStatusSchema>>;

export const AstronautRunSchema = z.strictObject({
  astronautId: z.string().min(1),
  preFlightSeeds: PreFlightSeedsSchema,
  careerDoseBeforeMissionMsv: z.number().min(0),
  readings: z.array(ReadingSchema),
  symptoms: z.array(SymptomReportSchema),
  safetyFlags: z.array(SafetyFlagSchema),
});
export type AstronautRun = Readonly<z.infer<typeof AstronautRunSchema>>;

export const SimulationRunSchema = z.strictObject({
  scenarioId: z.string().min(1),
  // The last day actually produced.
  throughDay: MissionDaySchema,
  durationDays: z.int().min(1),
  astronauts: z.array(AstronautRunSchema),
  alerts: z.array(AlertReportSchema),
  environment: EnvironmentProfileSchema,
  groundLink: GroundLinkConfigSchema,
});
export type SimulationRun = Readonly<z.infer<typeof SimulationRunSchema>>;
