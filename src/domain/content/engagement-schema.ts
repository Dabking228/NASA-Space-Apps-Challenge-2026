import { z } from 'zod';

/** An engagement setting. PROJECT.md gives no value, so each one is a proposed default. */
function proposedDefault<T extends z.ZodType>(value: T) {
  return z.strictObject({ value, source: z.literal('proposed-default') });
}

/** Gamification settings (FD-12). */
export const EngagementSettingsSchema = z.strictObject({
  // Share of the crew that must meet the daily goal, from 0 (exclusive) to 1.
  crewGoalTargetShare: proposedDefault(z.number().positive().max(1)),
  // Number of mission days in the weekly strip.
  weeklyStripLength: proposedDefault(z.int().min(1)),
  streakRuleText: proposedDefault(z.string().min(1)),
  // Chance, from 0 to 1, that a simulated teammate completes a task.
  teammateCompletionProbability: proposedDefault(z.number().min(0).max(1)),
});
export type EngagementSettings = Readonly<
  z.infer<typeof EngagementSettingsSchema>
>;
