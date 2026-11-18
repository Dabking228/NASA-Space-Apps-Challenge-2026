import type { Reading, SymptomReport } from '../types';
import type { ReadingEntry, SymptomEntry } from './entry-schema';

export interface ApplyEntriesInput {
  /** The run's readings. Any astronaut may appear; only `astronautId` is touched. */
  readonly readings: readonly Reading[];
  readonly symptoms: readonly SymptomReport[];
  /** The session calls the helper once per astronaut with that astronaut's records. */
  readonly astronautId: string;
  readonly scenarioId: string;
  readonly readingEntries: readonly ReadingEntry[];
  readonly symptomEntries: readonly SymptomEntry[];
}

export interface ApplyEntriesResult {
  readonly readings: readonly Reading[];
  readonly symptoms: readonly SymptomReport[];
}

// JSON of a tuple cannot collide, whatever characters the ids hold.
function readingKey(
  astronautId: string,
  day: number,
  indicatorId: string,
): string {
  return JSON.stringify([astronautId, day, indicatorId]);
}

function symptomKey(astronautId: string, day: number, kind: string): string {
  return JSON.stringify([astronautId, day, kind]);
}

/**
 * Overlays saved check-in entries on a run's readings and symptom reports.
 *
 * - Entries of another scenario or another astronaut are ignored.
 * - A reading with the same astronaut, day and indicator takes the entry value
 *   and quality, in place. If the input holds several readings for one key, the
 *   first is replaced and the others are dropped, so one reading per key remains.
 * - An entry with no matching reading is appended as a new reading.
 * - Two entries with the same key: the later one wins and the key keeps the
 *   position of its first entry.
 * - A symptom entry is appended unless an equal report (astronaut, day, kind)
 *   exists in the input or earlier in the entries.
 *
 * Order: the input order is kept. Added readings and symptoms follow in the order
 * of their entries. Both lists are new arrays, the inputs are never mutated, and
 * applying the same entries to the result gives the same result (idempotence).
 */
export function applyEntries(input: ApplyEntriesInput): ApplyEntriesResult {
  const { readings, symptoms, astronautId, scenarioId } = input;

  const replacements = new Map<string, Reading>();
  for (const entry of input.readingEntries) {
    if (entry.scenarioId !== scenarioId || entry.astronautId !== astronautId) {
      continue;
    }
    replacements.set(
      readingKey(entry.astronautId, entry.day, entry.indicatorId),
      {
        astronautId: entry.astronautId,
        indicatorId: entry.indicatorId,
        day: entry.day,
        value: entry.value,
        quality: entry.quality,
      },
    );
  }

  const placed = new Set<string>();
  const nextReadings: Reading[] = [];
  for (const reading of readings) {
    const key = readingKey(
      reading.astronautId,
      reading.day,
      reading.indicatorId,
    );
    const replacement = replacements.get(key);
    if (replacement === undefined) {
      nextReadings.push(reading);
    } else if (!placed.has(key)) {
      placed.add(key);
      nextReadings.push(replacement);
    }
  }
  for (const [key, replacement] of replacements) {
    if (!placed.has(key)) {
      nextReadings.push(replacement);
    }
  }

  const known = new Set<string>(
    symptoms.map((report) =>
      symptomKey(report.astronautId, report.day, report.kind),
    ),
  );
  const nextSymptoms: SymptomReport[] = [...symptoms];
  for (const entry of input.symptomEntries) {
    if (entry.scenarioId !== scenarioId || entry.astronautId !== astronautId) {
      continue;
    }
    const key = symptomKey(entry.astronautId, entry.day, entry.kind);
    if (known.has(key)) {
      continue;
    }
    known.add(key);
    nextSymptoms.push({
      astronautId: entry.astronautId,
      day: entry.day,
      kind: entry.kind,
    });
  }

  return { readings: nextReadings, symptoms: nextSymptoms };
}
