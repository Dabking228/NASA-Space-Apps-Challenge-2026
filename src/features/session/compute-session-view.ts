import { applyEntries } from '@/domain/check-in/apply-entries';
import type {
  ReadingEntry,
  SymptomEntry,
} from '@/domain/check-in/entry-schema';
import { evaluateAstronaut } from '@/domain/evaluate';
import type { EvaluationResult } from '@/domain/evaluate-input';
import type { SystemStatus } from '@/domain/rules/body-systems';
import type { Finding } from '@/domain/schemas/finding';
import { CONFIDENCE_ORDER, compareTiers, worstTier } from '@/domain/tiers';
import type { Tier } from '@/domain/types';
import { buildEvaluationInput } from '@/simulation/engine/engine-input';
import { groundLinkStatus } from '@/simulation/engine/ground-link';
import type { SimulationRun } from '@/simulation/engine/run-schema';
import { runScenario } from '@/simulation/engine/run-scenario';
import type {
  SimulationContext,
  SimulationLibrary,
} from '@/simulation/library';
import type { Scenario } from '@/simulation/scenarios/scenario-schema';
import { findBaseScenario, replayEdits, type ReplayEdit } from './replay';
import type { CrewStatus, Notice, SessionView } from './session-types';

/*
 * The session view (FD-1, Requirements 13.5 to 13.9, 13.12, 13.13). A pure function of plain
 * inputs: it reads no store, no clock and no random source, and it never throws on user data.
 * Problems from the replay, the run and the engine become notices with plain text.
 */

/** Same identifier as `RESET_SESSION_ACTION` in `stores-hydrator.tsx`, which is a client file. */
const RESET_SESSION = 'reset-session';

export type ComputeSessionViewArgs = Readonly<{
  /** False until every persisted store has hydrated. The view is then `loading`. */
  hydrated: boolean;
  library: SimulationLibrary;
  /** Engine data. `SessionData` satisfies it. */
  context: SimulationContext;
  baseScenarioId: string;
  editLog: readonly ReplayEdit[];
  astronautId: string;
  day: number;
  readingEntries: readonly ReadingEntry[];
  symptomEntries: readonly SymptomEntry[];
}>;

function compareStrings(a: string, b: string): number {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

/** Unique by message. The first occurrence is kept and the order is kept. */
export function dedupeNotices(notices: readonly Notice[]): readonly Notice[] {
  const seen = new Set<string>();
  return notices.filter((notice) => {
    if (seen.has(notice.message)) return false;
    seen.add(notice.message);
    return true;
  });
}

/** Most severe tier first, then most certain, then id. Returns a new array. */
export function sortFindings(findings: readonly Finding[]): Finding[] {
  return findings.toSorted(
    (a, b) =>
      compareTiers(b.tier, a.tier) ||
      CONFIDENCE_ORDER.indexOf(b.confidence) -
        CONFIDENCE_ORDER.indexOf(a.confidence) ||
      compareStrings(a.id, b.id),
  );
}

function tierOfSystem(system: SystemStatus): readonly Tier[] {
  switch (system.status) {
    case 'no-data':
      return [];
    case 'classified':
      return [system.tier];
    default: {
      const unreachable: never = system;
      return unreachable;
    }
  }
}

/** Worst body-system tier, or `no-data` when every body system has no data (13.8). */
export function overallTier(
  bodySystems: readonly SystemStatus[],
): Tier | 'no-data' {
  const [first, ...rest] = bodySystems.flatMap(tierOfSystem);
  return first === undefined ? 'no-data' : worstTier([first, ...rest]);
}

/** Whole number from 0 to `durationDays - 1`. A value that is not finite becomes 0. */
function clampDay(day: number, durationDays: number): number {
  const whole = Number.isFinite(day) ? Math.trunc(day) : 0;
  return Math.min(Math.max(whole, 0), Math.max(durationDays - 1, 0));
}

function emptyView(
  args: ComputeSessionViewArgs,
  status: 'loading' | 'blocked',
  parts: Readonly<{
    scenario: Scenario | null;
    environment: SessionView['environment'];
    notices: readonly Notice[];
  }>,
): SessionView {
  const durationDays = parts.scenario?.durationDays ?? 0;
  return {
    scenario: parts.scenario,
    environment: parts.environment,
    durationDays,
    day: clampDay(args.day, durationDays),
    astronautId: args.astronautId,
    run: null,
    result: null,
    crewStatus: [],
    groundLink: null,
    notices: dedupeNotices(parts.notices),
    status,
  };
}

/** Applies the saved entries for each astronaut. Entries after `day` are left out. */
function overlayEntries(
  run: SimulationRun,
  day: number,
  args: ComputeSessionViewArgs,
): SimulationRun {
  const readingEntries = args.readingEntries.filter((e) => e.day <= day);
  const symptomEntries = args.symptomEntries.filter((e) => e.day <= day);
  return {
    ...run,
    astronauts: run.astronauts.map((astronaut) => {
      const overlaid = applyEntries({
        readings: astronaut.readings,
        symptoms: astronaut.symptoms,
        astronautId: astronaut.astronautId,
        scenarioId: run.scenarioId,
        readingEntries,
        symptomEntries,
      });
      return {
        ...astronaut,
        readings: [...overlaid.readings],
        symptoms: [...overlaid.symptoms],
      };
    }),
  };
}

type Member = Readonly<{
  astronautId: string;
  label: string;
  /** Null when the evaluation input could not be built. */
  result: EvaluationResult | null;
  notices: readonly Notice[];
}>;

function evaluateMember(
  run: SimulationRun,
  astronautId: string,
  label: string,
  day: number,
  context: SimulationContext,
): Member {
  const input = buildEvaluationInput(run, astronautId, day, context);
  if (!input.ok) {
    return {
      astronautId,
      label,
      result: null,
      notices: [
        {
          id: `input:${astronautId}`,
          tone: 'error',
          message: `${label}: the health check could not start. ${input.error.message}`,
        },
      ],
    };
  }
  const result = evaluateAstronaut(input.value);
  return {
    astronautId,
    label,
    result,
    notices: result.errors.map((error, index) => ({
      id: `engine:${astronautId}:${error.code}:${index}`,
      tone: 'warning',
      message: `${label}: ${error.message}`,
    })),
  };
}

function crewStatusOf(member: Member): CrewStatus {
  const findings = member.result?.findings ?? [];
  return {
    astronautId: member.astronautId,
    label: member.label,
    overallTier: overallTier(member.result?.bodySystems ?? []),
    findingCount: findings.length,
    strongestFindingId: sortFindings(findings).at(0)?.id ?? null,
  };
}

/**
 * Builds the whole session view. `loading` before hydration, `blocked` for an unknown
 * scenario, an unknown environment, a failed run or a failed evaluation input for the
 * selected astronaut (the view then holds notices and a null run and result), else `ready`.
 */
export function computeSessionView(args: ComputeSessionViewArgs): SessionView {
  const { library, context } = args;
  if (!args.hydrated) {
    return emptyView(args, 'loading', {
      scenario: null,
      environment: null,
      notices: [],
    });
  }

  const base = findBaseScenario(library, args.baseScenarioId);
  if (base === null) {
    return emptyView(args, 'blocked', {
      scenario: null,
      environment: null,
      notices: [
        {
          id: 'session:unknown-scenario',
          tone: 'error',
          message:
            'This scenario is not available. Choose another scenario or reset the session.',
          action: RESET_SESSION,
        },
      ],
    });
  }

  // Only the four engine fields, so no content reaches the engine input.
  const engineContext: SimulationContext = {
    catalog: context.catalog,
    clusters: context.clusters,
    config: context.config,
    text: context.text,
  };
  const replay = replayEdits(base, args.editLog, library, engineContext);
  const scenario = replay.scenario;
  const environment =
    library.environments.find((e) => e.id === scenario.environmentId) ?? null;
  if (environment === null) {
    return emptyView(args, 'blocked', {
      scenario,
      environment: null,
      notices: [
        ...replay.notices,
        {
          id: 'session:unknown-environment',
          tone: 'error',
          message: `The environment "${scenario.environmentId}" is not available. Choose another scenario or reset the session.`,
          action: RESET_SESSION,
        },
      ],
    });
  }

  const day = clampDay(args.day, scenario.durationDays);
  const run = runScenario(scenario, library, engineContext, day);
  if (!run.ok) {
    return emptyView(args, 'blocked', {
      scenario,
      environment,
      notices: [
        ...replay.notices,
        {
          id: 'run:problems',
          tone: 'error',
          message: `The scenario could not run. ${run.error.map((p) => p.message).join(' ')}`,
          action: RESET_SESSION,
        },
      ],
    });
  }

  const overlaid = overlayEntries(run.value, day, args);
  const members = scenario.crew.map((id) =>
    evaluateMember(
      overlaid,
      id,
      library.crew.find((profile) => profile.id === id)?.label ?? id,
      day,
      engineContext,
    ),
  );
  const astronautId = scenario.crew.includes(args.astronautId)
    ? args.astronautId
    : (scenario.crew[0] ?? args.astronautId);
  const selected = members.find((m) => m.astronautId === astronautId);
  const notices = dedupeNotices([
    ...replay.notices,
    ...members.flatMap((m) => m.notices),
  ]);

  const result = selected?.result ?? null;
  if (result === null) {
    return {
      ...emptyView(args, 'blocked', { scenario, environment, notices }),
      day,
      astronautId,
    };
  }

  return {
    scenario,
    environment,
    durationDays: scenario.durationDays,
    day,
    astronautId,
    run: overlaid,
    result,
    crewStatus: members.map(crewStatusOf),
    groundLink: {
      ...groundLinkStatus(environment, scenario.events, day),
      blackoutRules: [...environment.groundLink.blackoutRules],
    },
    notices,
    status: 'ready',
  };
}
