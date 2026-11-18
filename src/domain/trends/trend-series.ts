import type { Baseline } from '../baseline/compute-baseline';
import type { DayState, EvaluationResult } from '../evaluate-input';
import type { Catalog } from '../indicators/build-catalog';
import type { DomainError, Result } from '../result';
import type { EngineConfig } from '../schemas/config';
import { MissionDaySchema } from '../schemas/vocabulary';
import type { ComparisonOp, QualityFlag, Reading, Tier } from '../types';
import {
  classificationAtPosition,
  indicatorPosition,
} from './classification-for';

/** One hard-limit reference line of the indicator. */
export interface TrendLimit {
  readonly tier: 'orange' | 'red';
  readonly op: ComparisonOp;
  readonly value: number;
}

/** One Mission_Day of the chart. Optional fields are absent when the data is. */
export interface TrendEntry {
  readonly day: number;
  /** Absent when the astronaut has no reading for the day, so the chart shows a gap. */
  readonly value?: number;
  readonly quality?: QualityFlag;
  /** Read from the classification. `undefined` for `no-data` and for days that were not replayed. */
  readonly tier: Tier | undefined;
  /** Absent when no baseline was available that day. */
  readonly baselineMean?: number;
  readonly bandLower?: number;
  readonly bandUpper?: number;
  readonly baselineSource?: Baseline['source'];
  readonly frozen: boolean;
  readonly floorPending: boolean;
}

export interface TrendSeries {
  readonly indicatorId: string;
  readonly label: string;
  readonly unit: string;
  readonly validRange:
    { readonly min: number; readonly max: number } | undefined;
  /** The multiple of the baseline SD that sets the band edges. */
  readonly yellowSd: number;
  readonly limits: readonly TrendLimit[];
  readonly entries: readonly TrendEntry[];
}

export interface TrendSeriesInput {
  readonly result: EvaluationResult;
  readonly readings: readonly Reading[];
  readonly astronautId: string;
  readonly catalog: Catalog;
  readonly config: EngineConfig;
  readonly indicatorId: string;
  readonly fromDay: number;
  readonly toDay: number;
}

function invalidInput(field: string, message: string): DomainError {
  return { code: 'invalid-input', field, message };
}

/** Same pick as the engine: good quality first, then the lower value. */
function pickReading(candidates: readonly Reading[]): Reading | undefined {
  return candidates.toSorted(
    (a, b) =>
      Number(a.quality === 'poor') - Number(b.quality === 'poor') ||
      a.value - b.value,
  )[0];
}

function baselineOf(
  state: DayState | undefined,
  indicatorId: string,
): Baseline | undefined {
  if (state === undefined || !Object.hasOwn(state.baselines, indicatorId)) {
    return undefined;
  }
  return state.baselines[indicatorId];
}

/**
 * Chart series for one astronaut and indicator, one entry per Mission_Day from
 * `fromDay` to `toDay`. Tiers, baselines and the frozen flag come from the
 * evaluation result; no number is compared with a threshold. Never throws.
 *
 * A day the replay did not cover has no tier, no baseline and `frozen: false`.
 * A reading is shown as recorded, even one the engine ignored as out of range.
 */
export function buildTrendSeries(
  input: TrendSeriesInput,
): Result<TrendSeries, DomainError> {
  const { result, readings, astronautId, catalog, config, indicatorId } = input;
  const { fromDay, toDay } = input;

  if (!MissionDaySchema.safeParse(fromDay).success) {
    return {
      ok: false,
      error: invalidInput(
        'fromDay',
        `Invalid fromDay: ${fromDay} is not a Mission_Day (a whole number, 0 or more).`,
      ),
    };
  }
  if (!MissionDaySchema.safeParse(toDay).success || toDay < fromDay) {
    return {
      ok: false,
      error: invalidInput(
        'toDay',
        `Invalid toDay: ${toDay} is not a Mission_Day on or after fromDay ${fromDay}.`,
      ),
    };
  }

  const position = indicatorPosition(catalog, indicatorId);
  if (!position.ok) {
    return position;
  }
  const definition = catalog.byId.get(indicatorId);
  if (definition === undefined) {
    return {
      ok: false,
      error: {
        code: 'unknown-indicator',
        indicatorId,
        message: `Unknown indicator "${indicatorId}": it is not in the catalog.`,
      },
    };
  }

  const yellowSd =
    definition.deviation?.yellowSd ?? config.deviationDefaults.yellowSd;
  const floorPending = definition.deviation?.minAbsoluteChange === null;

  const statesByDay = new Map<number, DayState>(
    result.history.map((state): [number, DayState] => [state.day, state]),
  );
  const readingsByDay = new Map<number, Reading[]>();
  for (const reading of readings) {
    if (
      reading.astronautId !== astronautId ||
      reading.indicatorId !== indicatorId ||
      reading.day < fromDay ||
      reading.day > toDay
    ) {
      continue;
    }
    readingsByDay.set(reading.day, [
      ...(readingsByDay.get(reading.day) ?? []),
      reading,
    ]);
  }

  const entries: TrendEntry[] = [];
  for (let day = fromDay; day <= toDay; day += 1) {
    const state = statesByDay.get(day);
    let tier: Tier | undefined;
    if (state !== undefined) {
      const classification = classificationAtPosition(
        state,
        position.value,
        indicatorId,
      );
      if (!classification.ok) {
        return classification;
      }
      tier =
        classification.value.status === 'classified'
          ? classification.value.tier
          : undefined;
    }

    const reading = pickReading(readingsByDay.get(day) ?? []);
    const baseline = baselineOf(state, indicatorId);

    entries.push({
      day,
      ...(reading === undefined
        ? {}
        : { value: reading.value, quality: reading.quality }),
      tier,
      ...(baseline === undefined
        ? {}
        : {
            baselineMean: baseline.mean,
            bandLower: baseline.mean - yellowSd * baseline.sd,
            bandUpper: baseline.mean + yellowSd * baseline.sd,
            baselineSource: baseline.source,
          }),
      frozen: state?.frozen ?? false,
      floorPending,
    });
  }

  const limits: readonly TrendLimit[] = [
    ...definition.hardLimits.orange.map((limit): TrendLimit => ({
      tier: 'orange',
      op: limit.op,
      value: limit.value,
    })),
    ...definition.hardLimits.red.map((limit): TrendLimit => ({
      tier: 'red',
      op: limit.op,
      value: limit.value,
    })),
  ];

  return {
    ok: true,
    value: {
      indicatorId,
      label: definition.label,
      unit: definition.unit,
      validRange: definition.validRange,
      yellowSd,
      limits,
      entries,
    },
  };
}
