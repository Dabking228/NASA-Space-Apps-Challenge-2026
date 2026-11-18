import type { Baseline } from '../baseline/compute-baseline';
import type { EvaluationResult } from '../evaluate-input';
import type { Catalog } from '../indicators/build-catalog';
import type { DomainError } from '../result';
import { classificationFor, dayStateFor } from '../trends/classification-for';
import type { Finding, SymptomKind } from '../types';
import { EscalationSummarySchema } from './summary-schema';
import type {
  EscalationSummary,
  SummaryFinding,
  SummaryTrend,
} from './summary-schema';

/** Everything `buildEscalationSummary` reads. The caller supplies every value. */
export interface EscalationSummaryInput {
  readonly result: EvaluationResult;
  readonly catalog: Catalog;
  /** Finding ids the crew chose, in the order to show them. */
  readonly chosenFindingIds: readonly string[];
  readonly astronaut: { readonly id: string; readonly label: string };
  readonly environment: {
    readonly label: string;
    readonly durationDays: number;
  };
  readonly symptomKinds: readonly SymptomKind[];
  /** Plain-text labels of recent events, built by the caller. */
  readonly recentEventLabels: readonly string[];
  /** Plain-text ground link state, built by the caller. */
  readonly groundLinkState: string;
  /** Titles of the completed countermeasures, as plain text. */
  readonly completedCountermeasureTitles: readonly string[];
  readonly checkInsDone: number;
}

export interface EscalationSummaryOutput {
  /**
   * Parsed with `EscalationSummarySchema`. `undefined` only when the caller's
   * values break the schema (for example an empty label); each failure is then
   * listed in `problems`.
   */
  readonly summary: EscalationSummary | undefined;
  /** Left-out finding ids, unknown indicators and schema failures. Never thrown. */
  readonly problems: readonly DomainError[];
}

function toSummaryFinding(finding: Finding): SummaryFinding {
  return {
    id: finding.id,
    tier: finding.tier,
    confidence: finding.confidence,
    reason: finding.reason,
    action: finding.action,
  };
}

function baselineOf(
  result: EvaluationResult,
  indicatorId: string,
): Baseline | undefined {
  const state = dayStateFor(result, result.asOfDay);
  if (state === undefined || !Object.hasOwn(state.baselines, indicatorId)) {
    return undefined;
  }
  return state.baselines[indicatorId];
}

/**
 * Builds the trend entry of one indicator from the evaluation as of
 * `result.asOfDay`. The baseline comes from the replayed day state, then from the
 * classification. The latest reading comes from the classification. Either number
 * is absent when the engine has none. An indicator that is not in the catalog
 * has no label or unit, so it is left out and reported.
 */
function buildTrend(
  indicatorId: string,
  result: EvaluationResult,
  catalog: Catalog,
): {
  readonly trend?: SummaryTrend;
  readonly problems: readonly DomainError[];
} {
  const definition = catalog.byId.get(indicatorId);
  if (definition === undefined) {
    return {
      problems: [
        {
          code: 'unknown-indicator',
          indicatorId,
          message: `Unknown indicator "${indicatorId}": it is not in the catalog, so it was left out of the trends.`,
        },
      ],
    };
  }

  const classification = classificationFor(result, catalog, indicatorId);
  const classified =
    classification.ok && classification.value.status === 'classified'
      ? classification.value
      : undefined;
  const baseline = baselineOf(result, indicatorId) ?? classified?.baseline;

  return {
    trend: {
      id: definition.id,
      label: definition.label,
      unit: definition.unit,
      ...(baseline === undefined ? {} : { baselineMean: baseline.mean }),
      ...(classified === undefined
        ? {}
        : { latestReading: classified.reading.value }),
    },
    problems: classification.ok ? [] : [classification.error],
  };
}

/**
 * Builds the escalation summary (Requirement 5). Pure: no clock, no random
 * source, no advice and no tier logic. Tiers, confidence, reasons, actions and
 * numbers are copied from the evaluation. Never throws.
 *
 * - A chosen finding id that is not in `result.findings` is left out and named
 *   in a problem. A repeated id is listed once.
 * - Trends cover the indicators of the listed findings, once each, in order of
 *   first appearance.
 * - The value is parsed with `EscalationSummarySchema` before it is returned.
 */
export function buildEscalationSummary(
  input: EscalationSummaryInput,
): EscalationSummaryOutput {
  const { result, catalog } = input;
  const problems: DomainError[] = [];

  const findings: Finding[] = [];
  for (const id of new Set(input.chosenFindingIds)) {
    const finding = result.findings.find((candidate) => candidate.id === id);
    if (finding === undefined) {
      problems.push({
        code: 'invalid-input',
        field: 'chosenFindingIds',
        message: `Finding "${id}" is not in the evaluation result and was left out of the summary.`,
      });
    } else {
      findings.push(finding);
    }
  }

  const trends: SummaryTrend[] = [];
  const indicatorIds = new Set(
    findings.flatMap((finding) => finding.indicators),
  );
  for (const indicatorId of indicatorIds) {
    const built = buildTrend(indicatorId, result, catalog);
    problems.push(...built.problems);
    if (built.trend !== undefined) {
      trends.push(built.trend);
    }
  }

  const candidate: EscalationSummary = {
    who: { astronautId: input.astronaut.id, label: input.astronaut.label },
    when: { day: result.asOfDay },
    environment: {
      label: input.environment.label,
      durationDays: input.environment.durationDays,
    },
    findings: findings.map(toSummaryFinding),
    trends,
    context: {
      symptomKinds: [...input.symptomKinds],
      recentEvents: [...input.recentEventLabels],
      groundLinkState: input.groundLinkState,
    },
    actionsTaken: {
      completedCountermeasures: [...input.completedCountermeasureTitles],
      checkInsDone: input.checkInsDone,
    },
  };

  const parsed = EscalationSummarySchema.safeParse(candidate);
  if (parsed.success) {
    return { summary: parsed.data, problems };
  }
  for (const issue of parsed.error.issues) {
    const field = issue.path.map(String).join('.');
    problems.push({
      code: 'invalid-input',
      field,
      message: `Invalid summary field ${field}: ${issue.message}`,
    });
  }
  return { summary: undefined, problems };
}
