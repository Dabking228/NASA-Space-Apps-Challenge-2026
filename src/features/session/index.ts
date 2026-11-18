/*
 * Public API of the session feature. Other features and `src/app` import only from here.
 * Internals stay private: `computeSessionView`, `dedupeNotices`, `replayEdits`,
 * `StoresHydrator`, `useStorageNotices` and the two context objects.
 */

export { SessionProvider } from './session-provider';
export type { SessionProviderProps } from './session-provider';

export { useSessionData, useSessionView } from './session-context';

export {
  useBodySystems,
  useCrewStatus,
  useCurrentResult,
  useFindings,
  useGroundLink,
  useNotices,
  useRadiationFigures,
  useRun,
  useScenarioInfo,
  useSessionStatus,
  useTrendSeries,
} from './use-session';
export type {
  ScenarioInfo,
  SessionSlice,
  TrendSeriesSlice,
} from './use-session';

export { useSessionActions } from './use-session-actions';
export type { SessionActionSet } from './use-session-actions';

export {
  useAboutContent,
  useAppDefaults,
  useBodyRegions,
  useCheckInContent,
  useContent,
  useCountermeasures,
  useDirectorPresets,
  useEngagementSettings,
  useEscalationContent,
  useHazards,
  useNavigation,
  useRadiationContent,
} from './use-content';

export { RESET_SESSION_ACTION, useHydrated } from './stores-hydrator';

// Pure helpers that every view reuses so findings are ordered in one place (task 7.3).
export { overallTier, sortFindings } from './compute-session-view';

export type {
  CrewStatus,
  Notice,
  SessionData,
  SessionGroundLink,
  SessionStatus,
  SessionView,
} from './session-types';
