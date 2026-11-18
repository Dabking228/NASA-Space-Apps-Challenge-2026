import type { ScenarioEvent } from '@/simulation/events/event-schemas';

type Keyed = {
  readonly event: ScenarioEvent;
  readonly canonical: string;
};

// Plain `<` and `>` on strings compare UTF-16 code units, so the order does not depend on the locale.
function compareStrings(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** JSON text of a plain value with object keys in sorted order. Keys holding `undefined` are left out, as `JSON.stringify` does. */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    const items: readonly unknown[] = value;
    return `[${items.map((item) => canonicalJson(item)).join(',')}]`;
  }
  if (typeof value === 'object' && value !== null) {
    const entries: (readonly [string, unknown])[] = Object.entries(
      value,
    ).filter((entry) => entry[1] !== undefined);
    entries.sort((a, b) => compareStrings(a[0], b[0]));
    const parts = entries.map(
      ([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`,
    );
    return `{${parts.join(',')}}`;
  }
  return JSON.stringify(value);
}

function compareKeyed(a: Keyed, b: Keyed): number {
  if (a.event.day !== b.event.day) return a.event.day < b.event.day ? -1 : 1;
  const byType = compareStrings(a.event.type, b.event.type);
  if (byType !== 0) return byType;
  return compareStrings(a.canonical, b.canonical);
}

/**
 * Returns a sorted copy of the events: by day, then type, then canonical JSON string.
 * Effects are summed and multiplied in this order, so the list order of a scenario never changes a value.
 */
export function canonicalEventOrder(
  events: readonly ScenarioEvent[],
): readonly ScenarioEvent[] {
  const keyed: Keyed[] = events.map((event) => ({
    event,
    canonical: canonicalJson(event),
  }));
  keyed.sort(compareKeyed);
  return keyed.map((entry) => entry.event);
}
