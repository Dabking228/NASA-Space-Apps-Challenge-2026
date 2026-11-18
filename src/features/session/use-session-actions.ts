'use client';

import { useMemo } from 'react';

import { defaultLibrary } from '@/simulation/library';
import { useEngagementStore } from '@/store/engagement-store';
import { useEntriesStore } from '@/store/entries-store';
import { useEscalationStore } from '@/store/escalation-store';
import { useSessionStore } from '@/store/session-store';
import { useUiStore } from '@/store/ui-store';

import { useSessionView } from './session-context';
import { useAppDefaults } from './use-content';

/*
 * Session actions (Requirements 13.10, 17.1, 17.3, 17.4, 17.6, 17.7, 45.8). They write the
 * stores and nothing else; the provider recomputes the view from the new state. They read the
 * stores with `getState()` when called, so a callback never works from a stale day.
 */

export type SessionActionSet = Readonly<{
  /** Selects a crew member. The view falls back to the first crew member for an unknown id. */
  selectAstronaut: (astronautId: string) => void;
  /** Moves one day on, stopping at the last day. */
  nextDay: () => void;
  /** Moves one day back, stopping at day 0. */
  previousDay: () => void;
  /** Sets a whole day, kept from 0 to the last day. A value that is not finite is ignored. */
  setDay: (day: number) => void;
  /**
   * Loads the library scenario of the environment, clears the edit log, clamps the day to the
   * new duration and keeps the astronaut when that member is in the new crew, else selects the
   * first crew member. Returns false and changes nothing when no scenario has that environment.
   */
  switchEnvironmentScenario: (environmentId: string) => boolean;
  /**
   * Removes the four stored keys, applies the start state with an empty edit log, empties the
   * entries, the completions and the messages, sets the link clock to 0 and resets the UI
   * store. No page reload.
   */
  resetSession: () => void;
}>;

function clampDay(day: number, lastDay: number): number {
  return Math.min(Math.max(Math.trunc(day), 0), lastDay);
}

/** Removes the four stored keys through the stores. The stores keep their in-memory state. */
function clearStoredKeys(): void {
  useSessionStore.persist.clearStorage();
  useEntriesStore.persist.clearStorage();
  useEngagementStore.persist.clearStorage();
  useEscalationStore.persist.clearStorage();
}

export function useSessionActions(): SessionActionSet {
  const defaults = useAppDefaults();
  const { status, durationDays } = useSessionView();
  // Null while loading or when no scenario is loaded: the day actions then do nothing, so a
  // click before hydration cannot overwrite the saved day.
  const lastDay =
    status === 'loading' || durationDays < 1 ? null : durationDays - 1;

  return useMemo(
    (): SessionActionSet => ({
      selectAstronaut: (astronautId) => {
        useSessionStore.getState().setAstronaut(astronautId);
      },
      nextDay: () => {
        if (lastDay === null) return;
        const { day, setDay } = useSessionStore.getState();
        setDay(clampDay(Math.min(day, lastDay) + 1, lastDay));
      },
      previousDay: () => {
        if (lastDay === null) return;
        const { day, setDay } = useSessionStore.getState();
        setDay(clampDay(Math.min(day, lastDay) - 1, lastDay));
      },
      setDay: (day) => {
        if (lastDay === null || !Number.isFinite(day)) return;
        useSessionStore.getState().setDay(clampDay(day, lastDay));
      },
      switchEnvironmentScenario: (environmentId) => {
        const scenario = defaultLibrary.scenarios.find(
          (s) => s.environmentId === environmentId,
        );
        if (scenario === undefined) return false;
        const { day, astronautId, setBaseScenario } =
          useSessionStore.getState();
        setBaseScenario(
          scenario.id,
          scenario.crew.includes(astronautId)
            ? astronautId
            : (scenario.crew[0] ?? astronautId),
          clampDay(day, scenario.durationDays - 1),
        );
        return true;
      },
      resetSession: () => {
        useSessionStore.getState().resetToStart({
          baseScenarioId: defaults.startScenarioId.value,
          astronautId: defaults.startAstronautId.value,
          day: defaults.startDay.value,
        });
        useEntriesStore.getState().clear();
        useEngagementStore.getState().clear();
        useEscalationStore.getState().clear();
        useUiStore.getState().resetUi();
        // After the resets, which write the stores once more, so the keys end up removed.
        clearStoredKeys();
      },
    }),
    [lastDay, defaults],
  );
}
