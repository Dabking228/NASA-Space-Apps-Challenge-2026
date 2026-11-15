import { computeBaseline } from './baseline/compute-baseline';
import type { Baseline } from './baseline/compute-baseline';
import type {
  DayState,
  EvaluationInput,
  EvaluationResult,
} from './evaluate-input';
import { prepareInput } from './evaluate-input';
import type { DomainError } from './result';
import { aggregateBodySystems } from './rules/body-systems';
import type {
  BaseClassification,
  Classification,
} from './rules/classification-types';
import { classifyBase } from './rules/classify-base';
import { detectClusters } from './rules/clusters';
import { applyPersistence } from './rules/persistence';
import { buildFindingsReport } from './rules/findings';
import type { PersistenceConfig } from './schemas/config';
import { MissionDaySchema } from './schemas/vocabulary';
import { compareTiers } from './tiers';
import type {
  AlertReport,
  ClusterDefinition,
  ClusterMember,
  IndicatorDefinition,
  Reading,
  SafetyFlag,
  SymptomReport,
  Tier,
} from './types';

/** The base tier of an earlier day, or `no-data`. Input of `applyPersistence`. */
type EarlierBaseTier = Tier | 'no-data';

/** One replayed day plus the lookup that the cluster detector reads. */
interface ReplayDay {
  readonly state: DayState;
  readonly byIndicator: ReadonlyMap<string, Classification>;
}

interface Replay {
  readonly days: readonly ReplayDay[];
  readonly errors: readonly DomainError[];
}

/** Values the replay reads and never changes. */
interface ReplayContext {
  readonly input: EvaluationInput;
  /** Sorted by id. Every per-day classification list follows this order. */
  readonly definitions: readonly IndicatorDefinition[];
  readonly seeds: ReadonlyMap<string, readonly number[]>;
  readonly readingsByDay: ReadonlyMap<number, readonly Reading[]>;
  /** Ids of indicators that have at least one reading in the replay. */
  readonly replayedIds: ReadonlySet<string>;
  /** Prepared records: this astronaut only, up to `asOfDay`, sorted copies. */
  readonly symptoms: readonly SymptomReport[];
  readonly safetyFlags: readonly SafetyFlag[];
  readonly alerts: readonly AlertReport[];
  readonly startDay: number;
}

function compareStrings(a: string, b: string): number {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

function compareDefinitions(
  a: IndicatorDefinition,
  b: IndicatorDefinition,
): number {
  return compareStrings(a.id, b.id);
}

// ---------------------------------------------------------------------------
// Input handling
// ---------------------------------------------------------------------------

/**
 * `startDay` when it is a Mission_Day on or before `asOfDay`, else the earliest
 * reading day (or `asOfDay` when there is no reading). An unusable `startDay` is
 * reported and replaced.
 */
function resolveStartDay(
  input: EvaluationInput,
  readings: readonly Reading[],
): { readonly startDay: number; readonly errors: readonly DomainError[] } {
  // Every prepared reading is dated on or before `asOfDay`.
  const earliest = readings.reduce<number>(
    (min, reading) => Math.min(min, reading.day),
    input.asOfDay,
  );
  const { startDay } = input;
  if (startDay === undefined) {
    return { startDay: earliest, errors: [] };
  }
  if (
    MissionDaySchema.safeParse(startDay).success &&
    startDay <= input.asOfDay
  ) {
    return { startDay, errors: [] };
  }
  return {
    startDay: earliest,
    errors: [
      {
        code: 'invalid-input',
        field: 'startDay',
        message: `Invalid startDay: ${startDay} is not a Mission_Day on or before asOfDay ${input.asOfDay}. The replay starts on day ${earliest} instead.`,
      },
    ],
  };
}

/** Seed values by indicator id. A non-finite value is reported and left out. */
function cleanSeeds(seeds: EvaluationInput['seeds']): {
  readonly seeds: ReadonlyMap<string, readonly number[]>;
  readonly errors: readonly DomainError[];
} {
  const cleaned = Object.entries(seeds).map(
    ([indicatorId, values]): [string, readonly number[]] => [
      indicatorId,
      values.filter((value) => Number.isFinite(value)),
    ],
  );
  const errors = Object.entries(seeds).flatMap(
    ([indicatorId, values]): DomainError[] => {
      const dropped = values.filter((value) => !Number.isFinite(value)).length;
      return dropped === 0
        ? []
        : [
            {
              code: 'invalid-input',
              field: `seeds.${indicatorId}`,
              message: `Invalid seeds.${indicatorId}: ${dropped} value(s) are not finite numbers and were ignored.`,
            },
          ];
    },
  );
  return { seeds: new Map(cleaned), errors };
}

function groupByDay(
  readings: readonly Reading[],
): ReadonlyMap<number, readonly Reading[]> {
  const groups = new Map<number, Reading[]>();
  for (const reading of readings) {
    groups.set(reading.day, [...(groups.get(reading.day) ?? []), reading]);
  }
  return groups;
}

/** Sorted by code, then message, without repeats, so the order never depends on the input order. */
function normaliseErrors(
  errors: readonly DomainError[],
): readonly DomainError[] {
  const unique = new Map(
    errors.map((error): [string, DomainError] => [
      `${error.code}\u0000${error.message}`,
      error,
    ]),
  );
  return Array.from(unique.values()).toSorted(
    (a, b) =>
      compareStrings(a.code, b.code) || compareStrings(a.message, b.message),
  );
}

// ---------------------------------------------------------------------------
// Baselines
// ---------------------------------------------------------------------------

function memberNeedsBaseline(
  member: ClusterMember,
  indicatorId: string,
): boolean {
  switch (member.kind) {
    case 'indicator':
      return member.indicatorId === indicatorId && member.direction !== 'any';
    case 'baseline-relative':
      return member.indicatorId === indicatorId;
    case 'symptom':
      return false;
    default: {
      const unreachable: never = member;
      return unreachable;
    }
  }
}

/** Whether a missing baseline limits the indicator or a cluster that reads it. */
function needsBaseline(
  definition: IndicatorDefinition,
  clusters: readonly ClusterDefinition[],
): boolean {
  return (
    definition.deviation !== undefined ||
    definition.sequenceRules.some(
      (rule) => rule.condition.kind === 'baseline-relative',
    ) ||
    clusters.some((cluster) =>
      [...cluster.members, ...cluster.supporting].some((member) =>
        memberNeedsBaseline(member, definition.id),
      ),
    )
  );
}

/**
 * Baselines as of `day - 1` from the accepted readings, which never include a
 * reading of `day` (Property 11). The seed gives the first baselines. A baseline
 * that cannot be built is left out. It is reported only when it is needed and
 * the indicator has readings.
 */
function baselinesBefore(
  day: number,
  ctx: ReplayContext,
  accepted: ReadonlyMap<string, readonly Reading[]>,
): {
  readonly baselines: ReadonlyMap<string, Baseline>;
  readonly errors: readonly DomainError[];
} {
  const { input, definitions, seeds, replayedIds } = ctx;
  const baselines = new Map<string, Baseline>();
  const errors: DomainError[] = [];
  for (const definition of definitions) {
    const result = computeBaseline({
      astronautId: input.astronautId,
      indicatorId: definition.id,
      seed: seeds.get(definition.id) ?? [],
      accepted: accepted.get(definition.id) ?? [],
      asOfDay: day - 1,
      config: input.config.baseline,
    });
    if (result.ok) {
      baselines.set(definition.id, result.value);
    } else if (
      replayedIds.has(definition.id) &&
      needsBaseline(definition, input.clusters)
    ) {
      errors.push(result.error);
    }
  }
  return { baselines, errors };
}

// ---------------------------------------------------------------------------
// Classification of one day
// ---------------------------------------------------------------------------

/** Raises a classified base tier by persistence. `no-data` has no tier to raise. */
function withPersistence(
  base: BaseClassification,
  earlier: readonly EarlierBaseTier[],
  config: PersistenceConfig,
): Classification {
  if (base.status === 'no-data') {
    return base;
  }
  const tier = applyPersistence(base.baseTier, earlier, config);
  return { ...base, tier, persistenceApplied: tier !== base.baseTier };
}

/**
 * Base tiers one `periodDays` apart, newest first (TD-20). A day before the
 * replay or without a record counts as `no-data`, which breaks the chain.
 */
function earlierBaseTiers(
  definition: IndicatorDefinition,
  day: number,
  recorded: ReadonlyMap<number, EarlierBaseTier> | undefined,
  config: PersistenceConfig,
): readonly EarlierBaseTier[] {
  return Array.from(
    { length: config.consecutivePeriods - 1 },
    (_, index): EarlierBaseTier =>
      recorded?.get(day - (index + 1) * definition.periodDays) ?? 'no-data',
  );
}

// ---------------------------------------------------------------------------
// Replay
// ---------------------------------------------------------------------------

/**
 * Day-by-day replay from `startDay` to `asOfDay`. It must replay because the
 * baseline freeze depends on earlier tiers and persistence on earlier base tiers.
 *
 * Per day: hold the previous baselines when the previous day was frozen, else
 * compute them as of `day - 1` (Properties 11 and 12); classify each indicator;
 * apply persistence; freeze when any final tier is at or above
 * `config.freeze.atOrAbove`. A reading joins the accepted list only after its own
 * day is classified, and only when its quality is good and the day is not frozen.
 */
function replay(ctx: ReplayContext): Replay {
  const { input, definitions, readingsByDay, startDay } = ctx;
  const { config, environment, careerDoseBeforeMissionMsv } = input;

  const history = new Map<string, Map<number, Reading>>(
    definitions.map((definition): [string, Map<number, Reading>] => [
      definition.id,
      new Map(),
    ]),
  );
  const accepted = new Map<string, Reading[]>(
    definitions.map((definition): [string, Reading[]] => [definition.id, []]),
  );
  const baseTiers = new Map<string, Map<number, EarlierBaseTier>>(
    definitions.map((definition): [string, Map<number, EarlierBaseTier>] => [
      definition.id,
      new Map(),
    ]),
  );

  const days: ReplayDay[] = [];
  const errors: DomainError[] = [];
  let baselines: ReadonlyMap<string, Baseline> = new Map();
  let previousFrozen = false;

  for (let day = startDay; day <= input.asOfDay; day += 1) {
    const todaysReadings = readingsByDay.get(day) ?? [];
    for (const reading of todaysReadings) {
      history.get(reading.indicatorId)?.set(day, reading);
    }

    if (!previousFrozen) {
      const computed = baselinesBefore(day, ctx, accepted);
      baselines = computed.baselines;
      errors.push(...computed.errors);
    }

    const symptomsToday = ctx.symptoms.filter((report) => report.day === day);
    const safetyFlagToday = ctx.safetyFlags.some((flag) => flag.day === day);
    const alertsActive = ctx.alerts
      .filter((alert) => alert.startDay <= day && day <= alert.endDay)
      .map((alert) => alert.kind);

    const byIndicator = new Map<string, Classification>();
    for (const definition of definitions) {
      const base = classifyBase({
        definition,
        day,
        history: history.get(definition.id) ?? new Map(),
        baseline: baselines.get(definition.id),
        symptomsToday,
        safetyFlagToday,
        environment,
        careerDoseBeforeMissionMsv,
        alertsActive,
        config,
      });

      const recorded = baseTiers.get(definition.id);
      if (!base.ok) {
        // The indicator cannot be classified today. `no-data` is the safe status.
        errors.push(base.error);
        recorded?.set(day, 'no-data');
        byIndicator.set(definition.id, {
          status: 'no-data',
          missingPeriods: [day],
        });
        continue;
      }
      recorded?.set(
        day,
        base.value.status === 'no-data' ? 'no-data' : base.value.baseTier,
      );
      byIndicator.set(
        definition.id,
        withPersistence(
          base.value,
          earlierBaseTiers(definition, day, recorded, config.persistence),
          config.persistence,
        ),
      );
    }

    const classifications = definitions.flatMap((definition) => {
      const classification = byIndicator.get(definition.id);
      return classification === undefined ? [] : [classification];
    });
    const frozen = classifications.some(
      (classification) =>
        classification.status === 'classified' &&
        compareTiers(classification.tier, config.freeze.atOrAbove) >= 0,
    );

    if (!frozen) {
      for (const reading of todaysReadings) {
        if (reading.quality === 'good') {
          accepted.get(reading.indicatorId)?.push(reading);
        }
      }
    }

    days.push({
      state: {
        day,
        baselines: Object.fromEntries(baselines),
        frozen,
        classifications,
      },
      byIndicator,
    });
    previousFrozen = frozen;
  }

  return { days, errors };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Evaluates one astronaut as of `asOfDay`.
 *
 * Reads only its argument and the data passed in: no clock, no `src/data/`
 * import, no module state, no mutation of the input and no throw. Every list is
 * a sorted copy made by `prepareInput`, so the order of the input lists never
 * changes the result (Properties 2, 13 and 25).
 *
 * - Records of other astronauts and records after `asOfDay` are ignored.
 * - The replay starts on `startDay`, by default the earliest reading day, else
 *   `asOfDay`. Readings dated before an explicit `startDay` are not used.
 * - `classifications` and each `DayState.classifications` have one entry per
 *   catalog indicator, ordered by indicator id. A `no-data` entry carries no id,
 *   so its position gives the indicator.
 * - `findings` are ordered by id and `bodySystems` follow `BODY_SYSTEM_ORDER`.
 * - `errors` holds every problem met (input, baseline, classification and
 *   finding text), sorted and without repeats. A `baseline-unavailable` error
 *   does not stop hard-limit or sequence evaluation.
 * - An `asOfDay` that is not a Mission_Day gives an empty evaluation and an
 *   `invalid-input` error.
 */
export function evaluateAstronaut(input: EvaluationInput): EvaluationResult {
  const prepared = prepareInput(input);

  if (!MissionDaySchema.safeParse(input.asOfDay).success) {
    return {
      asOfDay: input.asOfDay,
      classifications: [],
      findings: [],
      bodySystems: aggregateBodySystems(input.catalog, [], []),
      history: [],
      errors: normaliseErrors(prepared.errors),
    };
  }

  const start = resolveStartDay(input, prepared.readings);
  const seeds = cleanSeeds(input.seeds);
  const readings = prepared.readings.filter(
    (reading) => reading.day >= start.startDay,
  );

  const replayed = replay({
    input,
    definitions: input.catalog.indicators.toSorted(compareDefinitions),
    seeds: seeds.seeds,
    readingsByDay: groupByDay(readings),
    replayedIds: new Set(readings.map((reading) => reading.indicatorId)),
    symptoms: prepared.symptoms,
    safetyFlags: prepared.safetyFlags,
    alerts: prepared.alerts,
    startDay: start.startDay,
  });

  const classifications = replayed.days.at(-1)?.state.classifications ?? [];
  const detections = detectClusters(
    input.clusters,
    replayed.days.map((entry) => ({
      day: entry.state.day,
      byIndicator: entry.byIndicator,
    })),
    prepared.symptoms,
    input.asOfDay,
  );
  const report = buildFindingsReport({
    catalog: input.catalog,
    text: input.text,
    config: input.config,
    classifications,
    detections,
    asOfDay: input.asOfDay,
  });

  return {
    asOfDay: input.asOfDay,
    classifications,
    findings: report.findings,
    bodySystems: aggregateBodySystems(
      input.catalog,
      classifications,
      report.findings,
    ),
    history: replayed.days.map((entry) => entry.state),
    errors: normaliseErrors([
      ...prepared.errors,
      ...start.errors,
      ...seeds.errors,
      ...replayed.errors,
      ...report.errors,
    ]),
  };
}
