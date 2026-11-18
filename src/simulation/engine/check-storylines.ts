import type { EvaluationResult } from '@/domain/evaluate-input';
import { evaluateAstronaut } from '@/domain/evaluate';
import { compareTiers } from '@/domain/tiers';
import type { SimulationContext, SimulationLibrary } from '../library';
import type {
  ExpectationScope,
  Scenario,
  StorylineExpectation,
} from '../scenarios/scenario-schema';
import { buildEvaluationInput } from './engine-input';
import { makeProblem, type SimulationProblem } from './problem';
import { runScenario } from './run-scenario';
import type { SimulationRun } from './run-schema';

/** Evaluations of one call, by astronaut and day, plus the problems the engine raised. */
export interface Evaluator {
  /** `null` when the input could not be built. The problem is already recorded. */
  readonly evaluate: (
    astronautId: string,
    day: number,
  ) => EvaluationResult | null;
  readonly problems: () => readonly SimulationProblem[];
}

function compareStrings(a: string, b: string): number {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

/**
 * Evaluates each (astronaut, day) once. The maps are local to one call of `checkStorylines`.
 * Each distinct engine error is kept once per astronaut, with the first day it appeared.
 */
export function createEvaluator(
  scenario: Scenario,
  run: SimulationRun,
  context: SimulationContext,
): Evaluator {
  const cache = new Map<string, EvaluationResult | null>();
  const problems = new Map<string, SimulationProblem>();

  const evaluate = (
    astronautId: string,
    day: number,
  ): EvaluationResult | null => {
    const cacheKey = `${astronautId}\u0000${day}`;
    const cached = cache.get(cacheKey);
    if (cached !== undefined) return cached;

    const input = buildEvaluationInput(run, astronautId, day, context);
    if (!input.ok) {
      const { code, field, message } = input.error;
      problems.set(
        `input\u0000${code}\u0000${field}\u0000${message}`,
        input.error,
      );
      cache.set(cacheKey, null);
      return null;
    }

    const result = evaluateAstronaut(input.value);
    for (const error of result.errors) {
      const errorKey = `engine\u0000${astronautId}\u0000${error.code}\u0000${error.message}`;
      if (!problems.has(errorKey)) {
        problems.set(
          errorKey,
          makeProblem(
            'engine-error',
            'scenario',
            scenario.id,
            '',
            `The health engine reported an error for astronaut "${astronautId}" as of day ${day}: ${error.code}: ${error.message}`,
          ),
        );
      }
    }
    cache.set(cacheKey, result);
    return result;
  };

  return { evaluate, problems: () => Array.from(problems.values()) };
}

/** Whether the value lies inside the range, ends included. A missing end is unbounded. */
function insideRange(
  value: number,
  range: { readonly low?: number; readonly high?: number } | undefined,
): boolean {
  if (range === undefined) return true;
  return (
    (range.low === undefined || value >= range.low) &&
    (range.high === undefined || value <= range.high)
  );
}

interface CheckContext {
  readonly run: SimulationRun;
  readonly evaluator: Evaluator;
  readonly context: SimulationContext;
  /** Catalog indicator ids in the order of `EvaluationResult.classifications` (sorted by id). */
  readonly sortedIndicatorIds: readonly string[];
}

/** Whether one astronaut meets the expectation in some evaluation as of day 0 to `byDay`. */
function astronautMeets(
  expectation: StorylineExpectation,
  astronautId: string,
  check: CheckContext,
): boolean {
  // A `byDay` after the run is checked only to the end of the run, so it can still fail.
  const lastDay = Math.min(expectation.byDay, check.run.throughDay);
  const days = Array.from({ length: lastDay + 1 }, (_, day) => day);

  switch (expectation.form) {
    case 'cluster':
      return days.some((day) =>
        (check.evaluator.evaluate(astronautId, day)?.findings ?? []).some(
          (finding) =>
            finding.kind === 'cluster' &&
            finding.clusterId === expectation.clusterId,
        ),
      );
    case 'indicator': {
      // `classifications` is ordered by indicator id and a `no-data` entry has no id,
      // so the indicator is found by its position in the sorted catalog ids.
      const position = check.sortedIndicatorIds.indexOf(
        expectation.indicatorId,
      );
      if (position < 0) return false;
      const earthReference = check.context.catalog.byId.get(
        expectation.indicatorId,
      )?.earthReference;
      const readings =
        check.run.astronauts.find(
          (candidate) => candidate.astronautId === astronautId,
        )?.readings ?? [];

      return days.some((day) => {
        const classification = check.evaluator.evaluate(astronautId, day)
          ?.classifications[position];
        if (
          classification === undefined ||
          classification.status !== 'classified' ||
          compareTiers(classification.tier, expectation.minTier) < 0
        ) {
          return false;
        }
        if (expectation.withinEarthReference !== true) return true;
        const reading = readings.find(
          (candidate) =>
            candidate.day === day &&
            candidate.indicatorId === expectation.indicatorId,
        );
        return (
          reading !== undefined && insideRange(reading.value, earthReference)
        );
      });
    }
    default: {
      const unreachable: never = expectation;
      return unreachable;
    }
  }
}

function describeScope(scope: ExpectationScope): string {
  switch (scope.who) {
    case 'astronaut':
      return `astronaut "${scope.astronautId}"`;
    case 'any-crew-member':
      return 'any crew member';
    case 'every-crew-member':
      return 'every crew member';
    default: {
      const unreachable: never = scope;
      return unreachable;
    }
  }
}

function describeExpectation(expectation: StorylineExpectation): string {
  switch (expectation.form) {
    case 'cluster':
      return `cluster "${expectation.clusterId}" appears as a finding by day ${expectation.byDay}`;
    case 'indicator': {
      const reference =
        expectation.withinEarthReference === true
          ? ', with a reading inside the Earth reference range'
          : '';
      return `indicator "${expectation.indicatorId}" is classified ${expectation.minTier} or worse${reference} by day ${expectation.byDay}`;
    }
    default: {
      const unreachable: never = expectation;
      return unreachable;
    }
  }
}

/** Crew members that the scope names, and whether the scope is met given who meets it. */
function evaluateScope(
  scope: ExpectationScope,
  expectation: StorylineExpectation,
  check: CheckContext,
): { readonly met: boolean; readonly failing: readonly string[] } {
  const crewIds = check.run.astronauts.map((entry) => entry.astronautId);
  switch (scope.who) {
    case 'astronaut': {
      const met = astronautMeets(expectation, scope.astronautId, check);
      return { met, failing: met ? [] : [scope.astronautId] };
    }
    case 'any-crew-member': {
      const results = crewIds.map((id) => ({
        id,
        met: astronautMeets(expectation, id, check),
      }));
      return {
        met: results.some((result) => result.met),
        failing: results.filter((result) => !result.met).map((r) => r.id),
      };
    }
    case 'every-crew-member': {
      const results = crewIds.map((id) => ({
        id,
        met: astronautMeets(expectation, id, check),
      }));
      const failing = results.filter((result) => !result.met).map((r) => r.id);
      return { met: failing.length === 0, failing };
    }
    default: {
      const unreachable: never = scope;
      return unreachable;
    }
  }
}

/**
 * Checks that each storyline expectation of the scenario is met by the real engine.
 *
 * Runs the scenario once through the largest `byDay`. For each expectation and each astronaut
 * in its scope, evaluates with `evaluateAstronaut` as of every day from 0 to `byDay`. A
 * `byDay` after the last produced day is checked only to that last day.
 *
 * Returns one `expectation-unmet` problem per unmet expectation (field `expectations.<index>`)
 * and one `engine-error` problem per distinct engine error, quoting it. When the run itself
 * fails, returns the problems of `runScenario` unchanged. Holds no tier, threshold or cluster
 * logic: all of that stays in the engine. Never throws and changes none of its arguments.
 */
export function checkStorylines(
  scenario: Scenario,
  library: SimulationLibrary,
  context: SimulationContext,
): readonly SimulationProblem[] {
  if (scenario.expectations.length === 0) return [];

  const lastDay = scenario.expectations.reduce(
    (largest, expectation) => Math.max(largest, expectation.byDay),
    0,
  );
  const run = runScenario(scenario, library, context, lastDay);
  if (!run.ok) return run.error;

  const evaluator = createEvaluator(scenario, run.value, context);
  const check: CheckContext = {
    run: run.value,
    evaluator,
    context,
    sortedIndicatorIds: context.catalog.indicators
      .map((definition) => definition.id)
      .toSorted(compareStrings),
  };

  const unmet = scenario.expectations.flatMap(
    (expectation, index): readonly SimulationProblem[] => {
      const outcome = evaluateScope(expectation.scope, expectation, check);
      if (outcome.met) return [];
      const detail =
        outcome.failing.length > 0
          ? ` Not met for: ${outcome.failing.join(', ')}.`
          : '';
      return [
        makeProblem(
          'expectation-unmet',
          'scenario',
          scenario.id,
          `expectations.${index}`,
          `Scenario "${scenario.id}": expected, for ${describeScope(expectation.scope)}, that ${describeExpectation(expectation)}, but no evaluation met it.${detail}`,
        ),
      ];
    },
  );

  return [...unmet, ...evaluator.problems()];
}
