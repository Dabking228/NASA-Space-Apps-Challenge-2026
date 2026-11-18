import { z } from 'zod';
import { MissionDaySchema, RuleSourceSchema } from '../schemas/vocabulary';

/** One tunable value and where it comes from: PROJECT.md as written, or a proposed default to review. */
function sourced<T extends z.ZodType>(value: T) {
  return z.strictObject({ value, source: RuleSourceSchema });
}

/** Start state and timing of the app (FD-11, FD-13). */
export const AppDefaultsSchema = z.strictObject({
  startScenarioId: sourced(z.string().min(1)),
  startAstronautId: sourced(z.string().min(1)),
  startDay: sourced(MissionDaySchema),
  // Link-seconds that pass per real second on the ground link clock.
  linkTimeScale: sourced(z.number().positive()),
  // How many findings the dashboard list shows.
  activeFindingsShown: sourced(z.int().min(1)),
});
export type AppDefaults = Readonly<z.infer<typeof AppDefaultsSchema>>;
