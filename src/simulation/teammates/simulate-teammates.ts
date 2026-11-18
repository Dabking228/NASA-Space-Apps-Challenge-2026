import type { Result } from '@/domain/result';
import {
  makeProblem,
  type SimulationProblem,
} from '@/simulation/engine/problem';
import { createSeededRandom } from '@/simulation/engine/seeded-random';
import type { NoiseSettings } from '@/simulation/engine/settings-schema';

/** One task marked done for one crew member on one Mission_Day. */
export interface TeammateCompletion {
  readonly astronautId: string;
  readonly taskId: string;
  readonly day: number;
}

export interface SimulateTeammatesInput {
  /** Seed of the scenario. Must be a safe integer. */
  readonly scenarioSeed: number;
  /** Mission_Day the completions are for. A whole number of 0 or more. */
  readonly day: number;
  readonly crewIds: readonly string[];
  /** Never appears in the output. */
  readonly selectedAstronautId: string;
  readonly dailyTaskIds: readonly string[];
  /** Chance that one teammate completes one task, from 0 to 1. */
  readonly completionProbability: number;
  readonly noise: Pick<NoiseSettings, 'clip' | 'maxDraws'>;
}

function invalidArgument(field: string, message: string): SimulationProblem {
  return makeProblem('invalid-argument', 'run', 'teammates', field, message);
}

function argumentProblems(
  input: SimulateTeammatesInput,
): readonly SimulationProblem[] {
  const problems: SimulationProblem[] = [];
  if (!Number.isSafeInteger(input.day) || input.day < 0) {
    problems.push(
      invalidArgument(
        'day',
        `The day ${String(input.day)} is not a whole number of 0 or more.`,
      ),
    );
  }
  const probability = input.completionProbability;
  if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
    problems.push(
      invalidArgument(
        'completionProbability',
        `The completion probability ${String(probability)} is not a number from 0 to 1.`,
      ),
    );
  }
  return problems;
}

function unique(ids: readonly string[]): readonly string[] {
  return ids.filter((id, index) => ids.indexOf(id) === index);
}

/**
 * Seeded teammate completions for the demo (Requirement 8).
 * Each crew member other than the selected one is tried against each task. A pair is completed
 * when `uniform([crewId, taskId, day], 0) < completionProbability`, so a probability of 0 gives
 * none and 1 gives all. The output follows the order of `crewIds`, then `dailyTaskIds`. Repeated
 * ids count once. Equal inputs give equal outputs and no input is modified.
 */
export function simulateTeammates(
  input: SimulateTeammatesInput,
): Result<readonly TeammateCompletion[], readonly SimulationProblem[]> {
  const random = createSeededRandom(input.scenarioSeed, input.noise);
  const problems = [
    ...(random.ok ? [] : random.error),
    ...argumentProblems(input),
  ];
  if (!random.ok || problems.length > 0) {
    return { ok: false, error: problems };
  }

  const taskIds = unique(input.dailyTaskIds);
  const completions = unique(input.crewIds)
    .filter((crewId) => crewId !== input.selectedAstronautId)
    .flatMap((crewId) =>
      taskIds
        .filter(
          (taskId) =>
            random.value.uniform([crewId, taskId, input.day], 0) <
            input.completionProbability,
        )
        .map((taskId): TeammateCompletion => ({
          astronautId: crewId,
          taskId,
          day: input.day,
        })),
    );
  return { ok: true, value: completions };
}
