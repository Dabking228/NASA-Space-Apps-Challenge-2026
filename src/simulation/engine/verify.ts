import { z } from 'zod';
import type { SimulationContext, SimulationLibrary } from '../library';
import { checkQuietRun } from './check-quiet-run';
import { checkStorylines } from './check-storylines';
import { SimulationProblemSchema } from './problem';
import { validateLibrary } from './validate-library';

// Every field is a string, boolean or array, so a report survives a JSON round trip unchanged.
export const ScenarioVerificationSchema = z.strictObject({
  scenarioId: z.string(),
  quietRunProblems: z.array(SimulationProblemSchema),
  storylineProblems: z.array(SimulationProblemSchema),
});
export type ScenarioVerification = Readonly<
  z.infer<typeof ScenarioVerificationSchema>
>;

export const VerificationReportSchema = z.strictObject({
  libraryProblems: z.array(SimulationProblemSchema),
  // In library order.
  scenarios: z.array(ScenarioVerificationSchema),
  // Flat list: library problems, then for each scenario its quiet-run then storyline problems.
  problems: z.array(SimulationProblemSchema),
  // True exactly when `problems` is empty.
  ok: z.boolean(),
});
export type VerificationReport = Readonly<
  z.infer<typeof VerificationReportSchema>
>;

/**
 * Runs the whole check recipe on a library and returns one report.
 *
 * Runs `validateLibrary` (which also covers the registered demo packs), then `checkQuietRun`
 * and `checkStorylines` for every scenario in library order. Holds no tier, threshold or
 * cluster logic: all of that stays in the engine and the checkers. Reads no file, keeps no
 * state, changes none of its arguments and never throws.
 */
export function verifySimulation(
  library: SimulationLibrary,
  context: SimulationContext,
): VerificationReport {
  const libraryProblems = [
    ...validateLibrary(
      library,
      context.catalog,
      context.config,
      context.clusters,
    ),
  ];
  const scenarios = library.scenarios.map((scenario): ScenarioVerification => ({
    scenarioId: scenario.id,
    quietRunProblems: [...checkQuietRun(scenario, library, context)],
    storylineProblems: [...checkStorylines(scenario, library, context)],
  }));
  const problems = [
    ...libraryProblems,
    ...scenarios.flatMap((entry) => [
      ...entry.quietRunProblems,
      ...entry.storylineProblems,
    ]),
  ];
  return {
    libraryProblems,
    scenarios,
    problems,
    ok: problems.length === 0,
  };
}
