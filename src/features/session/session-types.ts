import type { NoticeTone } from '@/components/notice-banner';
import type { AppContent } from '@/domain/content/app-content';
import type { EvaluationResult } from '@/domain/evaluate-input';
import type { Tier } from '@/domain/types';
import type { GroundLinkStatus } from '@/simulation/engine/ground-link';
import type {
  GroundLinkConfig,
  SimulationRun,
} from '@/simulation/engine/run-schema';
import type { EnvironmentConfig } from '@/simulation/environments/environment-schema';
import type { SimulationContext } from '@/simulation/library';
import type { Scenario } from '@/simulation/scenarios/scenario-schema';

/** `loading` until every persisted store has hydrated, `blocked` when the scenario cannot run. */
export type SessionStatus = 'loading' | 'ready' | 'blocked';

/** One problem or message for the user. Plain text only, never an error object. */
export type Notice = Readonly<{
  /** Stable id, used to dismiss the notice. */
  id: string;
  tone: NoticeTone;
  message: string;
  /** Identifier of an action the shell knows how to offer, for example `reset-session`. */
  action?: string;
}>;

/** Overall state of one crew member for the crew strip. */
export type CrewStatus = Readonly<{
  astronautId: string;
  label: string;
  /** Worst body-system tier, or `no-data` when every body system has no data. */
  overallTier: Tier | 'no-data';
  findingCount: number;
  /** Id of the strongest finding, or null when there is none. */
  strongestFindingId: string | null;
}>;

/** Ground link state for the day plus the environment's blackout rules. */
export type SessionGroundLink = Readonly<
  GroundLinkStatus & Pick<GroundLinkConfig, 'blackoutRules'>
>;

/**
 * One consistent snapshot that every page reads. A `loading` or `blocked` view has no
 * run and no result, so those fields are nullable.
 */
export type SessionView = Readonly<{
  /** The scenario after the edit log. */
  scenario: Scenario | null;
  environment: EnvironmentConfig | null;
  durationDays: number;
  /** The current Mission_Day, after clamping. */
  day: number;
  /** The selected astronaut, after falling back to a member of the crew. */
  astronautId: string;
  /** The run through `day`, with the check-in overlay applied. */
  run: SimulationRun | null;
  /** Evaluation of the selected astronaut. */
  result: EvaluationResult | null;
  crewStatus: readonly CrewStatus[];
  groundLink: SessionGroundLink | null;
  notices: readonly Notice[];
  status: SessionStatus;
}>;

/** The props of the session provider: engine data from `src/data` plus all content. */
export type SessionData = Readonly<
  SimulationContext & {
    content: AppContent;
  }
>;
