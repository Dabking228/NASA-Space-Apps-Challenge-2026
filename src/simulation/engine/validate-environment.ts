import type { Catalog } from '@/domain/indicators/build-catalog';
import { compare } from '@/domain/rules/compare';
import type { EngineConfig } from '@/domain/schemas/config';
import type { Hazard } from '@/domain/schemas/vocabulary';
import { HazardSchema } from '@/domain/schemas/vocabulary';
import { EnvironmentConfigSchema } from '../environments/environment-schema';
import type { EnvironmentConfig } from '../environments/environment-schema';
import { makeProblem } from './problem';
import type { SimulationProblem } from './problem';

const UNKNOWN_ENTRY_ID = 'unknown';
// Tolerance for comparing a baseline with the midpoint of the dose rate range.
const MIDPOINT_TOLERANCE = 1e-9;

/** The id of a value that failed the schema, when it can be read without a type assertion. */
function readEntryId(value: unknown): string {
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const { id } = value;
    if (typeof id === 'string' && id.length > 0) {
      return id;
    }
  }
  return UNKNOWN_ENTRY_ID;
}

function checkDoseRange(env: EnvironmentConfig): readonly SimulationProblem[] {
  const { low, high } = env.doseRateMsvPerDay;
  const order: readonly SimulationProblem[] =
    low > high
      ? [
          makeProblem(
            'dose-range-order',
            'environment',
            env.id,
            'doseRateMsvPerDay',
            `Dose rate low value ${low} is above the high value ${high}.`,
          ),
        ]
      : [];
  const baseline = env.habitat['dose-rate'].baseline;
  const midpoint = (low + high) / 2;
  const midpointProblem: readonly SimulationProblem[] =
    Math.abs(baseline - midpoint) > MIDPOINT_TOLERANCE
      ? [
          makeProblem(
            'dose-baseline-midpoint',
            'environment',
            env.id,
            'habitat.dose-rate.baseline',
            `Dose rate baseline ${baseline} differs from the midpoint ${midpoint} of the range ${low} to ${high}.`,
          ),
        ]
      : [];
  return [...order, ...midpointProblem];
}

function checkDelayRange(env: EnvironmentConfig): readonly SimulationProblem[] {
  const delay = env.groundLink.oneWayDelaySeconds;
  if (delay === null || delay.min <= delay.max) {
    return [];
  }
  return [
    makeProblem(
      'delay-range-order',
      'environment',
      env.id,
      'groundLink.oneWayDelaySeconds',
      `Delay minimum ${delay.min} is above the maximum ${delay.max}.`,
    ),
  ];
}

function checkHazardWeights(
  env: EnvironmentConfig,
): readonly SimulationProblem[] {
  // Read through a map, so a key missing at run time is seen as undefined.
  const weights: ReadonlyMap<string, number> = new Map(
    Object.entries(env.hazardWeights),
  );
  const missing = HazardSchema.options.flatMap(
    (hazard): readonly SimulationProblem[] =>
      weights.has(hazard)
        ? []
        : [
            makeProblem(
              'missing-hazard-weight',
              'environment',
              env.id,
              `hazardWeights.${hazard}`,
              `Hazard "${hazard}" has no weight.`,
            ),
          ],
  );

  const weightOf = (hazard: Hazard): number | undefined => weights.get(hazard);
  const others = HazardSchema.options.filter(
    (hazard) => !env.emphasisedHazards.includes(hazard),
  );
  const otherWeights = others.flatMap((hazard) => {
    const weight = weightOf(hazard);
    return weight === undefined ? [] : [{ hazard, weight }];
  });
  const emphasis = env.emphasisedHazards.flatMap(
    (hazard): readonly SimulationProblem[] => {
      const weight = weightOf(hazard);
      if (weight === undefined) {
        return [];
      }
      const blocking = otherWeights.find((other) => other.weight >= weight);
      return blocking === undefined
        ? []
        : [
            makeProblem(
              'emphasis-weight',
              'environment',
              env.id,
              `hazardWeights.${hazard}`,
              `Emphasised hazard "${hazard}" has weight ${weight}, which is not above the weight ${blocking.weight} of "${blocking.hazard}".`,
            ),
          ];
    },
  );
  return [...missing, ...emphasis];
}

function checkCo2Baseline(
  env: EnvironmentConfig,
  catalog: Catalog,
): readonly SimulationProblem[] {
  const definition = catalog.byId.get('cabin-co2');
  if (definition === undefined) {
    return [
      makeProblem(
        'unknown-indicator',
        'environment',
        env.id,
        'habitat.cabin-co2',
        'The indicator catalog has no "cabin-co2" indicator, so the cabin CO2 baseline cannot be checked.',
      ),
    ];
  }
  const baseline = env.habitat['cabin-co2'].baseline;
  const { orange, red } = definition.hardLimits;
  const hit =
    red.find((limit) => compare(baseline, limit)) ??
    orange.find((limit) => compare(baseline, limit));
  if (hit === undefined) {
    return [];
  }
  return [
    makeProblem(
      'co2-baseline-hits-limit',
      'environment',
      env.id,
      'habitat.cabin-co2.baseline',
      `Cabin CO2 baseline ${baseline} satisfies a hard limit of "cabin-co2" (${hit.op} ${hit.value}).`,
    ),
  ];
}

/**
 * Checks one environment config against the catalog. Starts with a schema parse, then runs the
 * consistency checks on data that parsed. An empty `sources` array is not a problem. Never throws.
 * `_config` is accepted for the common validator signature; no environment check reads it.
 */
export function validateEnvironmentConfig(
  env: unknown,
  catalog: Catalog,
  _config: EngineConfig,
): readonly SimulationProblem[] {
  void _config;
  const parsed = EnvironmentConfigSchema.safeParse(env);
  if (!parsed.success) {
    const entryId = readEntryId(env);
    return parsed.error.issues.map((issue) =>
      makeProblem(
        'schema',
        'environment',
        entryId,
        issue.path.map((key) => String(key)).join('.'),
        issue.message,
      ),
    );
  }
  const config = parsed.data;
  return [
    ...checkDoseRange(config),
    ...checkDelayRange(config),
    ...checkHazardWeights(config),
    ...checkCo2Baseline(config, catalog),
  ];
}
