import { z } from 'zod';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistOptions } from './persist-config';
import type { StorageProblem, StorageProblemState } from './persist-config';

/*
 * Session store (FD-1, FD-7, Requirements 14.2 to 14.5, 45). Holds plain data
 * only: the base scenario id, an ordered edit log, the selected astronaut and
 * the mission day. It imports nothing from `src/simulation`. The replay in
 * `src/features/session/` validates each edit against the simulation (an inject
 * payload goes through `ScenarioEventSchema` there), so the payload here is an
 * unvalidated plain object.
 */

export const SESSION_STORE_NAME = 'session';
export const SESSION_STORE_VERSION = 1;

/** Plain description of one edit. `id` is stable and unique within the log. */
export type Edit =
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

export type EditKind = Edit['kind'];

const EditSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('inject-event'),
    id: z.string(),
    payload: z.record(z.string(), z.unknown()),
  }),
  z.strictObject({
    kind: z.literal('switch-environment'),
    id: z.string(),
    environmentId: z.string(),
  }),
  z.strictObject({
    kind: z.literal('switch-crew'),
    id: z.string(),
    astronautIds: z.array(z.string()),
  }),
]);

/** The four saved fields (Requirement 45.3). Never `hydrated` or `storageProblem`. */
const SessionPersistedSchema: z.ZodType<SessionPersisted> = z.strictObject({
  baseScenarioId: z.string(),
  editLog: z.array(EditSchema),
  astronautId: z.string(),
  day: z.number().int().min(0),
});

export interface SessionPersisted {
  readonly baseScenarioId: string;
  readonly editLog: readonly Edit[];
  readonly astronautId: string;
  readonly day: number;
}

/** Start state applied by `resetToStart` (comes from `src/data/app-defaults.ts`). */
export interface SessionStart {
  readonly baseScenarioId: string;
  readonly astronautId: string;
  readonly day: number;
}

export interface SessionStoreData extends StorageProblemState {
  readonly baseScenarioId: string;
  readonly editLog: readonly Edit[];
  readonly astronautId: string;
  readonly day: number;
  /** Set by the Hydration_Gate after rehydration. Not saved. */
  readonly hydrated: boolean;
  readonly storageProblem: StorageProblem;
}

export interface SessionActions {
  /** Loads a scenario: sets the three fields and clears the edit log. */
  readonly setBaseScenario: (
    scenarioId: string,
    astronautId: string,
    day: number,
  ) => void;
  readonly setAstronaut: (astronautId: string) => void;
  /** Keeps `day` a whole number of at least 0. Ignores NaN and infinity. */
  readonly setDay: (day: number) => void;
  /** Appends an edit. Ignored when an edit with the same id exists. */
  readonly appendEdit: (edit: Edit) => void;
  readonly removeEdit: (id: string) => void;
  /** Applies the start state, empties the edit log and clears the storage problem. */
  readonly resetToStart: (defaults: SessionStart) => void;
  readonly markHydrated: () => void;
  readonly setStorageProblem: (problem: StorageProblem) => void;
}

export type SessionState = SessionStoreData & SessionActions;

/** Same values on the server and in the browser (Requirement 44.4). */
export const SESSION_INITIAL_STATE: SessionStoreData = {
  baseScenarioId: '',
  editLog: [],
  astronautId: '',
  day: 0,
  hydrated: false,
  storageProblem: 'none',
};

/** Whole day of at least 0, or `null` when the value is not a finite number. */
function wholeDay(day: number): number | null {
  if (!Number.isFinite(day)) return null;
  return Math.max(0, Math.floor(day));
}

/** Copies an edit so the log never shares arrays or objects with the caller. */
function copyEdit(edit: Edit): Edit {
  switch (edit.kind) {
    case 'inject-event':
      return { ...edit, payload: { ...edit.payload } };
    case 'switch-environment':
      return { ...edit };
    case 'switch-crew':
      return { ...edit, astronautIds: [...edit.astronautIds] };
    default: {
      const unreachable: never = edit;
      return unreachable;
    }
  }
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      ...SESSION_INITIAL_STATE,
      setBaseScenario: (scenarioId, astronautId, day) =>
        set((s) => ({
          baseScenarioId: scenarioId,
          astronautId,
          day: wholeDay(day) ?? s.day,
          editLog: [],
        })),
      setAstronaut: (astronautId) => set({ astronautId }),
      setDay: (day) =>
        set((s) => {
          const next = wholeDay(day);
          return next === null || next === s.day ? s : { day: next };
        }),
      appendEdit: (edit) =>
        set((s) =>
          s.editLog.some((e) => e.id === edit.id)
            ? s
            : { editLog: [...s.editLog, copyEdit(edit)] },
        ),
      removeEdit: (id) =>
        set((s) =>
          s.editLog.some((e) => e.id === id)
            ? { editLog: s.editLog.filter((e) => e.id !== id) }
            : s,
        ),
      resetToStart: (defaults) =>
        set((s) => ({
          baseScenarioId: defaults.baseScenarioId,
          astronautId: defaults.astronautId,
          day: wholeDay(defaults.day) ?? s.day,
          editLog: [],
          storageProblem: 'none',
        })),
      markHydrated: () => set({ hydrated: true }),
      setStorageProblem: (problem) => set({ storageProblem: problem }),
    }),
    persistOptions<SessionState, SessionPersisted>({
      name: SESSION_STORE_NAME,
      version: SESSION_STORE_VERSION,
      schema: SessionPersistedSchema,
      partialize: (s) => ({
        baseScenarioId: s.baseScenarioId,
        editLog: s.editLog.map(copyEdit),
        astronautId: s.astronautId,
        day: s.day,
      }),
    }),
  ),
);
