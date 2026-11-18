'use client';

import { useEffect, useMemo, useRef } from 'react';

import { defaultLibrary } from '@/simulation/library';
import {
  useEngagementStore,
  ENGAGEMENT_STORE_NAME,
} from '@/store/engagement-store';
import { useEntriesStore, ENTRIES_STORE_NAME } from '@/store/entries-store';
import {
  useEscalationStore,
  ESCALATION_STORE_NAME,
} from '@/store/escalation-store';
import { onStorageWriteFailed } from '@/store/persist-config';
import type { StorageProblem } from '@/store/persist-config';
import { useSessionStore, SESSION_STORE_NAME } from '@/store/session-store';

import { useAppDefaults } from './use-content';
import type { Notice } from './session-types';

/*
 * Hydration gate (FD-7, Requirements 15.1, 44.1, 45.5, 45.6, 45.9, 45.11).
 *
 * The four persisted stores use `skipHydration`, so they start with the same
 * default values on the server and in the browser. `StoresHydrator` rehydrates
 * them in an effect after mount, applies the start state when the session store
 * holds no usable scenario, and then sets the `hydrated` flag of every store.
 * The session flag is set last, so a view that waits on `useHydrated()` sees
 * every store ready. Nothing here reads browser storage: the stores do that
 * through `src/store/persist-config.ts`.
 */

/** Action identifier of the "Reset session" button on the unreadable-data notice (Requirement 45.9). */
export const RESET_SESSION_ACTION = 'reset-session';

export const STORAGE_UNREADABLE_NOTICE_ID = 'storage-unreadable';
export const STORAGE_WRITE_FAILED_NOTICE_ID = 'storage-write-failed';

// Requirement 45.5 gives this text.
const UNREADABLE_MESSAGE = 'Saved data could not be read, starting fresh.';
const WRITE_FAILED_MESSAGE =
  'Your changes could not be saved on this device. The app keeps working, but they may be lost when you close it.';

/** Plain view of one persisted store, so the same steps run over all four. */
interface PersistedStoreHandle {
  readonly name: string;
  readonly rehydrate: () => Promise<void>;
  readonly markHydrated: () => void;
  readonly readStorageProblem: () => StorageProblem;
  readonly setStorageProblem: (problem: StorageProblem) => void;
}

interface StartState {
  readonly scenarioId: string;
  readonly astronautId: string;
  readonly day: number;
}

function createHandles(): {
  readonly session: PersistedStoreHandle;
  readonly others: readonly PersistedStoreHandle[];
} {
  const session: PersistedStoreHandle = {
    name: SESSION_STORE_NAME,
    rehydrate: () => useSessionStore.persist.rehydrate(),
    markHydrated: () => useSessionStore.getState().markHydrated(),
    readStorageProblem: () => useSessionStore.getState().storageProblem,
    setStorageProblem: (problem) =>
      useSessionStore.getState().setStorageProblem(problem),
  };
  const entries: PersistedStoreHandle = {
    name: ENTRIES_STORE_NAME,
    rehydrate: () => useEntriesStore.persist.rehydrate(),
    markHydrated: () => useEntriesStore.getState().markHydrated(),
    readStorageProblem: () => useEntriesStore.getState().storageProblem,
    setStorageProblem: (problem) =>
      useEntriesStore.getState().setStorageProblem(problem),
  };
  const engagement: PersistedStoreHandle = {
    name: ENGAGEMENT_STORE_NAME,
    rehydrate: () => useEngagementStore.persist.rehydrate(),
    markHydrated: () => useEngagementStore.getState().markHydrated(),
    readStorageProblem: () => useEngagementStore.getState().storageProblem,
    setStorageProblem: (problem) =>
      useEngagementStore.getState().setStorageProblem(problem),
  };
  const escalation: PersistedStoreHandle = {
    name: ESCALATION_STORE_NAME,
    rehydrate: () => useEscalationStore.persist.rehydrate(),
    markHydrated: () => useEscalationStore.getState().markHydrated(),
    readStorageProblem: () => useEscalationStore.getState().storageProblem,
    setStorageProblem: (problem) =>
      useEscalationStore.getState().setStorageProblem(problem),
  };
  return { session, others: [entries, engagement, escalation] };
}

/**
 * Applies the start state when the stored base scenario id is empty (first
 * visit, or the session value was discarded) or not in the library. Raises the
 * "could not be read" problem only for an unknown non-empty id (Requirement
 * 45.11). A first visit raises none.
 */
function applyStartStateWhenNeeded(start: StartState): void {
  const { baseScenarioId, setBaseScenario, setStorageProblem } =
    useSessionStore.getState();
  if (baseScenarioId !== '') {
    const known = defaultLibrary.scenarios.some(
      (scenario) => scenario.id === baseScenarioId,
    );
    if (known) return;
  }
  setBaseScenario(start.scenarioId, start.astronautId, start.day);
  if (baseScenarioId !== '') setStorageProblem('unreadable');
}

/**
 * Rehydrates the four stores, applies the start state, then sets every
 * `hydrated` flag (session last). Never rejects: a store whose rehydration
 * throws keeps its defaults and gets the `unreadable` problem.
 */
async function hydrateStores(start: StartState): Promise<void> {
  const { session, others } = createHandles();
  const all = [session, ...others];
  const results = await Promise.allSettled(
    all.map((handle) => handle.rehydrate()),
  );
  results.forEach((result, index) => {
    if (result.status === 'rejected')
      all[index]?.setStorageProblem('unreadable');
  });
  applyStartStateWhenNeeded(start);
  others.forEach((handle) => handle.markHydrated());
  session.markHydrated();
}

/** Marks a store whose write failed, without hiding the more serious `unreadable` problem. */
function handleWriteFailed(storeName: string): void {
  const { session, others } = createHandles();
  const handle = [session, ...others].find((h) => h.name === storeName);
  if (handle === undefined) return;
  if (handle.readStorageProblem() !== 'none') return;
  handle.setStorageProblem('write-failed');
}

/**
 * Render once, near the top of the provider tree. Renders nothing. The effect
 * subscribes to write failures before it starts rehydrating, and removes the
 * subscription in its clean-up. Rehydration starts once per mounted component,
 * so a development double effect or a hidden-then-shown route does not read
 * storage again over newer in-memory state.
 */
export function StoresHydrator(): null {
  const defaults = useAppDefaults();
  const started = useRef<Promise<void> | null>(null);

  useEffect(() => {
    const unsubscribe = onStorageWriteFailed(handleWriteFailed);
    started.current ??= hydrateStores({
      scenarioId: defaults.startScenarioId.value,
      astronautId: defaults.startAstronautId.value,
      day: defaults.startDay.value,
    });
    return unsubscribe;
  }, [defaults]);

  return null;
}

/** True once every persisted store has been rehydrated and the start state applied. */
export function useHydrated(): boolean {
  return useSessionStore((state) => state.hydrated);
}

/**
 * One notice for unreadable data (with the "Reset session" action id) and one
 * for a failed write, whichever stores raised them. Empty before the problem
 * occurs, so the first render matches the server. The array keeps its identity
 * until a problem changes.
 */
export function useStorageNotices(): readonly Notice[] {
  const session = useSessionStore((state) => state.storageProblem);
  const entries = useEntriesStore((state) => state.storageProblem);
  const engagement = useEngagementStore((state) => state.storageProblem);
  const escalation = useEscalationStore((state) => state.storageProblem);

  return useMemo(() => {
    const problems = [session, entries, engagement, escalation];
    const notices: Notice[] = [];
    if (problems.includes('unreadable')) {
      notices.push({
        id: STORAGE_UNREADABLE_NOTICE_ID,
        tone: 'warning',
        message: UNREADABLE_MESSAGE,
        action: RESET_SESSION_ACTION,
      });
    }
    if (problems.includes('write-failed')) {
      notices.push({
        id: STORAGE_WRITE_FAILED_NOTICE_ID,
        tone: 'warning',
        message: WRITE_FAILED_MESSAGE,
      });
    }
    return notices;
  }, [session, entries, engagement, escalation]);
}
