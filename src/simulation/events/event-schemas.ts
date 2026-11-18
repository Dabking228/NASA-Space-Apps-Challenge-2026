import { z } from 'zod';
import {
  MissionDaySchema,
  SymptomKindSchema,
} from '@/domain/schemas/vocabulary';

// Event indicators use catalog ids such as `sleep-hours`.
const IndicatorIdSchema = z.string().min(1);
// Omitted on the optional-list kinds means the whole crew.
const AstronautListSchema = z.array(z.string().min(1)).min(1);
const LengthDaysSchema = z.int().min(1);
const base = { day: MissionDaySchema };

export const ScenarioEventSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('drift'),
    ...base,
    indicator: IndicatorIdSchema,
    perDay: z.number(),
    lengthDays: LengthDaysSchema.optional(),
    astronauts: AstronautListSchema.optional(),
  }),
  z.strictObject({
    type: z.literal('moodDip'),
    ...base,
    depth: z.number().gt(0),
    lengthDays: LengthDaysSchema,
    astronauts: AstronautListSchema.optional(),
  }),
  z.strictObject({
    type: z.literal('solarParticleEvent'),
    ...base,
    severity: z.enum(['moderate']),
    lengthDays: LengthDaysSchema.optional(),
  }),
  z.strictObject({
    type: z.literal('co2Spike'),
    ...base,
    deltaMmHg: z.number().gt(0),
    lengthDays: LengthDaysSchema,
  }),
  z.strictObject({
    type: z.literal('eva'),
    ...base,
    heartRateDeltaBpm: z.number().gt(0),
    lengthDays: LengthDaysSchema,
    astronauts: AstronautListSchema,
  }),
  z.strictObject({
    type: z.literal('equipmentOutage'),
    ...base,
    equipment: z.enum(['treadmill']),
    reductionFraction: z.number().gt(0).max(1),
    lengthDays: LengthDaysSchema,
    astronauts: AstronautListSchema.optional(),
  }),
  z.strictObject({
    type: z.literal('symptom'),
    ...base,
    kind: SymptomKindSchema,
    lengthDays: LengthDaysSchema.optional(),
    astronauts: AstronautListSchema.optional(),
  }),
  z.strictObject({
    type: z.literal('commsBlackout'),
    ...base,
    lengthDays: LengthDaysSchema,
  }),
]);
export type ScenarioEvent = Readonly<z.infer<typeof ScenarioEventSchema>>;

/** The closed union of Event_Kinds. Adding a kind to the schema fails every exhaustive switch until handled. */
export type EventKind = ScenarioEvent['type'];

export const EVENT_KINDS = [
  'drift',
  'moodDip',
  'solarParticleEvent',
  'co2Spike',
  'eva',
  'equipmentOutage',
  'symptom',
  'commsBlackout',
] as const satisfies readonly EventKind[];
