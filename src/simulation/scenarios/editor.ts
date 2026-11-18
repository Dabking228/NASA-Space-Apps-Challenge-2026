import type { Result } from '@/domain/result';
import type { ScenarioEvent } from '../events/event-schemas';
import type { SimulationContext, SimulationLibrary } from '../library';
import type { SimulationProblem } from '../engine/problem';
import { validateScenario } from '../engine/validate-scenario';
import type { Scenario } from './scenario-schema';

/**
 * Returns the changed scenario only when it passes `validateScenario`. Otherwise returns every
 * problem found and no scenario (Requirement 14.5). The seed is copied unchanged by the spread
 * in each caller, so values the edit does not touch stay equal (Requirements 14.6 to 14.8).
 */
function validated(
  changed: Scenario,
  library: SimulationLibrary,
  context: SimulationContext,
): Result<Scenario, readonly SimulationProblem[]> {
  const problems = validateScenario(
    changed,
    library,
    context.catalog,
    context.config,
    context.clusters,
  );
  return problems.length === 0
    ? { ok: true, value: changed }
    : { ok: false, error: problems };
}

/** A new scenario with `event` appended to its events. The input scenario is not changed. */
export function injectEvent(
  scenario: Scenario,
  event: ScenarioEvent,
  library: SimulationLibrary,
  context: SimulationContext,
): Result<Scenario, readonly SimulationProblem[]> {
  return validated(
    { ...scenario, events: [...scenario.events, event] },
    library,
    context,
  );
}

/** A new scenario with the given environment id. The input scenario is not changed. */
export function switchEnvironment(
  scenario: Scenario,
  environmentId: string,
  library: SimulationLibrary,
  context: SimulationContext,
): Result<Scenario, readonly SimulationProblem[]> {
  return validated({ ...scenario, environmentId }, library, context);
}

/** A new scenario with the given crew. The input scenario is not changed. */
export function switchCrew(
  scenario: Scenario,
  astronautIds: readonly string[],
  library: SimulationLibrary,
  context: SimulationContext,
): Result<Scenario, readonly SimulationProblem[]> {
  return validated({ ...scenario, crew: [...astronautIds] }, library, context);
}
