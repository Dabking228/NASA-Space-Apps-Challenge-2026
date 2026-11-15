import type { Baseline } from '../baseline/compute-baseline';
import type { EnvironmentProfile } from '../environments/environment-profile';
import type { EngineConfig } from '../schemas/config';
import type { IndicatorDefinition } from '../schemas/indicator';
import type { AlertReport, Reading, SymptomReport } from '../schemas/reading';
import type { Tier } from '../types';

export type { ResolvedDeviation } from '../schemas/indicator';

/** Kind of an external alert, taken from the alert schema. */
export type AlertKind = AlertReport['kind'];

/** Everything `classifyBase` reads for one indicator on one Mission_Day. */
export interface ClassificationContext {
  readonly definition: IndicatorDefinition;
  readonly day: number;
  /** Readings of this indicator by day. */
  readonly history: ReadonlyMap<number, Reading>;
  readonly baseline: Baseline | undefined;
  readonly symptomsToday: readonly SymptomReport[];
  readonly safetyFlagToday: boolean;
  readonly environment: EnvironmentProfile;
  readonly careerDoseBeforeMissionMsv: number;
  readonly alertsActive: readonly AlertKind[];
  readonly config: EngineConfig;
}

/** One satisfied rule and the tier it gave. */
export interface RuleHit {
  readonly ruleId: string;
  readonly kind:
    'hard-limit' | 'sequence' | 'conditional' | 'context' | 'deviation';
  readonly tier: Tier;
}

/** The numbers behind a deviation tier, so the result can be explained. */
export interface DeviationEvidence {
  readonly mean: number;
  readonly sd: number;
  /** Signed: value minus mean. */
  readonly difference: number;
  readonly floor: number | null;
  /** True when the floor is `null`, which counts as 0 until the team supplies one (TD-11). */
  readonly floorPending: boolean;
  readonly yellowSd: number;
  readonly orangeSd: number;
  readonly direction: 'above' | 'below';
}

export interface ClassifiedBase {
  readonly status: 'classified';
  readonly baseTier: Tier;
  readonly hits: readonly RuleHit[];
  readonly reading: Reading;
  /** The baseline in force that day, used by cluster members. */
  readonly baseline: Baseline | undefined;
  readonly deviation?: DeviationEvidence;
  readonly missingPeriods: readonly number[];
  readonly evidenceReadings: readonly Reading[];
}

export interface NoDataBase {
  readonly status: 'no-data';
  readonly missingPeriods: readonly number[];
}

export type BaseClassification = ClassifiedBase | NoDataBase;

/** Final per-day result: the base classification plus the persistence outcome. */
export type ClassifiedFinal = ClassifiedBase & {
  readonly tier: Tier;
  readonly persistenceApplied: boolean;
};

/** The `no-data` variant has no `tier` field. */
export type Classification = ClassifiedFinal | NoDataBase;
