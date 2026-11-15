import type { Catalog } from '../indicators/build-catalog';
import type { DomainError, Result } from '../result';
import type { EngineConfig } from '../schemas/config';
import type { Finding } from '../schemas/finding';
import type {
  Comparison,
  IndicatorDefinition,
  SequenceCondition,
} from '../schemas/indicator';
import type { Reading } from '../schemas/reading';
import type { Tier } from '../types';
import type {
  Classification,
  ClassifiedFinal,
  RuleHit,
} from './classification-types';
import type { ClusterDetection, SatisfiedMember } from './clusters';
import { evaluateConfidence } from './confidence';
import type { ConfidenceFactors } from './confidence';
import { formatNumber, opWord, renderTemplate } from './text';
import type { FindingText } from './text';

export interface BuildFindingsInput {
  readonly catalog: Catalog;
  readonly text: FindingText;
  readonly config: EngineConfig;
  /** Final classifications as of `asOfDay`. */
  readonly classifications: readonly Classification[];
  readonly detections: readonly ClusterDetection[];
  readonly asOfDay: number;
}

export interface FindingsReport {
  readonly findings: readonly Finding[];
  /** Template and lookup problems. A finding with a problem still gets a plain reason or action. */
  readonly errors: readonly DomainError[];
}

/** Text plus the problems met while writing it. */
interface Rendered {
  readonly text: string;
  readonly errors: readonly DomainError[];
}

interface BuiltFinding {
  /** Undefined only when the finding cannot be written at all. */
  readonly finding: Finding | undefined;
  readonly errors: readonly DomainError[];
}

function compareStrings(a: string, b: string): number {
  if (a < b) {
    return -1;
  }
  return a > b ? 1 : 0;
}

function sortedUnique(values: readonly string[]): string[] {
  return Array.from(new Set(values)).toSorted(compareStrings);
}

function invalidInput(field: string, message: string): DomainError {
  return { code: 'invalid-input', field, message };
}

function words(identifier: string): string {
  return identifier.replaceAll('-', ' ');
}

function quantity(value: number, unit: string): string {
  return `${formatNumber(value)} ${unit}`;
}

// ---------------------------------------------------------------------------
// Rule sentences
// ---------------------------------------------------------------------------

/** The index at the end of a rule id such as `hard-limit.red.1` or `sequence.0`. */
function ruleIndex(ruleId: string): number | undefined {
  const last = ruleId.split('.').at(-1);
  return last !== undefined && /^\d+$/.test(last) ? Number(last) : undefined;
}

function hardLimitOf(
  definition: IndicatorDefinition,
  tier: Tier,
  index: number,
): Comparison | undefined {
  switch (tier) {
    case 'red':
      return definition.hardLimits.red.at(index);
    case 'orange':
      return definition.hardLimits.orange.at(index);
    case 'green':
    case 'yellow':
      return undefined;
    default: {
      const unreachable: never = tier;
      return unreachable;
    }
  }
}

/** The threshold of a sequence condition as a quantity, or undefined when it needs a missing baseline. */
function sequenceThreshold(
  condition: SequenceCondition,
  baselineMean: number | undefined,
  unit: string,
): string | undefined {
  switch (condition.kind) {
    case 'absolute':
      return quantity(condition.value, unit);
    case 'baseline-relative':
      return baselineMean === undefined
        ? undefined
        : quantity(baselineMean * (1 + condition.fraction), unit);
    case 'background-multiple':
      return `${formatNumber(condition.multiple)}× background`;
    default: {
      const unreachable: never = condition;
      return unreachable;
    }
  }
}

function unresolvedRule(
  definition: IndicatorDefinition,
  hit: RuleHit,
): Result<string, DomainError> {
  return {
    ok: false,
    error: invalidInput(
      `hits.${hit.ruleId}`,
      `Rule "${hit.ruleId}" of indicator "${definition.id}" cannot be described: it is not in the definition or lacks its evidence.`,
    ),
  };
}

/** One sentence for one rule hit, found in the definition by its rule id. */
function renderHit(
  definition: IndicatorDefinition,
  reading: Reading,
  classification: ClassifiedFinal | undefined,
  hit: RuleHit,
  text: FindingText,
): Result<string, DomainError> {
  const base = {
    label: definition.label,
    value: reading.value,
    unit: definition.unit,
    tier: hit.tier,
  };
  const index = ruleIndex(hit.ruleId);

  switch (hit.kind) {
    case 'hard-limit': {
      const limit =
        index === undefined
          ? undefined
          : hardLimitOf(definition, hit.tier, index);
      if (limit === undefined) {
        return unresolvedRule(definition, hit);
      }
      return renderTemplate(text.ruleSentences.hardLimit, {
        ...base,
        op: opWord(limit.op, text.opWords),
        limit: quantity(limit.value, definition.unit),
      });
    }
    case 'sequence': {
      const rule =
        index === undefined ? undefined : definition.sequenceRules.at(index);
      const threshold =
        rule === undefined
          ? undefined
          : sequenceThreshold(
              rule.condition,
              classification?.baseline?.mean,
              definition.unit,
            );
      if (rule === undefined || threshold === undefined) {
        return unresolvedRule(definition, hit);
      }
      return renderTemplate(text.ruleSentences.sequence, {
        ...base,
        op: opWord(rule.condition.op, text.opWords),
        threshold,
        periods: rule.periods,
      });
    }
    case 'conditional': {
      const rule =
        index === undefined ? undefined : definition.conditionalRules.at(index);
      if (rule === undefined) {
        return unresolvedRule(definition, hit);
      }
      const { requires } = rule;
      let trigger: string;
      switch (requires.kind) {
        case 'symptom':
          trigger =
            requires.symptoms === 'any'
              ? 'any symptom'
              : requires.symptoms.map(words).join(' or ');
          break;
        case 'safety-flag':
          trigger = 'safety flag';
          break;
        default: {
          const unreachable: never = requires;
          return unreachable;
        }
      }
      return renderTemplate(text.ruleSentences.conditional, {
        ...base,
        trigger,
      });
    }
    case 'context': {
      const rule =
        index === undefined ? undefined : definition.contextRules.at(index);
      if (rule === undefined) {
        return unresolvedRule(definition, hit);
      }
      let detail: string;
      switch (rule.kind) {
        case 'allowance-fraction':
          detail = `${opWord(rule.op, text.opWords)} ${formatNumber(rule.fraction * 100)}% of the remaining career allowance`;
          break;
        case 'external-alert':
          detail = `a ${words(rule.alert)} alert is active`;
          break;
        default: {
          const unreachable: never = rule;
          return unreachable;
        }
      }
      return renderTemplate(text.ruleSentences.context, { ...base, detail });
    }
    case 'deviation': {
      const evidence = classification?.deviation;
      if (evidence === undefined) {
        return unresolvedRule(definition, hit);
      }
      return renderTemplate(text.ruleSentences.deviation, {
        ...base,
        mean: evidence.mean,
        sd: evidence.sd,
        difference: Math.abs(evidence.difference),
        direction: evidence.direction,
        yellowSd: evidence.yellowSd,
        orangeSd: evidence.orangeSd,
      });
    }
    default: {
      const unreachable: never = hit.kind;
      return unreachable;
    }
  }
}

// ---------------------------------------------------------------------------
// Reasons
// ---------------------------------------------------------------------------

/** The plain reason used when a template fails: indicator, value and rules. */
function plainIndicatorReason(
  definition: IndicatorDefinition,
  reading: Reading,
  hits: readonly RuleHit[],
): string {
  const rules =
    hits.length === 0
      ? ''
      : ` Rule: ${hits.map((hit) => `${hit.ruleId} (${hit.tier})`).join(', ')}.`;
  return `${definition.label} was ${quantity(reading.value, definition.unit)} on day ${reading.day}.${rules}`;
}

/** One indicator sentence: label, value with unit, day and a sentence per rule hit. */
function indicatorSentence(
  definition: IndicatorDefinition,
  reading: Reading,
  classification: ClassifiedFinal | undefined,
  hits: readonly RuleHit[],
  text: FindingText,
): Rendered {
  const plain = plainIndicatorReason(definition, reading, hits);
  const sentences = hits.map((hit) =>
    renderHit(definition, reading, classification, hit, text),
  );
  const failures = sentences.flatMap((sentence) =>
    sentence.ok ? [] : [sentence.error],
  );
  if (failures.length > 0) {
    return { text: plain, errors: failures };
  }

  const rendered = renderTemplate(text.indicatorReason, {
    label: definition.label,
    value: reading.value,
    unit: definition.unit,
    day: reading.day,
    ruleSentences: sentences
      .flatMap((sentence) => (sentence.ok ? [sentence.value] : []))
      .join(' '),
  });
  if (!rendered.ok) {
    return { text: plain, errors: [rendered.error] };
  }
  const trimmed = rendered.value.trim();
  if (trimmed === '') {
    return {
      text: plain,
      errors: [
        invalidInput('indicatorReason', 'The indicator reason rendered empty.'),
      ],
    };
  }
  return { text: trimmed, errors: [] };
}

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------

function stepsForTier(
  tier: Tier,
  steps: FindingText['tierSteps'],
): readonly string[] {
  switch (tier) {
    case 'green':
      return [];
    case 'yellow':
      return steps.yellow;
    case 'orange':
      return steps.orange;
    case 'red':
      return steps.red;
    default: {
      const unreachable: never = tier;
      return unreachable;
    }
  }
}

/** Numbered steps: cluster steps first, then the tier steps. */
function buildAction(
  tier: Tier,
  clusterSteps: readonly string[],
  text: FindingText,
): Rendered {
  const steps = [...clusterSteps, ...stepsForTier(tier, text.tierSteps)];
  if (steps.length === 0) {
    return {
      text: `No action text is configured for the ${tier} tier.`,
      errors: [
        invalidInput(
          `tierSteps.${tier}`,
          `No steps are configured for the ${tier} tier.`,
        ),
      ],
    };
  }
  return {
    text: steps.map((step, index) => `${index + 1}. ${step}`).join('\n'),
    errors: [],
  };
}

// ---------------------------------------------------------------------------
// Indicator findings
// ---------------------------------------------------------------------------

function buildIndicatorFinding(
  classification: ClassifiedFinal,
  definition: IndicatorDefinition,
  input: BuildFindingsInput,
): BuiltFinding {
  const { text, config, asOfDay } = input;
  const { reading, tier, hits } = classification;

  const reason = indicatorSentence(
    definition,
    reading,
    classification,
    hits,
    text,
  );
  const action = buildAction(tier, [], text);

  // One indicator, plus the report that a conditional rule required.
  const signals = hits.some((hit) => hit.kind === 'conditional') ? 2 : 1;
  const factors: ConfidenceFactors = {
    missingData: classification.missingPeriods.length > 0,
    poorQuality: classification.evidenceReadings.some(
      (evidence) => evidence.quality === 'poor',
    ),
    singleSignal: signals < 2,
    supportingSignal: false,
  };

  return {
    finding: {
      id: `indicator:${definition.id}:${asOfDay}`,
      kind: 'indicator',
      day: asOfDay,
      tier,
      reason: reason.text,
      confidence: evaluateConfidence(factors, config.confidence),
      action: action.text,
      sourceIds: sortedUnique(definition.sources.map((source) => source.id)),
      indicators: [definition.id],
      system: definition.system,
    },
    errors: [...reason.errors, ...action.errors],
  };
}

// ---------------------------------------------------------------------------
// Cluster findings
// ---------------------------------------------------------------------------

/** A satisfied indicator member with its reading. Symptom members have none. */
interface IndicatorContributor {
  readonly indicatorId: string;
  readonly reading: Reading;
}

function indicatorContributors(
  members: readonly SatisfiedMember[],
): readonly IndicatorContributor[] {
  const found = members.flatMap((member) =>
    member.indicatorId === undefined || member.reading === undefined
      ? []
      : [{ indicatorId: member.indicatorId, reading: member.reading }],
  );
  // One entry per indicator: the first member in definition order.
  return found.filter(
    (entry, index) =>
      found.findIndex((other) => other.indicatorId === entry.indicatorId) ===
      index,
  );
}

/** The symptom kinds that satisfied the cluster, as "a or b" groups joined by ", ". */
function symptomPhrase(detection: ClusterDetection): string {
  const { cluster } = detection;
  const satisfiedIds = new Set(
    detection.satisfiedMembers
      .filter((member) => member.indicatorId === undefined)
      .map((member) => member.memberId),
  );
  const fromMembers = cluster.members.flatMap((member) =>
    member.kind === 'symptom' && satisfiedIds.has(member.id)
      ? [member.symptoms.map(words).join(' or ')]
      : [],
  );
  // A raised tier means one of the raising symptoms was reported.
  const fromRaises =
    detection.tier === cluster.tier
      ? []
      : cluster.tierRaises
          .filter((raise) => raise.tier === detection.tier)
          .map((raise) => raise.whenSymptomIn.map(words).join(' or '));
  return Array.from(new Set([...fromMembers, ...fromRaises])).join(', ');
}

function buildClusterFinding(
  detection: ClusterDetection,
  classified: ReadonlyMap<string, ClassifiedFinal>,
  input: BuildFindingsInput,
): BuiltFinding {
  const { catalog, text, config, asOfDay } = input;
  const { cluster, tier } = detection;
  const contributors = indicatorContributors(detection.satisfiedMembers);

  const lookupErrors = contributors.flatMap((contributor): DomainError[] =>
    catalog.byId.has(contributor.indicatorId)
      ? []
      : [
          {
            code: 'unknown-indicator',
            indicatorId: contributor.indicatorId,
            message: `Unknown indicator "${contributor.indicatorId}" in cluster "${cluster.id}".`,
          },
        ],
  );
  const evidence = contributors.flatMap((contributor) => {
    const definition = catalog.byId.get(contributor.indicatorId);
    if (definition === undefined) {
      return [];
    }
    // Rule hits are known only when the as-of classification is this same reading.
    const asOf = classified.get(contributor.indicatorId);
    const sameReading =
      asOf !== undefined &&
      asOf.reading.day === contributor.reading.day &&
      asOf.reading.value === contributor.reading.value;
    return [
      {
        definition,
        sentence: indicatorSentence(
          definition,
          contributor.reading,
          sameReading ? asOf : undefined,
          sameReading ? asOf.hits : [],
          text,
        ),
      },
    ];
  });

  const evidenceText = evidence.map((entry) => entry.sentence.text).join(' ');
  const symptoms = symptomPhrase(detection);
  const rendered = renderTemplate(text.clusterReason, {
    cluster: cluster.label,
    tier,
    day: asOfDay,
    windowDays: cluster.windowDays,
    evidence: evidenceText,
    symptoms,
  });
  const plain = [`${cluster.label}.`, evidenceText, symptoms]
    .filter((part) => part !== '')
    .join(' ');
  let reason: string;
  const reasonErrors: DomainError[] = [];
  if (!rendered.ok) {
    reason = plain;
    reasonErrors.push(rendered.error);
  } else if (rendered.value.trim() === '') {
    reason = plain;
    reasonErrors.push(
      invalidInput('clusterReason', 'The cluster reason rendered empty.'),
    );
  } else {
    reason = rendered.value.trim();
  }

  const clusterSteps = new Map(Object.entries(text.clusterSteps)).get(
    cluster.id,
  );
  const clusterStepErrors =
    clusterSteps === undefined
      ? [
          invalidInput(
            `clusterSteps.${cluster.id}`,
            `No cluster steps are configured for cluster "${cluster.id}".`,
          ),
        ]
      : [];
  const action = buildAction(tier, clusterSteps ?? [], text);

  const missingData = contributors.some((contributor) => {
    const asOf = classified.get(contributor.indicatorId);
    return asOf === undefined || asOf.missingPeriods.length > 0;
  });
  const symptomSignals = detection.satisfiedMembers.filter(
    (member) => member.indicatorId === undefined,
  ).length;
  const factors: ConfidenceFactors = {
    missingData,
    poorQuality: detection.satisfiedMembers.some(
      (member) => member.reading?.quality === 'poor',
    ),
    singleSignal: contributors.length + symptomSignals < 2,
    supportingSignal: detection.supportingMembers.length > 0,
  };

  const sourceIds = sortedUnique(
    evidence.flatMap((entry) =>
      entry.definition.sources.map((source) => source.id),
    ),
  );

  return {
    finding: {
      id: `cluster:${cluster.id}:${asOfDay}`,
      kind: 'cluster',
      clusterId: cluster.id,
      day: asOfDay,
      tier,
      reason,
      confidence: evaluateConfidence(factors, config.confidence),
      action: action.text,
      sourceIds,
      indicators: sortedUnique(
        contributors.map((contributor) => contributor.indicatorId),
      ),
      system: cluster.system,
    },
    errors: [
      ...lookupErrors,
      ...evidence.flatMap((entry) => entry.sentence.errors),
      ...reasonErrors,
      ...clusterStepErrors,
      ...action.errors,
    ],
  };
}

// ---------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------

/**
 * Same as `buildFindings`, and also returns the template and lookup problems.
 * One indicator finding per classification at yellow, orange or red, one
 * cluster finding per detection, sorted by id. The result does not depend on the
 * order of `classifications` or `detections`. No argument is modified and nothing
 * is thrown.
 *
 * - Ids are `indicator:<indicatorId>:<asOfDay>` and `cluster:<clusterId>:<asOfDay>`.
 * - The reason names each contributing indicator label, its value with unit and a
 *   sentence per rule hit. For a cluster, rule hits are included only when the
 *   as-of classification holds the same reading as the evidence.
 * - Only required cluster members contribute. Supporting members affect
 *   confidence only.
 * - `sourceIds` is the sorted union of the contributing indicator definitions'
 *   source ids (TD-6). Cluster `sources` are not included.
 * - `indicators` is the sorted list of contributing indicator ids.
 * - A template that fails to render is replaced by a plain reason (indicator,
 *   value and rule) and the error is returned in `errors`.
 */
export function buildFindingsReport(input: BuildFindingsInput): FindingsReport {
  const classified = input.classifications.flatMap((classification) =>
    classification.status === 'classified' ? [classification] : [],
  );
  const byIndicator: ReadonlyMap<string, ClassifiedFinal> = new Map(
    classified.map((classification): [string, ClassifiedFinal] => [
      classification.reading.indicatorId,
      classification,
    ]),
  );

  const indicatorBuilds = classified
    .toSorted((a, b) =>
      compareStrings(a.reading.indicatorId, b.reading.indicatorId),
    )
    .flatMap((classification): readonly BuiltFinding[] => {
      if (classification.tier === 'green') {
        return [];
      }
      const { indicatorId } = classification.reading;
      const definition = input.catalog.byId.get(indicatorId);
      if (definition === undefined) {
        // No finding can be written without a definition. The error is the result.
        return [
          {
            finding: undefined,
            errors: [
              {
                code: 'unknown-indicator',
                indicatorId,
                message: `Unknown indicator "${indicatorId}": no finding was built for it.`,
              },
            ],
          },
        ];
      }
      return [buildIndicatorFinding(classification, definition, input)];
    });

  const clusterBuilds = input.detections
    .toSorted((a, b) => compareStrings(a.cluster.id, b.cluster.id))
    .map((detection) => buildClusterFinding(detection, byIndicator, input));

  const builds = [...indicatorBuilds, ...clusterBuilds];
  return {
    findings: builds
      .flatMap((build) => (build.finding === undefined ? [] : [build.finding]))
      .toSorted((a, b) => compareStrings(a.id, b.id)),
    errors: builds.flatMap((build) => build.errors),
  };
}

/**
 * Findings for one evaluation. See `buildFindingsReport` for the rules and for
 * the problems this function leaves out.
 */
export function buildFindings(input: BuildFindingsInput): readonly Finding[] {
  return buildFindingsReport(input).findings;
}
