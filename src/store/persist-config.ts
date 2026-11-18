import type { z } from 'zod';
import { createJSONStorage } from 'zustand/middleware';
import type { PersistOptions, StateStorage } from 'zustand/middleware';

/*
 * Shared persistence setup for the four persisted stores (FD-7, Requirements
 * 44 and 45). This is the only file that touches browser storage.
 *
 * How a persisted store uses it (task 6.2 to 6.4):
 *
 *   export const useXStore = create<XState>()(
 *     persist(
 *       (set) => ({ ..., hydrated: false, storageProblem: 'none' }),
 *       persistOptions<XState, XPersisted>({
 *         name: 'x',
 *         version: 1,
 *         schema: XPersistedSchema,
 *         partialize: (s) => ({ ...only the saved fields }),
 *       }),
 *     ),
 *   );
 *
 * - `skipHydration` is on. The Hydration_Gate calls `useXStore.persist.rehydrate()`
 *   in an effect after mount, then sets `hydrated` (the stores' `markHydrated`).
 * - Nothing is written until that rehydration has finished (Requirement 45.10).
 *   The guard lives here: `setItem` is a no-op while `ready` is false. `ready`
 *   turns false when a rehydration starts and true when it ends, which mirrors
 *   the store's own `persist.hasHydrated()`.
 * - A stored value with another version, invalid JSON or a wrong shape reaches
 *   `merge` as an invalid value, is discarded, and the store gets
 *   `storageProblem: 'unreadable'`.
 */

export const STORE_KEY_PREFIX = 'health-companion';

/** Key of the form `health-companion.<name>.v<version>`. */
export function storeKey(name: string, version: number): string {
  return `${STORE_KEY_PREFIX}.${name}.v${version}`;
}

export type StorageProblem = 'none' | 'unreadable' | 'write-failed';

/** Every persisted store carries this field (not saved). */
export interface StorageProblemState {
  readonly storageProblem: StorageProblem;
}

/** Stand-in version for stored text that is not a valid Zustand envelope. */
const UNREADABLE_VERSION = -1;
const UNREADABLE_ENVELOPE = JSON.stringify({
  state: null,
  version: UNREADABLE_VERSION,
});

/** Value `migrate` returns, so that `merge` sees an invalid value. */
const DISCARDED = Symbol('discarded-stored-state');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function createMemoryStorage(): StateStorage {
  const items = new Map<string, string>();
  return {
    getItem: (name) => items.get(name) ?? null,
    setItem: (name, value) => {
      items.set(name, value);
    },
    removeItem: (name) => {
      items.delete(name);
    },
  };
}

/** Returns `window.localStorage` only when it can be written, else `undefined`. */
function probeLocalStorage(): Storage | undefined {
  try {
    if (typeof window === 'undefined') return undefined;
    const storage = window.localStorage;
    const probeKey = `${STORE_KEY_PREFIX}.probe`;
    storage.setItem(probeKey, '1');
    storage.removeItem(probeKey);
    return storage;
  } catch {
    return undefined;
  }
}

/** Turns text that is not a `{ state, version }` envelope into a version mismatch. */
function readableEnvelope(raw: string | null): string | null {
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isRecord(parsed) && typeof parsed.version === 'number') return raw;
  } catch {
    // Invalid JSON falls through to the unreadable envelope.
  }
  return UNREADABLE_ENVELOPE;
}

export interface SafeStorageOptions {
  /** Writes are ignored while this returns false. Default: always ready. */
  readonly isReady?: () => boolean;
  /** Called when a write fails or storage is unavailable. Not thrown. */
  readonly onWriteFailed?: () => void;
}

/**
 * A Zustand `StateStorage` over `localStorage` that never throws. When storage
 * is missing, blocked or full, values stay in memory and `onWriteFailed` is
 * called once until a write succeeds again.
 */
export function safeStorage(options: SafeStorageOptions = {}): StateStorage {
  const { isReady = () => true, onWriteFailed } = options;
  const real = probeLocalStorage();
  const memory = createMemoryStorage();
  const backing: StateStorage = real ?? memory;
  let failureReported = false;

  const reportFailure = (): void => {
    if (failureReported) return;
    failureReported = true;
    onWriteFailed?.();
  };

  return {
    getItem: (name) => {
      try {
        const raw = backing.getItem(name);
        return readableEnvelope(typeof raw === 'string' ? raw : null);
      } catch {
        return null;
      }
    },
    setItem: (name, value) => {
      if (!isReady()) return;
      memory.setItem(name, value);
      if (real === undefined) {
        reportFailure();
        return;
      }
      try {
        real.setItem(name, value);
        failureReported = false;
      } catch {
        reportFailure();
      }
    },
    removeItem: (name) => {
      memory.removeItem(name);
      try {
        real?.removeItem(name);
      } catch {
        // Nothing to recover: the key is read-only or storage is blocked.
      }
    },
  };
}

type WriteFailureListener = (storeName: string) => void;
const writeFailureListeners = new Set<WriteFailureListener>();

/**
 * Subscribe to write failures of any persisted store. Returns an unsubscribe
 * function. The provider uses it to raise one Notice (Requirement 45.7).
 */
export function onStorageWriteFailed(
  listener: WriteFailureListener,
): () => void {
  writeFailureListeners.add(listener);
  return () => {
    writeFailureListeners.delete(listener);
  };
}

/** Options shared by every persisted store. */
export const basePersistOptions = {
  skipHydration: true,
} satisfies Pick<PersistOptions<unknown>, 'skipHydration'>;

/** `migrate` for any version other than the current one: discard the value. */
export function discardOnVersionMismatch(): unknown {
  return DISCARDED;
}

/**
 * Validated merge. Returns `current` when nothing was stored (`undefined`),
 * `{ ...current, ...parsed }` when the value passes the schema, and
 * `{ ...current, storageProblem: 'unreadable' }` otherwise. Defaults are kept
 * whenever the value is invalid, so a bad value is never half-used.
 */
export function parseStored<S extends StorageProblemState, P extends object>(
  schema: z.ZodType<P>,
  persisted: unknown,
  current: S,
): S {
  if (persisted === undefined) return current;
  if (!isRecord(persisted)) {
    return { ...current, storageProblem: 'unreadable' };
  }
  const result = schema.safeParse(persisted);
  if (!result.success) {
    return { ...current, storageProblem: 'unreadable' };
  }
  return { ...current, ...result.data };
}

export interface PersistOptionsInput<S, P extends object> {
  /** Short store name, for example `'session'`. */
  readonly name: string;
  /** Current schema version. Also the version part of the key. */
  readonly version: number;
  /** Strict Zod schema of the saved fields (`z.strictObject`). */
  readonly schema: z.ZodType<P>;
  /** Picks the saved fields. Never include `hydrated` or `storageProblem`. */
  readonly partialize: (state: S) => P;
}

/**
 * Builds the full `persist` options of one store: versioned key, skipped
 * hydration, partialize, guarded safe storage, discard-on-mismatch migrate and
 * a Zod-validated merge.
 */
export function persistOptions<S extends StorageProblemState, P extends object>(
  input: PersistOptionsInput<S, P>,
): PersistOptions<S, unknown> {
  let ready = false;
  return {
    ...basePersistOptions,
    name: storeKey(input.name, input.version),
    version: input.version,
    partialize: input.partialize,
    storage: createJSONStorage<unknown>(() =>
      safeStorage({
        isReady: () => ready,
        onWriteFailed: () => {
          writeFailureListeners.forEach((listener) => listener(input.name));
        },
      }),
    ),
    migrate: discardOnVersionMismatch,
    merge: (persisted, current) =>
      parseStored(input.schema, persisted, current),
    onRehydrateStorage: () => {
      ready = false;
      return () => {
        ready = true;
      };
    },
  };
}
