import { z } from 'zod';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { ScriptedReplyIdSchema } from '@/domain/content/escalation-schema';
import type { ScriptedReplyId } from '@/domain/content/escalation-schema';
import { EscalationSummarySchema } from '@/domain/escalation/summary-schema';
import type { EscalationSummary } from '@/domain/escalation/summary-schema';
import { MissionDaySchema } from '@/domain/schemas/vocabulary';

import { persistOptions } from './persist-config';
import type { StorageProblem, StorageProblemState } from './persist-config';

/*
 * Escalation store (FD-7, FD-11, Requirements 14.8, 31.5, 31.6, 45). Holds the
 * link clock and the messages sent to the ground. Only the inputs of a
 * message's stage are stored (when it was created, its one-way delay, when it
 * started). The stage itself is derived from these and the clock, so a reload
 * gives the same stage for the same clock (Requirement 32.10).
 *
 * Queue rule: a message created while the link is unavailable has
 * `startedAtLinkSeconds: null` until `startMessage` records the clock value at
 * which the link came back. A transmission that has started is never touched
 * again, so a later blackout does not interrupt it.
 */

export const ESCALATION_STORE_NAME = 'escalation';
export const ESCALATION_STORE_VERSION = 1;

/** Whole link-seconds of 0 or more. */
const LinkSecondsSchema = z.int().nonnegative();

/**
 * One message to the ground. It has the two fields of `LinkMessageTiming` in
 * `src/simulation/escalation/link-timing.ts`, so the stage helpers accept it.
 * No stage is stored.
 */
export interface StoredMessage {
  readonly id: string;
  /** Text made from the summary JSON. A second message with the same key is rejected. */
  readonly snapshotKey: string;
  readonly summary: EscalationSummary;
  readonly createdDay: number;
  readonly createdLinkSeconds: number;
  /** Whole link-seconds from the spacecraft to the ground. */
  readonly oneWayDelaySeconds: number;
  readonly replyId: ScriptedReplyId;
  /** Link-seconds at which transmission began, or null while the message is queued. */
  readonly startedAtLinkSeconds: number | null;
}

export const StoredMessageSchema: z.ZodType<StoredMessage> = z.strictObject({
  id: z.string().min(1),
  snapshotKey: z.string().min(1),
  summary: EscalationSummarySchema,
  createdDay: MissionDaySchema,
  createdLinkSeconds: LinkSecondsSchema,
  oneWayDelaySeconds: LinkSecondsSchema,
  replyId: ScriptedReplyIdSchema,
  startedAtLinkSeconds: LinkSecondsSchema.nullable(),
});

export interface EscalationPersisted {
  readonly linkClockSeconds: number;
  readonly messages: readonly StoredMessage[];
}

/** The two saved fields. A stored list with a repeated id or snapshot key is discarded. */
const EscalationPersistedSchema: z.ZodType<EscalationPersisted> = z
  .strictObject({
    linkClockSeconds: LinkSecondsSchema,
    messages: z.array(StoredMessageSchema),
  })
  .refine(
    (v) =>
      new Set(v.messages.map((m) => m.id)).size === v.messages.length &&
      new Set(v.messages.map((m) => m.snapshotKey)).size === v.messages.length,
    { message: 'Messages must have a unique id and snapshot key.' },
  );

export interface EscalationStoreData extends StorageProblemState {
  /** Whole link-seconds. Advanced by the shell driver. */
  readonly linkClockSeconds: number;
  readonly messages: readonly StoredMessage[];
  /** Set by the Hydration_Gate after rehydration. Not saved. */
  readonly hydrated: boolean;
  readonly storageProblem: StorageProblem;
}

export interface EscalationActions {
  /**
   * Adds `seconds` to the clock. Ignored unless `seconds` is a whole number of
   * 0 or more and the sum stays a safe integer.
   */
  readonly advanceClock: (seconds: number) => void;
  /** Sets the clock. Ignored unless `seconds` is a whole number of 0 or more. */
  readonly setClock: (seconds: number) => void;
  /**
   * Appends the message and returns `true`. Returns `false` and changes nothing
   * when a message with the same `snapshotKey` or `id` exists, or when the
   * message is invalid.
   */
  readonly addMessage: (message: StoredMessage) => boolean;
  /**
   * Records `linkSeconds` as the start of the message with this id, only while
   * its start is `null`. Does nothing for an unknown id, a started message or
   * an invalid time.
   */
  readonly startMessage: (id: string, linkSeconds: number) => void;
  /** Sets the clock to 0, empties the messages and clears the storage problem. */
  readonly clear: () => void;
  readonly markHydrated: () => void;
  readonly setStorageProblem: (problem: StorageProblem) => void;
}

export type EscalationState = EscalationStoreData & EscalationActions;

/** Same values on the server and in the browser (Requirement 44.4). */
export const ESCALATION_INITIAL_STATE: EscalationStoreData = {
  linkClockSeconds: 0,
  messages: [],
  hydrated: false,
  storageProblem: 'none',
};

export const useEscalationStore = create<EscalationState>()(
  persist(
    (set, get) => ({
      ...ESCALATION_INITIAL_STATE,
      advanceClock: (seconds) =>
        set((s) => {
          const step = LinkSecondsSchema.safeParse(seconds);
          if (!step.success) return s;
          const next = s.linkClockSeconds + step.data;
          return Number.isSafeInteger(next) ? { linkClockSeconds: next } : s;
        }),
      setClock: (seconds) =>
        set((s) => {
          const parsed = LinkSecondsSchema.safeParse(seconds);
          return parsed.success ? { linkClockSeconds: parsed.data } : s;
        }),
      addMessage: (message) => {
        const parsed = StoredMessageSchema.safeParse(message);
        if (!parsed.success) return false;
        const next = parsed.data;
        const exists = get().messages.some(
          (m) => m.snapshotKey === next.snapshotKey || m.id === next.id,
        );
        if (exists) return false;
        set((s) => ({ messages: [...s.messages, next] }));
        return true;
      },
      startMessage: (id, linkSeconds) =>
        set((s) => {
          const time = LinkSecondsSchema.safeParse(linkSeconds);
          if (!time.success) return s;
          const target = s.messages.find((m) => m.id === id);
          if (target === undefined || target.startedAtLinkSeconds !== null) {
            return s;
          }
          return {
            messages: s.messages.map((m) =>
              m.id === id ? { ...m, startedAtLinkSeconds: time.data } : m,
            ),
          };
        }),
      clear: () =>
        set({ linkClockSeconds: 0, messages: [], storageProblem: 'none' }),
      markHydrated: () => set({ hydrated: true }),
      setStorageProblem: (problem) => set({ storageProblem: problem }),
    }),
    persistOptions<EscalationState, EscalationPersisted>({
      name: ESCALATION_STORE_NAME,
      version: ESCALATION_STORE_VERSION,
      schema: EscalationPersistedSchema,
      partialize: (s) => ({
        linkClockSeconds: s.linkClockSeconds,
        messages: s.messages,
      }),
    }),
  ),
);
