import { TIER_ORDER, compareTiers } from '@/domain/tiers';
import type { SimulationContext, SimulationLibrary } from '../library';
import type { Scenario } from '../scenarios/scenario-schema';
import { createEvaluator } from './check-storylines';
import { makeProblem, type SimulationProblem } from './problem';
import { runScenario } from './run-scenario';

const GREEN = TIER_ORDER[0];

/**
 * Checks that noise alone gives no tier above green (Requirements 8.8 and 15.5).
 *
 * Copies the scenario with no events and no expectations, runs it through its last day, and
 * evaluates each astronaut with `evaluateAstronaut` as of every day from 0 to the last day.
 *
 * Returns one `quiet-run-tier` problem per (astronaut, indicator) pair that is not green on
 * some day. The problem names the first such day and its tier, to keep the list short.
 * Returns one `engine-error` problem per distinct engine error and astronaut, quoting it,
 * and the problem of any input that could not be built. When the run itself fails, returns
 * the problems of `runScenario` unchanged. Holds no tier, threshold or cluster logic: that
 * stays in the engine. Never throws and changes none of its arguments.
 */
export function checkQuietRun(
  scenario: Scenario,
  library: SimulationLibrary,
  context: SimulationContext,
): readonly SimulationProblem[] {
  const quiet: Scenario = { ...scenario, events: [], expectations: [] };

  const run = runScenario(quiet, library, context, quiet.durationDays - 1);
  if (!run.ok) return run.error;

  const evaluator = createEvaluator(quiet, run.value, context);
  const days = Array.from(
    { length: run.value.throughDay + 1 },
    (_, day) => day,
  );

  const tierProblems = run.value.astronauts.flatMap(
    ({ astronautId }): readonly SimulationProblem[] => {
      const reported = new Set<string>();
      const found: SimulationProblem[] = [];
      for (const day of days) {
        const result = evaluator.evaluate(astronautId, day);
        if (result === null) continue;
        for (const classification of result.classifications) {
          if (
            classification.status !== 'classified' ||
            compareTiers(classification.tier, GREEN) <= 0
          ) {
            continue;
          }
          const indicatorId = classification.reading.indicatorId;
          if (reported.has(indicatorId)) continue;
          reported.add(indicatorId);
          found.push(
            makeProblem(
              'quiet-run-tier',
              'scenario',
              quiet.id,
              '',
              `Scenario "${quiet.id}" with no events: indicator "${indicatorId}" of astronaut "${astronautId}" is ${classification.tier} on day ${day}, so noise alone gives a tier above green.`,
            ),
          );
        }
      }
      return found;
    },
  );

  return [...tierProblems, ...evaluator.problems()];
}
