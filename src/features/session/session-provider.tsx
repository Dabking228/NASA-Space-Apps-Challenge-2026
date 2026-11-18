'use client';

import { useDeferredValue, useMemo } from 'react';
import type { ReactNode } from 'react';

import { defaultLibrary } from '@/simulation/library';
import { useEntriesStore } from '@/store/entries-store';
import { useSessionStore } from '@/store/session-store';
import { useUiStore } from '@/store/ui-store';

import { computeSessionView, dedupeNotices } from './compute-session-view';
import { SessionContext, SessionDataContext } from './session-context';
import type { SessionData, SessionView } from './session-types';
import {
  StoresHydrator,
  useHydrated,
  useStorageNotices,
} from './stores-hydrator';

/*
 * Session provider (FD-1, FD-2, FD-8, Requirements 13.1, 13.10, 13.11, 13.14, 44.1).
 *
 * It renders on the server and in the browser with the same store defaults, so the first
 * render is a `loading` view (the stores start unhydrated, Requirement 44.4). `StoresHydrator`
 * rehydrates the stores in an effect after mount. The provider shows no skeleton itself:
 * it always renders its children, and each page shows its own skeleton while the status is
 * `loading` (Requirement 15.3).
 *
 * Two memos keep the work small. The first builds the view from the stores and recomputes
 * only when the base scenario, edit log, deferred day, astronaut or entries change. The
 * second adds the storage notices and drops the dismissed ones, so a dismissal or a storage
 * problem never re-runs the engine.
 */

export type SessionProviderProps = SessionData &
  Readonly<{ children: ReactNode }>;

export function SessionProvider({
  catalog,
  clusters,
  config,
  text,
  content,
  children,
}: SessionProviderProps) {
  // One object for the data context, so its identity changes only with the props.
  const data = useMemo<SessionData>(
    () => ({ catalog, clusters, config, text, content }),
    [catalog, clusters, config, text, content],
  );

  const hydrated = useHydrated();
  const baseScenarioId = useSessionStore((state) => state.baseScenarioId);
  const editLog = useSessionStore((state) => state.editLog);
  const astronautId = useSessionStore((state) => state.astronautId);
  const day = useSessionStore((state) => state.day);
  const readingEntries = useEntriesStore((state) => state.readings);
  const symptomEntries = useEntriesStore((state) => state.symptoms);
  const dismissedNoticeIds = useUiStore((state) => state.dismissedNoticeIds);
  const storageNotices = useStorageNotices();

  // The slider writes the store at once and the views follow the deferred day (13.11).
  const deferredDay = useDeferredValue(day);

  const computed = useMemo(
    () =>
      computeSessionView({
        hydrated,
        library: defaultLibrary,
        context: data,
        baseScenarioId,
        editLog,
        astronautId,
        day: deferredDay,
        readingEntries,
        symptomEntries,
      }),
    [
      hydrated,
      data,
      baseScenarioId,
      editLog,
      astronautId,
      deferredDay,
      readingEntries,
      symptomEntries,
    ],
  );

  const view = useMemo<SessionView>(() => {
    const merged = dedupeNotices([...storageNotices, ...computed.notices]);
    return {
      ...computed,
      notices: merged.filter(
        (notice) => !dismissedNoticeIds.includes(notice.id),
      ),
    };
  }, [computed, storageNotices, dismissedNoticeIds]);

  return (
    <SessionDataContext.Provider value={data}>
      <SessionContext.Provider value={view}>
        <StoresHydrator />
        {children}
      </SessionContext.Provider>
    </SessionDataContext.Provider>
  );
}
