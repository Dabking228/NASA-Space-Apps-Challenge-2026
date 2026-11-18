import { z } from 'zod';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  ReadingEntrySchema,
  SymptomEntrySchema,
} from '@/domain/check-in/entry-schema';
import type {
  ReadingEntry,
  SymptomEntry,
} from '@/domain/check-in/entry-schema';
import type { SymptomKind } from '@/domain/schemas/vocabulary';

import { persistOptions } from './persist-config';
import type { StorageProblem, StorageProblemState } from './persist-config';

/*
 * Entries store (FD-6, FD-7, Requirements 14.6, 45.12). Holds the check-in
 * readings and symptom reports the user saved. One entry per key:
 * - reading: scenario, astronaut, day, indicator;
 * - symptom: scenario, astronaut, day, kind.
 * Entries of other scenarios are kept (dormant) and apply again when the user
 * returns to that scenario. The overlay itself is `applyEntries` in the domain.
 */

export const ENTRIES_STORE_NAME = 'entries';
export const ENTRIES_STORE_VERSION = 1;

// JSON of a tuple cannot collide, whatever characters the ids hold.
function readingKey(entry: ReadingEntry): string {
  return JSON.stringify([
    entry.scenarioId,
    entry.astronautId,
    entry.day,
    entry.indicatorId,
  ]);
}

function symptomKey(entry: SymptomEntry): string {
  return JSON.stringify([
    entry.scenarioId,
    entry.astronautId,
    entry.day,
    entry.kind,
  ]);
}

function hasUniqueKeys<T>(items: readonly T[], keyOf: (item: T) => string) {
  return new Set(items.map(keyOf)).size === items.length;
}

/** The part of a symptom entry that names one scenario, astronaut and day. */
const SymptomSetKeySchema = SymptomEntrySchema.omit({ kind: true });

export interface EntriesPersisted {
  readonly readings: readonly ReadingEntry[];
  readonly symptoms: readonly SymptomEntry[];
}

/** The two saved fields. A stored list with a repeated key is discarded. */
const EntriesPersistedSchema: z.ZodType<EntriesPersisted> = z
  .strictObject({
    readings: z.array(ReadingEntrySchema),
    symptoms: z.array(SymptomEntrySchema),
  })
  .refine(
    (v) =>
      hasUniqueKeys(v.readings, readingKey) &&
      hasUniqueKeys(v.symptoms, symptomKey),
    { message: 'Entries must have one record per key.' },
  );

export interface EntriesStoreData extends StorageProblemState {
  readonly readings: readonly ReadingEntry[];
  readonly symptoms: readonly SymptomEntry[];
  /** Set by the Hydration_Gate after rehydration. Not saved. */
  readonly hydrated: boolean;
  readonly storageProblem: StorageProblem;
}

export interface EntriesActions {
  /**
   * Replaces the entry with the same scenario, astronaut, day and indicator,
   * keeping its position, or appends. An invalid entry (negative or fractional
   * day, non-finite value, empty id) is ignored.
   */
  readonly saveReading: (entry: ReadingEntry) => void;
  /**
   * Replaces the whole symptom set of one scenario, astronaut and day with
   * `kinds` (repeated kinds count once). An empty list clears that set. Sets of
   * other days, astronauts and scenarios are untouched. An invalid id or day
   * is ignored.
   */
  readonly saveSymptoms: (
    scenarioId: string,
    astronautId: string,
    day: number,
    kinds: readonly SymptomKind[],
  ) => void;
  /** Empties both lists and clears the storage problem. */
  readonly clear: () => void;
  readonly markHydrated: () => void;
  readonly setStorageProblem: (problem: StorageProblem) => void;
}

export type EntriesState = EntriesStoreData & EntriesActions;

/** Same values on the server and in the browser (Requirement 44.4). */
export const ENTRIES_INITIAL_STATE: EntriesStoreData = {
  readings: [],
  symptoms: [],
  hydrated: false,
  storageProblem: 'none',
};

export const useEntriesStore = create<EntriesState>()(
  persist(
    (set) => ({
      ...ENTRIES_INITIAL_STATE,
      saveReading: (entry) =>
        set((s) => {
          const parsed = ReadingEntrySchema.safeParse(entry);
          if (!parsed.success) return s;
          const next: ReadingEntry = parsed.data;
          const key = readingKey(next);
          const at = s.readings.findIndex((r) => readingKey(r) === key);
          if (at === -1) return { readings: [...s.readings, next] };
          return {
            readings: s.readings.map((r, i) => (i === at ? next : r)),
          };
        }),
      saveSymptoms: (scenarioId, astronautId, day, kinds) =>
        set((s) => {
          const setKey = SymptomSetKeySchema.safeParse({
            scenarioId,
            astronautId,
            day,
          });
          if (!setKey.success) return s;
          const fresh: SymptomEntry[] = [];
          const seen = new Set<SymptomKind>();
          for (const kind of kinds) {
            if (seen.has(kind)) continue;
            seen.add(kind);
            const parsed = SymptomEntrySchema.safeParse({
              ...setKey.data,
              kind,
            });
            if (!parsed.success) return s;
            fresh.push(parsed.data);
          }
          const sameSet = (e: SymptomEntry): boolean =>
            e.scenarioId === scenarioId &&
            e.astronautId === astronautId &&
            e.day === day;
          const firstAt = s.symptoms.findIndex(sameSet);
          if (firstAt === -1) {
            return fresh.length === 0
              ? s
              : { symptoms: [...s.symptoms, ...fresh] };
          }
          // The new set takes the place of the old one.
          const symptoms: SymptomEntry[] = [];
          s.symptoms.forEach((e, i) => {
            if (i === firstAt) symptoms.push(...fresh);
            if (!sameSet(e)) symptoms.push(e);
          });
          return { symptoms };
        }),
      clear: () => set({ readings: [], symptoms: [], storageProblem: 'none' }),
      markHydrated: () => set({ hydrated: true }),
      setStorageProblem: (problem) => set({ storageProblem: problem }),
    }),
    persistOptions<EntriesState, EntriesPersisted>({
      name: ENTRIES_STORE_NAME,
      version: ENTRIES_STORE_VERSION,
      schema: EntriesPersistedSchema,
      partialize: (s) => ({
        readings: s.readings,
        symptoms: s.symptoms,
      }),
    }),
  ),
);
