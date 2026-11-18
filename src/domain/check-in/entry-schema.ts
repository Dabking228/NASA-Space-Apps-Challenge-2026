import { z } from 'zod';
import {
  MissionDaySchema,
  QualityFlagSchema,
  SymptomKindSchema,
} from '../schemas/vocabulary';

/**
 * A measurement the user saved in the check-in. The key is scenario, astronaut,
 * day and indicator, so a second save for the same key replaces the first.
 */
export const ReadingEntrySchema = z.strictObject({
  scenarioId: z.string().min(1),
  astronautId: z.string().min(1),
  day: MissionDaySchema,
  indicatorId: z.string().min(1),
  value: z.number(),
  quality: QualityFlagSchema,
});
export type ReadingEntry = Readonly<z.infer<typeof ReadingEntrySchema>>;

/** A symptom the user reported in the check-in. The key is scenario, astronaut, day and kind. */
export const SymptomEntrySchema = z.strictObject({
  scenarioId: z.string().min(1),
  astronautId: z.string().min(1),
  day: MissionDaySchema,
  kind: SymptomKindSchema,
});
export type SymptomEntry = Readonly<z.infer<typeof SymptomEntrySchema>>;
