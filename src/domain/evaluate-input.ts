import type { z } from 'zod';
import type { Baseline } from './baseline/compute-baseline';
import type { Catalog } from './indicators/build-catalog';
import type { Classification } from './rules/classification-types';
import type { SystemStatus } from './rules/body-systems';
import type { FindingText } from './rules/text';
import {
  AlertReportSchema,
  ReadingSchema,
  SafetyFlagSchema,
  SymptomReportSchema,
} from './schemas/reading';
import { MissionDaySchema } from './schemas/vocabulary';
import type {
  AlertReport,
  ClusterDefinition,
  DomainError,
  EngineConfig,
  EnvironmentProfile,
  Finding,
  QualityFlag,
  Reading,
  SafetyFlag,
  SymptomReport,
} from './types';

/** Everything `evaluateAstronaut` reads. Data files supply `catalog`, `clusters`, `config` and `text`. */
export interface EvaluationInput {
  readonly astronautId: string;
  readonly asOfDay: number;
  /** Default: earliest reading day, else `asOfDay`. */
  readonly startDay?: number;
  /** Pre-flight values by indicator id. */
  readonly seeds: Readonly<Record<string, readonly number[]>>;
  readonly readings: readonly Reading[];
  readonly symptoms: readonly SymptomReport[];
  readonly safetyFlags: readonly SafetyFlag[];
  readonly alerts: readonly AlertReport[];
  readonly careerDoseBeforeMissionMsv: number;
  readonly environment: EnvironmentProfile;
  readonly catalog: Catalog;
  readonly clusters: readonly ClusterDefinition[];
  readonly config: EngineConfig;
  readonly text: FindingText;
}

/** The state of one replayed Mission_Day. */
export interface DayState {
  readonly day: number;
  readonly baselines: Readonly<Record<string, Baseline>>;
  readonly frozen: boolean;
  readonly classifications: readonly Classification[];
}

export interface EvaluationResult {
  readonly asOfDay: number;
  /** As of `asOfDay`. */
  readonly classifications: readonly Classification[];
  readonly findings: readonly Finding[];
  readonly bodySystems: readonly SystemStatus[];
  /** Explains every baseline and tier. */
  readonly history: readonly DayState[];
  readonly errors: readonly DomainError[];
}

/** The fields `prepareInput` reads. An `EvaluationInput` satisfies it. */
export type PrepareSource = Pick<
  EvaluationInput,
  | 'astronautId'
  | 'asOfDay'
  | 'readings'
  | 'symptoms'
  | 'safetyFlags'
  | 'alerts'
  | 'catalog'
>;

/**
 * Validated, de-duplicated records for the replay, each list a sorted copy.
 * Readings are for the evaluated astronaut, on or before `asOfDay`, with a known
 * indicator and a value inside its `validRange`, at most one per indicator and day.
 */
export interface PreparedInput {
  readonly readings: readonly Reading[];
  readonly symptoms: readonly SymptomReport[];
  readonly safetyFlags: readonly SafetyFlag[];
  readonly alerts: readonly AlertReport[];
  /** Sorted by code, then message, so the order never depends on the input order. */
  readonly errors: readonly DomainError[];
}

// Fields read from a record before it is validated. Used to drop records that are
// not for this evaluation without reporting them, and to describe invalid ones.
type PeekKey = 'astronautId' | 'indicatorId' | 'kind' | 'day' | 'startDay';

const DESCRIBE_KEYS: readonly PeekKey[] = [
  'indicatorId',
  'kind',
  'day',
  'startDay',
];

function peek(record: unknown, key: PeekKey): unknown {
  if (typeof record !== 'object' || record === null) {
    return undefined;
  }
  switch (key) {
    case 'astronautId':
      return 'astronautId' in record ? record.astronautId : undefined;
    case 'indicatorId':
      return 'indicatorId' in record ? record.indicatorId : undefined;
    case 'kind':
      return 'kind' in record ? record.kind : undefined;
    case 'day':
      return 'day' in record ? record.day : undefined;
    case 'startDay':
      return 'startDay' in record ? record.startDay : undefined;
    default: {
      const unhandled: never = key;
      return unhandled;
    }
  }
}

function describeRecord(record: unknown): string {
  const parts = DESCRIBE_KEYS.flatMap((key) => {
    const value = peek(record, key);
    return typeof value === 'string' || typeof value === 'number'
      ? [`${key} ${String(value)}`]
      : [];
  });
  return parts.length > 0 ? parts.join(', ') : 'unidentified record';
}

function compareStrings(a: string, b: string): number {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

// Good quality sorts before poor quality (TD-24).
const QUALITY_RANK = { good: 0, poor: 1 } satisfies Record<QualityFlag, number>;

/** Total order: day, indicator id, quality (good first), value. */
function compareReadings(a: Reading, b: Reading): number {
  return (
    a.day - b.day ||
    compareStrings(a.indicatorId, b.indicatorId) ||
    QUALITY_RANK[a.quality] - QUALITY_RANK[b.quality] ||
    a.value - b.value
  );
}

/** Total order: day, kind. */
function compareSymptoms(a: SymptomReport, b: SymptomReport): number {
  return a.day - b.day || compareStrings(a.kind, b.kind);
}

function compareSafetyFlags(a: SafetyFlag, b: SafetyFlag): number {
  return a.day - b.day;
}

/** Total order: start day, end day. */
function compareAlerts(a: AlertReport, b: AlertReport): number {
  return a.startDay - b.startDay || a.endDay - b.endDay;
}

function compareErrors(a: DomainError, b: DomainError): number {
  return compareStrings(a.code, b.code) || compareStrings(a.message, b.message);
}

interface Parsed<T> {
  readonly records: readonly T[];
  readonly errors: readonly DomainError[];
}

/**
 * Keeps records that pass `isRelevant`, then validates them with `safeParse`.
 * The parsed value is a new object. Each Zod issue becomes one `invalid-input`
 * error that names the field and describes the record without using its position,
 * so the errors do not depend on the input order.
 */
function parseRecords<T>(
  raw: readonly unknown[],
  schema: z.ZodType<T>,
  field: string,
  isRelevant: (record: unknown) => boolean,
): Parsed<T> {
  const records: T[] = [];
  const errors: DomainError[] = [];
  for (const record of raw) {
    if (!isRelevant(record)) {
      continue;
    }
    const parsed = schema.safeParse(record);
    if (parsed.success) {
      records.push(parsed.data);
      continue;
    }
    for (const issue of parsed.error.issues) {
      const path = issue.path.map(String).join('.');
      const name = path === '' ? field : `${field}.${path}`;
      errors.push({
        code: 'invalid-input',
        field: name,
        message: `Invalid ${name} (${describeRecord(record)}): ${issue.message}`,
      });
    }
  }
  return { records, errors };
}

/** Drops readings with an unknown indicator or a value outside `validRange`. */
function checkReadings(
  readings: readonly Reading[],
  catalog: Catalog,
): Parsed<Reading> {
  const records: Reading[] = [];
  const errors: DomainError[] = [];
  for (const reading of readings) {
    const definition = catalog.byId.get(reading.indicatorId);
    if (definition === undefined) {
      errors.push({
        code: 'unknown-indicator',
        indicatorId: reading.indicatorId,
        message: `Unknown indicator "${reading.indicatorId}": the reading on day ${reading.day} was ignored.`,
      });
      continue;
    }
    const range = definition.validRange;
    if (
      range !== undefined &&
      (reading.value < range.min || reading.value > range.max)
    ) {
      errors.push({
        code: 'value-out-of-range',
        indicatorId: reading.indicatorId,
        day: reading.day,
        message: `Reading ${reading.value} for indicator "${reading.indicatorId}" on day ${reading.day} is outside the valid range ${range.min} to ${range.max} and was ignored.`,
      });
      continue;
    }
    records.push(reading);
  }
  return { records, errors };
}

/**
 * Keeps one reading per indicator and day (TD-24). The input is sorted by
 * `compareReadings`, so the first reading of each group is the one with good
 * quality first, then the lower value.
 */
function dedupeReadings(sorted: readonly Reading[]): Parsed<Reading> {
  const groups = new Map<string, { best: Reading; count: number }>();
  for (const reading of sorted) {
    const key = `${reading.day}:${reading.indicatorId}`;
    const group = groups.get(key);
    if (group === undefined) {
      groups.set(key, { best: reading, count: 1 });
    } else {
      groups.set(key, { best: group.best, count: group.count + 1 });
    }
  }
  const records: Reading[] = [];
  const errors: DomainError[] = [];
  for (const { best, count } of groups.values()) {
    records.push(best);
    if (count > 1) {
      errors.push({
        code: 'duplicate-reading',
        astronautId: best.astronautId,
        indicatorId: best.indicatorId,
        day: best.day,
        message: `Astronaut "${best.astronautId}" has ${count} readings for indicator "${best.indicatorId}" on day ${best.day}. Kept the ${best.quality} quality reading with value ${best.value}.`,
      });
    }
  }
  return { records, errors };
}

/**
 * Prepares the records for the day-by-day replay (Properties 2, 13 and 25).
 *
 * - Records of other astronauts and records dated after `asOfDay` are dropped
 *   silently, before validation, so they cannot add an error. An alert has no
 *   astronaut, so only its start day is checked.
 * - Each record is checked with `safeParse`; a failure is an `invalid-input` error.
 * - A reading with an unknown indicator id (`unknown-indicator`) or a value outside
 *   the indicator's `validRange` (`value-out-of-range`) is reported and ignored.
 * - Several readings for one indicator and day are reported (`duplicate-reading`)
 *   and one is kept: good quality first, then the lower value (TD-24).
 * - Every list is a new sorted copy. The arguments are never modified, never sorted
 *   in place, and the result does not depend on the order of the input lists.
 *
 * An `asOfDay` that is not a Mission_Day is reported as `invalid-input` and no record
 * is kept. Never throws.
 */
export function prepareInput(source: PrepareSource): PreparedInput {
  const { astronautId, asOfDay } = source;

  if (!MissionDaySchema.safeParse(asOfDay).success) {
    return {
      readings: [],
      symptoms: [],
      safetyFlags: [],
      alerts: [],
      errors: [
        {
          code: 'invalid-input',
          field: 'asOfDay',
          message: `Invalid asOfDay: ${asOfDay} is not a Mission_Day (a whole number, 0 or more). No record was used.`,
        },
      ],
    };
  }

  const forAstronaut = (dayKey: 'day' | 'startDay') => {
    return (record: unknown): boolean => {
      const owner = peek(record, 'astronautId');
      if (typeof owner === 'string' && owner !== astronautId) {
        return false;
      }
      const day = peek(record, dayKey);
      return !(typeof day === 'number' && day > asOfDay);
    };
  };
  const isRelevant = forAstronaut('day');

  const readings = parseRecords(
    source.readings,
    ReadingSchema,
    'readings',
    isRelevant,
  );
  const checked = checkReadings(readings.records, source.catalog);
  const deduped = dedupeReadings(checked.records.toSorted(compareReadings));
  const symptoms = parseRecords(
    source.symptoms,
    SymptomReportSchema,
    'symptoms',
    isRelevant,
  );
  const safetyFlags = parseRecords(
    source.safetyFlags,
    SafetyFlagSchema,
    'safetyFlags',
    isRelevant,
  );
  const alerts = parseRecords(
    source.alerts,
    AlertReportSchema,
    'alerts',
    forAstronaut('startDay'),
  );

  return {
    readings: deduped.records,
    symptoms: symptoms.records.toSorted(compareSymptoms),
    safetyFlags: safetyFlags.records.toSorted(compareSafetyFlags),
    alerts: alerts.records.toSorted(compareAlerts),
    errors: [
      ...readings.errors,
      ...checked.errors,
      ...deduped.errors,
      ...symptoms.errors,
      ...safetyFlags.errors,
      ...alerts.errors,
    ].toSorted(compareErrors),
  };
}
