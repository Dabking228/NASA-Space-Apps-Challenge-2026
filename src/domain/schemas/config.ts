import { z } from 'zod';
import { FindingTierSchema } from './indicator';
import { ConfidenceSchema } from './vocabulary';

export const DeviationDefaultsSchema = z.strictObject({
  yellowSd: z.number().positive(),
  orangeSd: z.number().positive(),
});
export type DeviationDefaults = z.infer<typeof DeviationDefaultsSchema>;

export const BaselineConfigSchema = z.strictObject({
  windowDays: z.int().min(1),
  minSeedReadings: z.int().min(2),
  minWindowReadings: z.int().min(2),
});
export type BaselineConfig = z.infer<typeof BaselineConfigSchema>;

export const FreezeConfigSchema = z.strictObject({
  atOrAbove: FindingTierSchema,
});
export type FreezeConfig = z.infer<typeof FreezeConfigSchema>;

export const PersistenceConfigSchema = z.strictObject({
  minTier: FindingTierSchema,
  consecutivePeriods: z.int().min(2),
  raisesTo: FindingTierSchema,
});
export type PersistenceConfig = z.infer<typeof PersistenceConfigSchema>;

export const ConfidenceConfigSchema = z.strictObject({
  start: ConfidenceSchema,
  steps: z.strictObject({
    missingData: z.int().min(0),
    poorQuality: z.int().min(0),
    singleSignal: z.int().min(0),
  }),
  supportBonusSteps: z.int().min(0),
});
export type ConfidenceConfig = z.infer<typeof ConfidenceConfigSchema>;

export const EngineConfigSchema = z.strictObject({
  deviationDefaults: DeviationDefaultsSchema,
  baseline: BaselineConfigSchema,
  freeze: FreezeConfigSchema,
  persistence: PersistenceConfigSchema,
  confidence: ConfidenceConfigSchema,
});
export type EngineConfig = z.infer<typeof EngineConfigSchema>;
