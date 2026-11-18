'use client';

import { useMemo } from 'react';

import type { EvaluationResult } from '@/domain/evaluate-input';
import {
  computeRadiationFigures,
  type RadiationFigures,
} from '@/domain/radiation/radiation-figures';
import type { SystemStatus } from '@/domain/rules/body-systems';
import type { Finding } from '@/domain/schemas/finding';
import type { BodySystem } from '@/domain/schemas/vocabulary';
import {
  buildTrendSeries,
  type TrendSeries,
} from '@/domain/trends/trend-series';
import type { SimulationRun } from '@/simulation/engine/run-schema';
import type { EnvironmentConfig } from '@/simulation/environments/environment-schema';
import type { Scenario } from '@/simulation/scenarios/scenario-schema';
import type { TrendRange } from '@/store/ui-store';

import { sortFindings } from './compute-session-view';
import { useSessionData, useSessionView } from './session-context';
import type {
  CrewStatus,
  Notice,
  SessionGroundLink,
  SessionStatus,
} from './session-types';

/*
 * Selector hooks (Requirements 15.5, 15.6). Each reads one slice of the session view that the
 * provider computed once. None calls the engine for the view itself, and each returns the same
 * object while its inputs are unchanged, so a view that uses it re-renders only when its slice
 * changes. The two that derive a figure from the run (trend series, radiation figures) call a
 * pure domain helper inside `useMemo`.
 */

/**
 * What a selector hook returns:
 * - `loading`: the stores have not hydrated yet, so nothing is known (Requirement 15.6);
 * - `blocked`: the session cannot supply this slice (unknown scenario, failed run), and the
 *   notices say why;
 * - `ready`: `value` holds the slice.
 */
export type SessionSlice<T> =
  | Readonly<{ status: 'loading' }>
  | Readonly<{ status: 'blocked' }>
  | Readonly<{ status: 'ready'; value: T }>;

/** A trend series can also fail for a reason the caller can show, for example an unknown indicator. */
export type TrendSeriesSlice =
  | SessionSlice<TrendSeries>
  | Readonly<{ status: 'unavailable'; message: string }>;

/** What the context bar and the day control need about the loaded scenario. */
export type ScenarioInfo = Readonly<{
  scenario: Scenario;
  environment: EnvironmentConfig;
  durationDays: number;
  /** The current Mission_Day of the view, after clamping. */
  day: number;
  astronautId: string;
  astronautLabel: string;
}>;

const LOADING = { status: 'loading' } as const satisfies SessionSlice<never>;
const BLOCKED = { status: 'blocked' } as const satisfies SessionSlice<never>;

/**
 * `loading` while the view loads, `blocked` when there is no value, else `ready`. The value
 * must keep its identity while it is unchanged, so the returned slice does too.
 */
function useSlice<T>(status: SessionStatus, value: T | null): SessionSlice<T> {
  return useMemo((): SessionSlice<T> => {
    if (status === 'loading') return LOADING;
    if (value === null) return BLOCKED;
    return { status: 'ready', value };
  }, [status, value]);
}

/** `loading`, `ready` or `blocked` for the whole session. */
export function useSessionStatus(): SessionStatus {
  return useSessionView().status;
}

/** Evaluation of the selected astronaut. */
export function useCurrentResult(): SessionSlice<EvaluationResult> {
  const { status, result } = useSessionView();
  return useSlice(status, result);
}

/** Overall tier, finding count and strongest finding of each crew member. */
export function useCrewStatus(): SessionSlice<readonly CrewStatus[]> {
  const { status, crewStatus } = useSessionView();
  return useSlice(status, status === 'ready' ? crewStatus : null);
}

/**
 * Findings of the selected astronaut, most severe first (`sortFindings`). Pass a body system
 * to keep only the findings of that system.
 */
export function useFindings(
  system?: BodySystem,
): SessionSlice<readonly Finding[]> {
  const { status, result } = useSessionView();
  const sorted = useMemo(
    () => (result === null ? null : sortFindings(result.findings)),
    [result],
  );
  const selected = useMemo(
    () =>
      sorted === null || system === undefined
        ? sorted
        : sorted.filter((finding) => finding.system === system),
    [sorted, system],
  );
  return useSlice(status, selected);
}

/** One status per body system, in the engine's order. */
export function useBodySystems(): SessionSlice<readonly SystemStatus[]> {
  const { status, result } = useSessionView();
  return useSlice(status, result === null ? null : result.bodySystems);
}

/** Number of days a trend range shows, ending on the current day. `null` means from day 0. */
const TREND_RANGE_DAYS = {
  'last-7': 7,
  'last-14': 14,
  whole: null,
} as const satisfies Record<TrendRange, number | null>;

/**
 * Chart series of one indicator for the selected astronaut, through the current day. The range
 * `last-7` and `last-14` end on the current day and start no earlier than day 0. A saved
 * check-in reading shows in the series, because the run already holds it.
 */
export function useTrendSeries(
  indicatorId: string,
  range: TrendRange,
): TrendSeriesSlice {
  const { catalog, config } = useSessionData();
  const { status, run, result, day, astronautId } = useSessionView();
  return useMemo((): TrendSeriesSlice => {
    if (status === 'loading') return LOADING;
    if (run === null || result === null) return BLOCKED;
    const astronaut = run.astronauts.find((a) => a.astronautId === astronautId);
    if (astronaut === undefined) return BLOCKED;
    const days = TREND_RANGE_DAYS[range];
    const series = buildTrendSeries({
      result,
      readings: astronaut.readings,
      astronautId,
      catalog,
      config,
      indicatorId,
      fromDay: days === null ? 0 : Math.max(0, day - days + 1),
      toDay: day,
    });
    if (!series.ok) {
      return { status: 'unavailable', message: series.error.message };
    }
    return { status: 'ready', value: series.value };
  }, [
    status,
    run,
    result,
    day,
    astronautId,
    catalog,
    config,
    indicatorId,
    range,
  ]);
}

/** Dose figures of the selected astronaut on the current day. */
export function useRadiationFigures(): SessionSlice<RadiationFigures> {
  const { catalog } = useSessionData();
  const { status, run, day, astronautId } = useSessionView();
  const figures = useMemo(() => {
    if (run === null) return null;
    const astronaut = run.astronauts.find((a) => a.astronautId === astronautId);
    if (astronaut === undefined) return null;
    return computeRadiationFigures({
      readings: astronaut.readings,
      astronautId,
      day,
      environment: run.environment,
      catalog,
      careerDoseBeforeMissionMsv: astronaut.careerDoseBeforeMissionMsv,
      alerts: run.alerts,
    });
  }, [run, day, astronautId, catalog]);
  return useSlice(status, figures);
}

/** Ground link state of the current day with the blackout rules of the environment. */
export function useGroundLink(): SessionSlice<SessionGroundLink> {
  const { status, groundLink } = useSessionView();
  return useSlice(status, groundLink);
}

/**
 * Notices after merging, deduplication and removing the dismissed ones. A `blocked` session
 * still returns its notices as `ready`, because they explain why it is blocked.
 */
export function useNotices(): SessionSlice<readonly Notice[]> {
  const { status, notices } = useSessionView();
  return useSlice(status, notices);
}

/**
 * Scenario, environment, duration, day and astronaut label. It stays `ready` when the session
 * is `blocked` but the scenario is known (for example after a failed run), so the day control
 * and the environment switcher keep working.
 */
export function useScenarioInfo(): SessionSlice<ScenarioInfo> {
  const {
    status,
    scenario,
    environment,
    durationDays,
    day,
    astronautId,
    crewStatus,
  } = useSessionView();
  const info = useMemo((): ScenarioInfo | null => {
    if (scenario === null || environment === null) return null;
    const member = crewStatus.find((c) => c.astronautId === astronautId);
    return {
      scenario,
      environment,
      durationDays,
      day,
      astronautId,
      astronautLabel: member?.label ?? astronautId,
    };
  }, [scenario, environment, durationDays, day, astronautId, crewStatus]);
  return useSlice(status, info);
}

/** The run through the current day, with the check-in entries applied. */
export function useRun(): SessionSlice<SimulationRun> {
  const { status, run } = useSessionView();
  return useSlice(status, run);
}
