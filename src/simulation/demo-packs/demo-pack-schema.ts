import { z } from 'zod';
import { MissionDaySchema } from '@/domain/schemas/vocabulary';

// Plan steps 2 to 7 are the in-app steps of the PROJECT.md section 16 demo plan.
// Step order, the 180-second cap, scenario ids and day ranges are checked by
// `validateDemoPack`, not by this schema.
export const DemoSegmentSchema = z.strictObject({
  id: z.string().min(1),
  planStep: z.int().min(2).max(7),
  scenarioId: z.string().min(1),
  firstDay: MissionDaySchema,
  lastDay: MissionDaySchema,
  focusAstronautId: z.string().min(1),
  targetSeconds: z.int().min(1),
  caption: z.string().min(1),
});
export type DemoSegment = Readonly<z.infer<typeof DemoSegmentSchema>>;

export const DemoPackSchema = z.strictObject({
  id: z.string().min(1),
  label: z.string().min(1),
  segments: z.array(DemoSegmentSchema).min(1),
});
export type DemoPack = Readonly<z.infer<typeof DemoPackSchema>>;
