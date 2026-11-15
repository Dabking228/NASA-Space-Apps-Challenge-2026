import type { ClusterDefinition, ClusterMember } from '../schemas/cluster';
import type { Reading, SymptomReport } from '../schemas/reading';
import { compareTiers, maxTier } from '../tiers';
import type { Tier } from '../types';
import type { Classification } from './classification-types';
import { compare } from './compare';

/** The final classifications of every indicator on one Mission_Day. */
export interface DayClassifications {
  readonly day: number;
  readonly byIndicator: ReadonlyMap<string, Classification>;
}

/** Evidence that one member was satisfied. `day` is the latest day in the window that satisfied it. */
export interface SatisfiedMember {
  readonly memberId: string;
  readonly day: number;
  readonly indicatorId?: string;
  readonly reading?: Reading;
}

export interface ClusterDetection {
  readonly cluster: ClusterDefinition;
  /** The definition's tier, raised by matching `tierRaises` entries. Never lower than the definition's tier. */
  readonly tier: Tier;
  /** Every required member, in definition order. */
  readonly satisfiedMembers: readonly SatisfiedMember[];
  /** Supporting members that were satisfied. They affect confidence only. */
  readonly supportingMembers: readonly { memberId: string; day: number }[];
}

/** What a member needs from its day: the evidence fields, without the member id. */
type MemberEvidence = Pick<SatisfiedMember, 'day' | 'indicatorId' | 'reading'>;

function indicatorMemberEvidence(
  member: Extract<ClusterMember, { kind: 'indicator' }>,
  day: DayClassifications,
): MemberEvidence | undefined {
  const classification = day.byIndicator.get(member.indicatorId);
  if (classification === undefined || classification.status !== 'classified') {
    return undefined;
  }
  if (compareTiers(classification.tier, member.minTier) < 0) {
    return undefined;
  }

  const { reading, baseline } = classification;
  const { direction } = member;
  let directionHolds: boolean;
  switch (direction) {
    case 'any':
      directionHolds = true;
      break;
    case 'above-baseline':
      directionHolds = baseline !== undefined && reading.value > baseline.mean;
      break;
    case 'below-baseline':
      directionHolds = baseline !== undefined && reading.value < baseline.mean;
      break;
    default: {
      const unreachable: never = direction;
      return unreachable;
    }
  }

  return directionHolds
    ? { day: day.day, indicatorId: member.indicatorId, reading }
    : undefined;
}

function baselineRelativeEvidence(
  member: Extract<ClusterMember, { kind: 'baseline-relative' }>,
  day: DayClassifications,
): MemberEvidence | undefined {
  const classification = day.byIndicator.get(member.indicatorId);
  if (classification === undefined || classification.status !== 'classified') {
    return undefined;
  }
  const { reading, baseline } = classification;
  // The reading must be from this day. A weekly indicator may carry an older one.
  if (baseline === undefined || reading.day !== day.day) {
    return undefined;
  }
  const holds = compare(reading.value, {
    op: member.op,
    value: baseline.mean * (1 + member.fraction),
  });
  return holds
    ? { day: day.day, indicatorId: member.indicatorId, reading }
    : undefined;
}

function symptomEvidence(
  member: Extract<ClusterMember, { kind: 'symptom' }>,
  day: number,
  symptoms: readonly SymptomReport[],
): MemberEvidence | undefined {
  const present = symptoms.some(
    (report) => report.day === day && member.symptoms.includes(report.kind),
  );
  return present ? { day } : undefined;
}

/** Whether `member` is satisfied on one day, with the evidence if it is. */
function memberOnDay(
  member: ClusterMember,
  day: DayClassifications,
  symptoms: readonly SymptomReport[],
): MemberEvidence | undefined {
  switch (member.kind) {
    case 'indicator':
      return indicatorMemberEvidence(member, day);
    case 'baseline-relative':
      return baselineRelativeEvidence(member, day);
    case 'symptom':
      return symptomEvidence(member, day.day, symptoms);
    default: {
      const unreachable: never = member;
      return unreachable;
    }
  }
}

/** Symptom members also hold on days that have symptom reports but no indicator data. */
function candidateDays(
  windowDays: readonly DayClassifications[],
  symptoms: readonly SymptomReport[],
  firstDay: number,
  lastDay: number,
): readonly DayClassifications[] {
  const empty: ReadonlyMap<string, Classification> = new Map();
  const known = new Set(windowDays.map((entry) => entry.day));
  const extra = symptoms
    .filter(
      (report) =>
        report.day >= firstDay &&
        report.day <= lastDay &&
        !known.has(report.day),
    )
    .map((report) => report.day);
  const extraDays = [...new Set(extra)].map((day) => ({
    day,
    byIndicator: empty,
  }));
  return [...windowDays, ...extraDays];
}

/** The evidence from the latest window day on which `member` holds. */
function latestSatisfaction(
  member: ClusterMember,
  days: readonly DayClassifications[],
  symptoms: readonly SymptomReport[],
): SatisfiedMember | undefined {
  let best: SatisfiedMember | undefined;
  for (const day of days) {
    const evidence = memberOnDay(member, day, symptoms);
    if (
      evidence !== undefined &&
      (best === undefined || evidence.day > best.day)
    ) {
      best = { memberId: member.id, ...evidence };
    }
  }
  return best;
}

/** The highest tier among `tierRaises` entries whose member exists and whose symptom is in the window. */
function raisedTier(
  cluster: ClusterDefinition,
  symptomsInWindow: readonly SymptomReport[],
): Tier {
  const memberIds = new Set(
    [...cluster.members, ...cluster.supporting].map((member) => member.id),
  );
  return cluster.tierRaises.reduce<Tier>((tier, raise) => {
    const matches =
      memberIds.has(raise.memberId) &&
      symptomsInWindow.some((report) =>
        raise.whenSymptomIn.includes(report.kind),
      );
    return matches ? maxTier(tier, raise.tier) : tier;
  }, cluster.tier);
}

function detectCluster(
  cluster: ClusterDefinition,
  days: readonly DayClassifications[],
  symptoms: readonly SymptomReport[],
  asOfDay: number,
): ClusterDetection | undefined {
  const firstDay = asOfDay - cluster.windowDays + 1;
  const symptomsInWindow = symptoms.filter(
    (report) => report.day >= firstDay && report.day <= asOfDay,
  );
  const windowDays = candidateDays(
    days.filter((entry) => entry.day >= firstDay && entry.day <= asOfDay),
    symptomsInWindow,
    firstDay,
    asOfDay,
  );

  const required = cluster.members.map((member) =>
    latestSatisfaction(member, windowDays, symptomsInWindow),
  );
  const satisfiedMembers = required.filter(
    (entry): entry is SatisfiedMember => entry !== undefined,
  );
  if (satisfiedMembers.length !== cluster.members.length) {
    return undefined;
  }

  const supportingMembers = cluster.supporting
    .map((member) => latestSatisfaction(member, windowDays, symptomsInWindow))
    .filter((entry): entry is SatisfiedMember => entry !== undefined)
    .map((entry) => ({ memberId: entry.memberId, day: entry.day }));

  return {
    cluster,
    tier: raisedTier(cluster, symptomsInWindow),
    satisfiedMembers,
    supportingMembers,
  };
}

/**
 * A cluster is detected when every required member is satisfied on some day in
 * `[asOfDay - windowDays + 1, asOfDay]`. Members need not hold on the same day.
 * At most one detection is returned per cluster id (the first definition with that
 * id), in the order of `clusters`. The result does not depend on the order of
 * `days` or `symptoms`. No argument is modified.
 */
export function detectClusters(
  clusters: readonly ClusterDefinition[],
  days: readonly DayClassifications[],
  symptoms: readonly SymptomReport[],
  asOfDay: number,
): readonly ClusterDetection[] {
  const firstOfId = clusters.filter(
    (cluster, index) =>
      clusters.findIndex((other) => other.id === cluster.id) === index,
  );
  return firstOfId.flatMap((cluster) => {
    const detection = detectCluster(cluster, days, symptoms, asOfDay);
    return detection === undefined ? [] : [detection];
  });
}
