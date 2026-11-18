import type { EvaluationInput } from '@/domain/evaluate-input';
import type { Result } from '@/domain/result';
import type { SimulationContext } from '../library';
import { makeProblem, type SimulationProblem } from './problem';
import type { SimulationRun } from './run-schema';

function invalidArgument(
  run: SimulationRun,
  field: string,
  message: string,
): Result<EvaluationInput, SimulationProblem> {
  return {
    ok: false,
    error: makeProblem(
      'invalid-argument',
      'run',
      run.scenarioId,
      field,
      message,
    ),
  };
}

/**
 * Turns a run into the input of `evaluateAstronaut` for one astronaut and one as-of day.
 * Copies the named astronaut's records and the run's shared fields unchanged, with no
 * filtering by day: the engine drops records dated after `asOfDay` itself. `startDay` is
 * omitted, so the engine starts at the earliest reading day. Mutates nothing and never throws.
 *
 * Returns a problem with field `astronautId` for an astronaut that is not in the run, and
 * with field `asOfDay` for a value that is not a whole number of 0 or more or that is after
 * the last day of the run (`run.throughDay`).
 */
export function buildEvaluationInput(
  run: SimulationRun,
  astronautId: string,
  asOfDay: number,
  context: SimulationContext,
): Result<EvaluationInput, SimulationProblem> {
  const astronaut = run.astronauts.find(
    (candidate) => candidate.astronautId === astronautId,
  );
  if (astronaut === undefined) {
    return invalidArgument(
      run,
      'astronautId',
      `Astronaut "${astronautId}" is not in the run of scenario "${run.scenarioId}".`,
    );
  }
  if (!Number.isSafeInteger(asOfDay) || asOfDay < 0) {
    return invalidArgument(
      run,
      'asOfDay',
      `The day ${String(asOfDay)} is not a whole number of 0 or more.`,
    );
  }
  if (asOfDay > run.throughDay) {
    return invalidArgument(
      run,
      'asOfDay',
      `Day ${asOfDay} is after the last day of the run, day ${run.throughDay}.`,
    );
  }

  // The context is spread first so that it can never replace a field set below.
  return {
    ok: true,
    value: {
      ...context,
      astronautId: astronaut.astronautId,
      asOfDay,
      seeds: astronaut.preFlightSeeds,
      readings: astronaut.readings,
      symptoms: astronaut.symptoms,
      safetyFlags: astronaut.safetyFlags,
      alerts: run.alerts,
      careerDoseBeforeMissionMsv: astronaut.careerDoseBeforeMissionMsv,
      environment: run.environment,
    },
  };
}
