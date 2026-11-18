import { z } from 'zod';
import { MissionDaySchema } from '../schemas/vocabulary';

/**
 * One countermeasure task marked done. The key is scenario, astronaut, day and
 * task, so marking the same task twice stores one completion. Streaks and the
 * crew goal are derived from these records and never stored.
 */
export const CompletionSchema = z.strictObject({
  scenarioId: z.string().min(1),
  astronautId: z.string().min(1),
  day: MissionDaySchema,
  taskId: z.string().min(1),
});
export type Completion = Readonly<z.infer<typeof CompletionSchema>>;
