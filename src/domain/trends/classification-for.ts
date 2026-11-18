import type { Catalog } from '../indicators/build-catalog';
import type { DayState, EvaluationResult } from '../evaluate-input';
import type { DomainError, Result } from '../result';
import type { Classification } from '../rules/classification-types';

/** An `EvaluationResult` or one `DayState` of its history: both hold the id-ordered list. */
export interface ClassificationSource {
  readonly classifications: readonly Classification[];
}

/**
 * Position of the indicator among the catalog indicators sorted by id, which is
 * the order of every classification list. A `no-data` entry has no id, so this
 * position is the only key. An unknown id is returned as a problem.
 */
export function indicatorPosition(
  catalog: Catalog,
  indicatorId: string,
): Result<number, DomainError> {
  const position = catalog.indicators
    .map((definition) => definition.id)
    .toSorted((a, b) => {
      if (a < b) return -1;
      return a > b ? 1 : 0;
    })
    .indexOf(indicatorId);
  if (position < 0) {
    return {
      ok: false,
      error: {
        code: 'unknown-indicator',
        indicatorId,
        message: `Unknown indicator "${indicatorId}": it is not in the catalog.`,
      },
    };
  }
  return { ok: true, value: position };
}

/** The entry at `position`, or an `invalid-input` problem when the list is too short. */
export function classificationAtPosition(
  source: ClassificationSource,
  position: number,
  indicatorId: string,
): Result<Classification, DomainError> {
  const classification = source.classifications[position];
  if (classification === undefined) {
    return {
      ok: false,
      error: {
        code: 'invalid-input',
        field: 'classifications',
        message: `No classification for indicator "${indicatorId}": the list has ${source.classifications.length} entries and position ${position} is needed.`,
      },
    };
  }
  return { ok: true, value: classification };
}

/** The classification of one indicator in an evaluation result or in one day state. */
export function classificationFor(
  source: ClassificationSource,
  catalog: Catalog,
  indicatorId: string,
): Result<Classification, DomainError> {
  const position = indicatorPosition(catalog, indicatorId);
  if (!position.ok) {
    return position;
  }
  return classificationAtPosition(source, position.value, indicatorId);
}

/** The state the replay recorded for `day`, or `undefined` when the day was not replayed. */
export function dayStateFor(
  result: EvaluationResult,
  day: number,
): DayState | undefined {
  return result.history.find((state) => state.day === day);
}

/** The id-ordered classification list of `day`, or `undefined` when the day was not replayed. */
export function classificationsForDay(
  result: EvaluationResult,
  day: number,
): readonly Classification[] | undefined {
  return dayStateFor(result, day)?.classifications;
}
