import type { EvaluationResult } from '../evaluate-input';
import type { Catalog } from '../indicators/build-catalog';
import type { DomainError } from '../result';
import type { Classification } from '../rules/classification-types';
import type { Finding, Tier } from '../types';
import { classificationFor } from '../trends/classification-for';

/** The Tier of one indicator before and after saving. */
export interface IndicatorTierChange {
  readonly indicatorId: string;
  /** `undefined` for `no-data`. */
  readonly before: Tier | undefined;
  /** `undefined` for `no-data`. */
  readonly after: Tier | undefined;
  /** True when `before` and `after` differ, including a change to or from `no-data`. */
  readonly changed: boolean;
}

export interface EvaluationComparison {
  /** One entry per catalog indicator, sorted by indicator id. */
  readonly indicators: readonly IndicatorTierChange[];
  /** Findings whose id is in `after` only, in the order of `after`. */
  readonly newFindings: readonly Finding[];
  /** Findings whose id is in `before` only, in the order of `before`. */
  readonly removedFindings: readonly Finding[];
  /** Indicators that could not be compared are left out of `indicators` and named here. */
  readonly problems: readonly DomainError[];
}

function compareStrings(a: string, b: string): number {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

function tierOf(classification: Classification): Tier | undefined {
  return classification.status === 'no-data' ? undefined : classification.tier;
}

/**
 * Compares two evaluations of the same Mission_Day, one before and one after the
 * saved entries were applied.
 *
 * - Each catalog indicator gets its Tier before and after, read from the
 *   classification lists with `classificationFor`. `no-data` is `undefined`.
 * - `newFindings` and `removedFindings` are matched by finding id, so they never
 *   share an id. A finding whose id is on both sides is in neither list, even if its
 *   text or Tier changed (the Tier change shows in `indicators` for indicator findings).
 * - Comparing a result with itself gives no change, no new and no removed finding.
 * - Results of different `asOfDay` values are still compared, and the mismatch is
 *   reported as an `invalid-input` problem. An indicator missing from either
 *   classification list is skipped and reported.
 *
 * Pure and deterministic. The arguments are never modified, the lists are new
 * arrays, and nothing throws.
 */
export function compareEvaluations(
  before: EvaluationResult,
  after: EvaluationResult,
  catalog: Catalog,
): EvaluationComparison {
  const problems: DomainError[] = [];
  if (before.asOfDay !== after.asOfDay) {
    problems.push({
      code: 'invalid-input',
      field: 'asOfDay',
      message: `The two results are for different days (${before.asOfDay} and ${after.asOfDay}). They were compared anyway.`,
    });
  }

  const ids = catalog.indicators
    .map((definition) => definition.id)
    .toSorted(compareStrings);
  const indicators: IndicatorTierChange[] = [];
  for (const indicatorId of ids) {
    const classifiedBefore = classificationFor(before, catalog, indicatorId);
    const classifiedAfter = classificationFor(after, catalog, indicatorId);
    if (!classifiedBefore.ok) {
      problems.push(classifiedBefore.error);
      continue;
    }
    if (!classifiedAfter.ok) {
      problems.push(classifiedAfter.error);
      continue;
    }
    const tierBefore = tierOf(classifiedBefore.value);
    const tierAfter = tierOf(classifiedAfter.value);
    indicators.push({
      indicatorId,
      before: tierBefore,
      after: tierAfter,
      changed: tierBefore !== tierAfter,
    });
  }

  const beforeIds = new Set(before.findings.map((finding) => finding.id));
  const afterIds = new Set(after.findings.map((finding) => finding.id));

  return {
    indicators,
    newFindings: after.findings.filter((finding) => !beforeIds.has(finding.id)),
    removedFindings: before.findings.filter(
      (finding) => !afterIds.has(finding.id),
    ),
    problems,
  };
}
