import type { Baseline } from '../baseline/compute-baseline';
import type { DomainError, Result } from '../result';
import type {
  Comparison,
  ConditionalRule,
  ContextRule,
  ResolvedDeviation,
  SequenceCondition,
  SequenceRule,
} from '../schemas/indicator';
import type { Reading } from '../schemas/reading';
import { maxTier } from '../tiers';
import type { Tier } from '../types';
import type {
  BaseClassification,
  ClassificationContext,
  DeviationEvidence,
  RuleHit,
} from './classification-types';
import { compare } from './compare';
import { classifyDeviation } from './deviation';

/** Outcome of one sequence rule. `satisfied` is false whenever a period has no reading. */
interface SequenceOutcome {
  readonly satisfied: boolean;
  /** End days of the periods that have no reading, newest first. */
  readonly missingPeriods: readonly number[];
  /** The reading of each period, newest first. Empty unless every period has one. */
  readonly readings: readonly Reading[];
}

function ascending(values: readonly number[]): readonly number[] {
  return values.toSorted((a, b) => a - b);
}

/** The latest reading with `firstDay <= day <= lastDay`, or undefined. */
function latestReadingInRange(
  history: ReadonlyMap<number, Reading>,
  firstDay: number,
  lastDay: number,
): Reading | undefined {
  for (let day = lastDay; day >= Math.max(firstDay, 0); day -= 1) {
    const reading = history.get(day);
    if (reading !== undefined) {
      return reading;
    }
  }
  return undefined;
}

/** The comparison a sequence condition applies, or undefined when it needs a baseline that is missing. */
function sequenceComparison(
  condition: SequenceCondition,
  baseline: Baseline | undefined,
  backgroundDoseRateMsvPerDay: number,
): Comparison | undefined {
  switch (condition.kind) {
    case 'absolute':
      return { op: condition.op, value: condition.value };
    case 'baseline-relative':
      return baseline === undefined
        ? undefined
        : { op: condition.op, value: baseline.mean * (1 + condition.fraction) };
    case 'background-multiple':
      return {
        op: condition.op,
        value: backgroundDoseRateMsvPerDay * condition.multiple,
      };
    default: {
      const unreachable: never = condition;
      return unreachable;
    }
  }
}

/**
 * Periods `k = 0..N-1` cover `(day - (k+1)*periodDays, day - k*periodDays]` and the
 * latest reading of each period counts. Returns undefined when the rule cannot be
 * evaluated because it needs a baseline and none exists.
 */
function evaluateSequence(
  rule: SequenceRule,
  ctx: ClassificationContext,
): SequenceOutcome | undefined {
  const comparison = sequenceComparison(
    rule.condition,
    ctx.baseline,
    ctx.environment.backgroundDoseRateMsvPerDay,
  );
  if (comparison === undefined) {
    return undefined;
  }

  const { periodDays } = ctx.definition;
  const periods = Array.from({ length: rule.periods }, (_, k) => {
    const endDay = ctx.day - k * periodDays;
    return {
      endDay,
      reading: latestReadingInRange(
        ctx.history,
        endDay - periodDays + 1,
        endDay,
      ),
    };
  });

  const missingPeriods = periods.flatMap((period) =>
    period.reading === undefined ? [period.endDay] : [],
  );
  if (missingPeriods.length > 0) {
    return { satisfied: false, missingPeriods, readings: [] };
  }

  const readings = periods.flatMap((period) =>
    period.reading === undefined ? [] : [period.reading],
  );
  return {
    satisfied: readings.every((reading) => compare(reading.value, comparison)),
    missingPeriods: [],
    readings,
  };
}

/** A conditional rule needs the reading and the report on the same Mission_Day. */
function conditionalSatisfied(
  rule: ConditionalRule,
  reading: Reading,
  ctx: ClassificationContext,
): boolean {
  if (reading.day !== ctx.day) {
    return false;
  }
  if (
    rule.comparison !== undefined &&
    !compare(reading.value, rule.comparison)
  ) {
    return false;
  }

  const { requires } = rule;
  switch (requires.kind) {
    case 'symptom': {
      const reportedToday = ctx.symptomsToday.filter(
        (symptom) => symptom.day === ctx.day,
      );
      if (requires.symptoms === 'any') {
        return reportedToday.length > 0;
      }
      const listed = requires.symptoms;
      return reportedToday.some((symptom) => listed.includes(symptom.kind));
    }
    case 'safety-flag':
      return ctx.safetyFlagToday;
    default: {
      const unreachable: never = requires;
      return unreachable;
    }
  }
}

/**
 * `allowance-fraction` compares the projected dose (the reading) with
 * `fraction * remaining`, written without division. `external-alert` needs an
 * active alert of the named kind.
 */
function contextSatisfied(
  rule: ContextRule,
  reading: Reading,
  ctx: ClassificationContext,
): Result<boolean, DomainError> {
  switch (rule.kind) {
    case 'allowance-fraction': {
      const { careerLimitMsv } = ctx.definition;
      if (careerLimitMsv === undefined) {
        return {
          ok: false,
          error: {
            code: 'invalid-input',
            field: `indicators.${ctx.definition.id}.careerLimitMsv`,
            message: `Indicator "${ctx.definition.id}" has an allowance-fraction rule but no careerLimitMsv.`,
          },
        };
      }
      const remainingMsv = careerLimitMsv - ctx.careerDoseBeforeMissionMsv;
      return {
        ok: true,
        value: compare(reading.value, {
          op: rule.op,
          value: rule.fraction * remainingMsv,
        }),
      };
    }
    case 'external-alert':
      return { ok: true, value: ctx.alertsActive.includes(rule.alert) };
    default: {
      const unreachable: never = rule;
      return unreachable;
    }
  }
}

function hit(
  ruleId: string,
  kind: RuleHit['kind'],
  tier: RuleHit['tier'],
): RuleHit {
  return { ruleId, kind, tier };
}

/**
 * Base tier of one indicator on one Mission_Day, before persistence.
 *
 * Order: hard limits (red, then orange), sequence rules, conditional rules,
 * context rules, and the deviation rule only when none of those was satisfied.
 * The base tier is the worst satisfied tier. Hard limits and sequence rules never
 * read `earthReference` or the baseline mean, except for `baseline-relative`
 * sequence conditions, which are skipped when no baseline exists.
 *
 * Rule ids: `hard-limit.<red|orange>.<i>`, `sequence.<i>`, `conditional.<i>`,
 * `context.<i>` and `deviation`, where `<i>` is the index in the definition.
 *
 * Returns `unknown-indicator` when a reading in `history` belongs to another
 * indicator id than `definition.id`. The caller looks the definition up, so an id
 * with no definition is reported by the caller with the same error code.
 */
export function classifyBase(
  ctx: ClassificationContext,
): Result<BaseClassification, DomainError> {
  const { definition, day } = ctx;

  const foreignId = Array.from(ctx.history.values())
    .map((reading) => reading.indicatorId)
    .filter((id) => id !== definition.id)
    .toSorted()
    .at(0);
  if (foreignId !== undefined) {
    return {
      ok: false,
      error: {
        code: 'unknown-indicator',
        indicatorId: foreignId,
        message: `Unknown indicator "${foreignId}": a reading for it was supplied with the definition of "${definition.id}".`,
      },
    };
  }

  const sequences = definition.sequenceRules.map((rule, index) => ({
    rule,
    index,
    outcome: evaluateSequence(rule, ctx),
  }));
  const missingFromSequences = sequences.flatMap(({ outcome }) =>
    outcome === undefined ? [] : outcome.missingPeriods,
  );

  const current = latestReadingInRange(
    ctx.history,
    day - definition.periodDays + 1,
    day,
  );
  if (current === undefined) {
    // Period 0 of every sequence rule is this same period, so no rule is evaluable.
    return {
      ok: true,
      value: {
        status: 'no-data',
        missingPeriods: ascending(
          Array.from(new Set([day, ...missingFromSequences])),
        ),
      },
    };
  }

  const hardLimitHits = [
    ...definition.hardLimits.red.flatMap((limit, index) =>
      compare(current.value, limit)
        ? [hit(`hard-limit.red.${index}`, 'hard-limit', 'red')]
        : [],
    ),
    ...definition.hardLimits.orange.flatMap((limit, index) =>
      compare(current.value, limit)
        ? [hit(`hard-limit.orange.${index}`, 'hard-limit', 'orange')]
        : [],
    ),
  ];

  const sequenceHits = sequences.flatMap(({ rule, index, outcome }) =>
    outcome?.satisfied === true
      ? [hit(`sequence.${index}`, 'sequence', rule.tier)]
      : [],
  );
  const sequenceReadings = sequences.flatMap(({ outcome }) =>
    outcome?.satisfied === true ? outcome.readings : [],
  );

  const conditionalHits = definition.conditionalRules.flatMap((rule, index) =>
    conditionalSatisfied(rule, current, ctx)
      ? [hit(`conditional.${index}`, 'conditional', rule.tier)]
      : [],
  );

  const contextHits: RuleHit[] = [];
  for (const [index, rule] of definition.contextRules.entries()) {
    const satisfied = contextSatisfied(rule, current, ctx);
    if (!satisfied.ok) {
      return satisfied;
    }
    if (satisfied.value) {
      contextHits.push(hit(`context.${index}`, 'context', rule.tier));
    }
  }

  const ruleHits = [
    ...hardLimitHits,
    ...sequenceHits,
    ...conditionalHits,
    ...contextHits,
  ];

  let deviation: DeviationEvidence | undefined;
  const deviationHits: RuleHit[] = [];
  const { baseline } = ctx;
  if (
    ruleHits.length === 0 &&
    definition.deviation !== undefined &&
    baseline !== undefined
  ) {
    const settings: ResolvedDeviation = {
      yellowSd:
        definition.deviation.yellowSd ?? ctx.config.deviationDefaults.yellowSd,
      orangeSd:
        definition.deviation.orangeSd ?? ctx.config.deviationDefaults.orangeSd,
      minAbsoluteChange: definition.deviation.minAbsoluteChange,
      direction: definition.deviation.direction,
    };
    const result = classifyDeviation(current.value, baseline, settings);
    deviation = result.evidence;
    if (result.tier !== 'green') {
      deviationHits.push(hit('deviation', 'deviation', result.tier));
    }
  }

  const hits = [...ruleHits, ...deviationHits];
  const baseTier = hits.reduce<Tier>(
    (worst, ruleHit) => maxTier(worst, ruleHit.tier),
    'green',
  );

  const evidenceByDay = new Map<number, Reading>(
    [current, ...sequenceReadings].map((reading): [number, Reading] => [
      reading.day,
      reading,
    ]),
  );
  const evidenceReadings = Array.from(evidenceByDay.values()).toSorted(
    (a, b) => a.day - b.day,
  );

  return {
    ok: true,
    value: {
      status: 'classified',
      baseTier,
      hits,
      reading: current,
      baseline,
      ...(deviation === undefined ? {} : { deviation }),
      missingPeriods: ascending(Array.from(new Set(missingFromSequences))),
      evidenceReadings,
    },
  };
}
