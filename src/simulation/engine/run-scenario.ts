import type { AlertReport } from '@/domain/types';
import type { Result } from '@/domain/result';
import type { CrewProfile } from '../crew/crew-schema';
import type { EnvironmentConfig } from '../environments/environment-schema';
import { toEnvironmentProfile } from '../environments/profile';
import { collectAlerts } from '../events/effects';
import type { SimulationContext, SimulationLibrary } from '../library';
import type { Scenario } from '../scenarios/scenario-schema';
import {
  buildAstronautRun,
  buildHabitatSeries,
  type RunParts,
} from './build-astronaut-run';
import { makeProblem, type SimulationProblem } from './problem';
import type { SimulationRun } from './run-schema';
import { createSeededRandom } from './seeded-random';
import { validateScenario } from './validate-scenario';

function compareStrings(a: string, b: string): number {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

function compareAlerts(a: AlertReport, b: AlertReport): number {
  return a.startDay - b.startDay || a.endDay - b.endDay;
}

function checkThroughDay(
  scenario: Scenario,
  throughDay: number,
): readonly SimulationProblem[] {
  return Number.isSafeInteger(throughDay) && throughDay >= 0
    ? []
    : [
        makeProblem(
          'invalid-argument',
          'run',
          scenario.id,
          'throughDay',
          `The last day ${String(throughDay)} is not a whole number of 0 or more.`,
        ),
      ];
}

/** Crew profiles of the scenario, sorted by id. Validation has already checked that each exists. */
function crewOf(
  scenario: Scenario,
  library: SimulationLibrary,
): readonly CrewProfile[] {
  return library.crew
    .filter((profile) => scenario.crew.includes(profile.id))
    .toSorted((a, b) => compareStrings(a.id, b.id));
}

function missingEntry(scenario: Scenario): readonly SimulationProblem[] {
  return [
    makeProblem(
      'unknown-environment',
      'scenario',
      scenario.id,
      'environmentId',
      `Environment "${scenario.environmentId}" is not in the library.`,
    ),
  ];
}

function buildRun(
  scenario: Scenario,
  env: EnvironmentConfig,
  library: SimulationLibrary,
  parts: RunParts,
): SimulationRun {
  const profile = toEnvironmentProfile(env);
  const habitat = buildHabitatSeries(env, parts);
  return {
    scenarioId: scenario.id,
    throughDay: parts.last,
    durationDays: scenario.durationDays,
    astronauts: crewOf(scenario, library).map((member) =>
      buildAstronautRun(
        member,
        env,
        habitat,
        profile.backgroundDoseRateMsvPerDay,
        parts,
      ),
    ),
    alerts: collectAlerts(
      scenario.events,
      library.settings.events,
      parts.last,
    ).toSorted(compareAlerts),
    environment: profile,
    groundLink: {
      oneWayDelaySeconds:
        env.groundLink.oneWayDelaySeconds === null
          ? null
          : { ...env.groundLink.oneWayDelaySeconds },
      blackoutRules: [...env.groundLink.blackoutRules],
    },
  };
}

/**
 * Runs a scenario through day `min(throughDay, durationDays - 1)`. Keeps no state, and no value
 * reads `throughDay` except to choose the produced days and to clamp alert end days, so the run
 * for an earlier day is a prefix of the run for a later one (Requirement 13.6).
 * Returns every problem found, and no run, when the scenario or `throughDay` is invalid.
 */
export function runScenario(
  scenario: Scenario,
  library: SimulationLibrary,
  context: SimulationContext,
  throughDay: number,
): Result<SimulationRun, readonly SimulationProblem[]> {
  const problems = [
    ...validateScenario(
      scenario,
      library,
      context.catalog,
      context.config,
      context.clusters,
    ),
    ...checkThroughDay(scenario, throughDay),
  ];
  if (problems.length > 0) return { ok: false, error: problems };

  const env = library.environments.find(
    (candidate) => candidate.id === scenario.environmentId,
  );
  if (env === undefined) return { ok: false, error: missingEntry(scenario) };

  const random = createSeededRandom(scenario.seed, library.settings.noise);
  if (!random.ok) return random;

  const last = Math.min(throughDay, scenario.durationDays - 1);
  return {
    ok: true,
    value: buildRun(scenario, env, library, {
      random: random.value,
      settings: library.settings,
      events: scenario.events,
      last,
      durationDays: scenario.durationDays,
    }),
  };
}
