'use client';

import { createContext, useContext } from 'react';
import type { SessionData, SessionView } from './session-types';

/** The computed session snapshot. `null` outside the provider. */
export const SessionContext = createContext<SessionView | null>(null);

/** Engine data and content passed to the provider. `null` outside the provider. */
export const SessionDataContext = createContext<SessionData | null>(null);

/** Returns the engine data and the content. Throws outside the provider (a programming error). */
export function useSessionData(): SessionData {
  const data = useContext(SessionDataContext);
  if (data === null) {
    throw new Error('useSessionData must be used inside SessionProvider.');
  }
  return data;
}

/** Returns the session snapshot. Throws outside the provider (a programming error). */
export function useSessionView(): SessionView {
  const view = useContext(SessionContext);
  if (view === null) {
    throw new Error('useSessionView must be used inside SessionProvider.');
  }
  return view;
}
