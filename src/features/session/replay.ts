import { ScenarioEventSchema } from '@/simulation/events/event-schemas';
import type { SimulationProblem } from '@/simulation/engine/problem';
import type {
  SimulationContext,
  SimulationLibrary,
} from '@/simulation/library';
import {
  injectEvent,
  switchCrew,
  switchEnvironment,
} from '@/simulation/scenarios/editor';
import type { Scenario } from '@/simulation/scenarios/scenario-schema';
import type { Notice } from './session-types';

/*
 * Replay of the edit log (FD-1, Requirements 13.3, 13.4, 46.2). The log holds plain data,
 * so this file validates each inject payload with `ScenarioEventSchema` before it calls
 * `injectEvent`. An edit that fails is left out of effect, adds notices, and the next edit
 * still runs on the scenario as it stands. The log itself is never changed here.
 */

/**
 * Plain description of one edit. Same shape as `Edit` in `src/store/session-store.ts`, which
 * is assignable to it. It is declared here so this file takes plain arguments and imports no
 * store (task 7.2).
 */
export type ReplayEdit =
  | {
      readonly kind: 'inject-event';
      readonly id: string;
      readonly payload: Readonly<Record<string, unknown>>;
    }
  | {
      readonly kind: 'switch-environment';
      readonly id: string;
      readonly environmentId: string;
    }
  | {
      readonly kind: 'switch-crew';
      readonly id: string;
      readonly astronautIds: readonly string[];
    };

export type ReplayResult = Readonly<{
  /** The base scenario with every edit that succeeded applied, in order. */
  scenario: Scenario;
  /** One notice for each problem of each edit that was left out. Empty when all edits applied. */
  notices: readonly Notice[];
}>;

/** The library scenario with this id, or null when the id is empty or unknown. Never throws. */
export function findBaseScenario(
  library: SimulationLibrary,
  baseScenarioId: string,
): Scenario | null {
  return library.scenarios.find((s) => s.id === baseScenarioId) ?? null;
}

/** Plain-text name of an edit, for the notice text. */
function describeEdit(edit: ReplayEdit): string {
  switch (edit.kind) {
    case 'inject-event':
      return 'An injected event';
    case 'switch-environment':
      return 'An environment change';
    case 'switch-crew':
      return 'A crew change';
    default: {
      const unreachable: never = edit;
      return unreachable;
    }
  }
}

function noticesFor(
  edit: ReplayEdit,
  index: number,
  messages: readonly string[],
): readonly Notice[] {
  const lead = `${describeEdit(edit)} was left out`;
  return messages.map((message, i) => ({
    id: `replay:${edit.id}:${index}:${i}`,
    tone: 'warning',
    message: `${lead}: ${message}`,
  }));
}

function problemMessages(problems: readonly SimulationProblem[]): string[] {
  return problems.map((p) => p.message);
}

/**
 * Applies `editLog` to `base` in order. Returns the resulting scenario and one notice for
 * each problem of each edit that failed its parse or returned simulation problems.
 */
export function replayEdits(
  base: Scenario,
  editLog: readonly ReplayEdit[],
  library: SimulationLibrary,
  context: SimulationContext,
): ReplayResult {
  let scenario = base;
  const notices: Notice[] = [];

  editLog.forEach((edit, index) => {
    switch (edit.kind) {
      case 'inject-event': {
        const parsed = ScenarioEventSchema.safeParse(edit.payload);
        if (!parsed.success) {
          // Plain text only: no Zod error object reaches the user (Requirement 46.11).
          const reasons = parsed.error.issues.map((issue) =>
            issue.path.length > 0
              ? `${issue.path.join('.')}: ${issue.message}`
              : issue.message,
          );
          notices.push(
            ...noticesFor(edit, index, [
              `the event data is not valid (${reasons.join('; ')})`,
            ]),
          );
          return;
        }
        const result = injectEvent(scenario, parsed.data, library, context);
        if (result.ok) {
          scenario = result.value;
        } else {
          notices.push(
            ...noticesFor(edit, index, problemMessages(result.error)),
          );
        }
        return;
      }
      case 'switch-environment': {
        const result = switchEnvironment(
          scenario,
          edit.environmentId,
          library,
          context,
        );
        if (result.ok) {
          scenario = result.value;
        } else {
          notices.push(
            ...noticesFor(edit, index, problemMessages(result.error)),
          );
        }
        return;
      }
      case 'switch-crew': {
        const result = switchCrew(
          scenario,
          edit.astronautIds,
          library,
          context,
        );
        if (result.ok) {
          scenario = result.value;
        } else {
          notices.push(
            ...noticesFor(edit, index, problemMessages(result.error)),
          );
        }
        return;
      }
      default: {
        const unreachable: never = edit;
        return unreachable;
      }
    }
  });

  return { scenario, notices };
}
