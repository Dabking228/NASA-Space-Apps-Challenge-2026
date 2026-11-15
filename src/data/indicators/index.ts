import { buildCatalog } from '@/domain/indicators/build-catalog';
import type { CatalogProblem } from '@/domain/schemas/catalog-problem';
import type { IndicatorDraft } from '@/domain/schemas/indicator';
import { clusterDefinitions } from '../clusters';
import { engineConfig } from '../engine-config';
import { approvedSourceIds } from './approved-sources';
import { cabinCo2 } from './habitat';
import { indicatorMapping } from './mapping';
import {
  bodyMassChange30d,
  energyIntake,
  exerciseAdherence,
} from './nutrition-msk';
import { careerEffectiveDose, doseRate } from './radiation';
import { mood, reactionTime, sleepHours, who5 } from './sleep-behaviour';
import {
  bodyTemperature,
  bpDiastolic,
  bpSystolic,
  fastingGlucose,
  restingHr,
  spo2,
} from './vitals';

// Every shipped indicator draft, in catalog order.
const indicatorDrafts: readonly IndicatorDraft[] = [
  restingHr,
  bpSystolic,
  bpDiastolic,
  bodyTemperature,
  spo2,
  fastingGlucose,
  sleepHours,
  mood,
  who5,
  reactionTime,
  bodyMassChange30d,
  energyIntake,
  exerciseAdherence,
  careerEffectiveDose,
  doseRate,
  cabinCo2,
];

function describeProblem(problem: CatalogProblem): string {
  const field = problem.field === '' ? '(entry)' : problem.field;
  return `- ${problem.entryKind} "${problem.entryId}", field ${field} [${problem.code}]: ${problem.message}`;
}

// Runs once at module load. Invalid shipped data throws here, which stops the
// dev server and the build. This is the only place in the engine that throws.
// Unverified indicators (empty `sources`) are not an error here (TD-10).
const built = buildCatalog(
  indicatorDrafts,
  indicatorMapping,
  clusterDefinitions,
  engineConfig,
  approvedSourceIds,
);

if (!built.ok) {
  throw new Error(
    `The shipped indicator data is invalid (${built.error.length} problem${built.error.length === 1 ? '' : 's'}):\n${built.error.map(describeProblem).join('\n')}`,
  );
}

/** Validated indicator definitions for the shipped data. */
export const defaultCatalog = built.value.catalog;

/** Cluster definitions after schema parsing (defaults applied). */
export const defaultClusters = built.value.clusters;

/** Engine config after schema parsing (defaults applied). */
export const defaultConfig = built.value.config;
