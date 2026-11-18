import { z } from 'zod';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { CompletionSchema } from '@/domain/engagement/completion-schema';
import type { Completion } from '@/domain/engagement/completion-schema';

import { persistOptions } from './persist-config';
import type { StorageProblem, StorageProblemState } from './persist-config';

/*
 * Engagement store (FD-7, Requirements 14.7, 40.11, 45). Holds the countermeasure
 * tasks marked done, keyed by scenario, astronaut, day and task. Completions of
 * other scenarios are kept (dormant). Streaks and the crew goal are derived in
 * `src/domain/engagement/` and never stored here.
 */

export const ENGAGEMENT_STORE_NAME = 'engagement';
export const ENGAGEMENT_STORE_VERSION = 1;

// JSON of a tuple cannot collide, whatever characters the ids hold.
function completionKey(c: Completion): string {
  return JSON.stringify([c.scenarioId, c.astronautId, c.day, c.taskId]);
}

export interface EngagementPersisted {
  readonly completions: readonly Completion[];
}

/** The one saved field. A stored list with a repeated key is discarded. */
const EngagementPersistedSchema: z.ZodType<EngagementPersisted> = z
  .strictObject({ completions: z.array(CompletionSchema) })
  .refine(
    (v) =>
      new Set(v.completions.map(completionKey)).size === v.completions.length,
    { message: 'Completions must have one record per key.' },
  );

export interface EngagementStoreData extends StorageProblemState {
  readonly completions: readonly Completion[];
  /** Set by the Hydration_Gate after rehydration. Not saved. */
  readonly hydrated: boolean;
  readonly storageProblem: StorageProblem;
}

export interface EngagementActions {
  /** Adds the completion when no record has its key. Invalid input is ignored. */
  readonly markDone: (completion: Completion) => void;
  /** Removes the record with this key. Does nothing when there is none. */
  readonly markNotDone: (completion: Completion) => void;
  /**
   * Adds every completion whose key is absent, in order. A key repeated in the
   * input counts once. Invalid items are skipped.
   */
  readonly addMany: (completions: readonly Completion[]) => void;
  /** Empties the list and clears the storage problem. */
  readonly clear: () => void;
  readonly markHydrated: () => void;
  readonly setStorageProblem: (problem: StorageProblem) => void;
}

export type EngagementState = EngagementStoreData & EngagementActions;

/** Same values on the server and in the browser (Requirement 44.4). */
export const ENGAGEMENT_INITIAL_STATE: EngagementStoreData = {
  completions: [],
  hydrated: false,
  storageProblem: 'none',
};

/** Returns `existing` itself when nothing new was added. */
function withAdded(
  existing: readonly Completion[],
  incoming: readonly Completion[],
): readonly Completion[] {
  const known = new Set(existing.map(completionKey));
  const added: Completion[] = [];
  for (const item of incoming) {
    const parsed = CompletionSchema.safeParse(item);
    if (!parsed.success) continue;
    const key = completionKey(parsed.data);
    if (known.has(key)) continue;
    known.add(key);
    added.push(parsed.data);
  }
  return added.length === 0 ? existing : [...existing, ...added];
}

export const useEngagementStore = create<EngagementState>()(
  persist(
    (set) => ({
      ...ENGAGEMENT_INITIAL_STATE,
      markDone: (completion) =>
        set((s) => {
          const next = withAdded(s.completions, [completion]);
          return next === s.completions ? s : { completions: next };
        }),
      markNotDone: (completion) =>
        set((s) => {
          const key = completionKey(completion);
          return s.completions.some((c) => completionKey(c) === key)
            ? {
                completions: s.completions.filter(
                  (c) => completionKey(c) !== key,
                ),
              }
            : s;
        }),
      addMany: (completions) =>
        set((s) => {
          const next = withAdded(s.completions, completions);
          return next === s.completions ? s : { completions: next };
        }),
      clear: () => set({ completions: [], storageProblem: 'none' }),
      markHydrated: () => set({ hydrated: true }),
      setStorageProblem: (problem) => set({ storageProblem: problem }),
    }),
    persistOptions<EngagementState, EngagementPersisted>({
      name: ENGAGEMENT_STORE_NAME,
      version: ENGAGEMENT_STORE_VERSION,
      schema: EngagementPersistedSchema,
      partialize: (s) => ({ completions: s.completions }),
    }),
  ),
);
