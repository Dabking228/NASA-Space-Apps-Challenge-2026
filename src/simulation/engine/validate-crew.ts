import type { Catalog } from '@/domain/indicators/build-catalog';
import { compare } from '@/domain/rules/compare';
import type { EngineConfig } from '@/domain/schemas/config';
import type { IndicatorDefinition } from '@/domain/schemas/indicator';
import { CrewProfileSchema } from '../crew/crew-schema';
import type { CrewProfile } from '../crew/crew-schema';
import { HABITAT_ID } from './noise';
import { makeProblem } from './problem';
import type { SimulationProblem } from './problem';
import type { SimulationSettings } from './settings-schema';
import type { SignalSpec } from './signal-spec-schema';

const UNKNOWN_ENTRY_ID = 'unknown';
// Absorbs binary rounding error, for example 3 * 0.1 = 0.30000000000000004 in floating point.
const RESOLUTION_TOLERANCE = 1e-9;
// A noise standard deviation must be at least this many rounding steps when there is no floor (SD-10).
const MIN_NOISE_STEPS = 3;
// Rounding step `1 / 10^decimals`, indexed by `decimals` (0 to 6, as the Signal_Spec schema allows).
const ROUNDING_STEPS: readonly number[] = [
  1, 0.1, 0.01, 0.001, 0.0001, 0.00001, 0.000001,
];

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

function checkReservedId(profile: CrewProfile): readonly SimulationProblem[] {
  return profile.id === HABITAT_ID
    ? [
        makeProblem(
          'reserved-id',
          'crew',
          profile.id,
          'id',
          `The id "${HABITAT_ID}" is reserved for the shared habitat series and cannot be a crew profile id.`,
        ),
      ]
    : [];
}

function checkPreflight(
  profile: CrewProfile,
  config: EngineConfig,
): readonly SimulationProblem[] {
  const { preflightSamples } = profile;
  const { minSeedReadings } = config.baseline;
  const tooFew: readonly SimulationProblem[] =
    preflightSamples < minSeedReadings
      ? [
          makeProblem(
            'too-few-preflight-samples',
            'crew',
            profile.id,
            'preflightSamples',
            `Pre-flight sample count ${preflightSamples} is below the ${minSeedReadings} readings the engine needs for a baseline.`,
          ),
        ]
      : [];
  const odd: readonly SimulationProblem[] =
    preflightSamples % 2 !== 0
      ? [
          makeProblem(
            'preflight-count-odd',
            'crew',
            profile.id,
            'preflightSamples',
            `Pre-flight sample count ${preflightSamples} is odd. The paired noise needs an even count.`,
          ),
        ]
      : [];
  return [...tooFew, ...odd];
}

function checkPeriodAndBounds(
  profile: CrewProfile,
  indicatorId: string,
  spec: SignalSpec,
  definition: IndicatorDefinition,
): readonly SimulationProblem[] {
  const period: readonly SimulationProblem[] =
    spec.periodDays !== definition.periodDays
      ? [
          makeProblem(
            'period-mismatch',
            'crew',
            profile.id,
            `signals.${indicatorId}.periodDays`,
            `Period ${spec.periodDays} day(s) of "${indicatorId}" differs from the catalog period of ${definition.periodDays} day(s).`,
          ),
        ]
      : [];
  // Bounds are compared only where the catalog states a valid range. Without one, any bounds
  // (such as the scale cap of 100 on spo2) are the profile's own choice.
  const range = definition.validRange;
  const boundsProblem: readonly SimulationProblem[] =
    range !== undefined &&
    (spec.bounds?.min !== range.min || spec.bounds?.max !== range.max)
      ? [
          makeProblem(
            'bounds-mismatch',
            'crew',
            profile.id,
            `signals.${indicatorId}.bounds`,
            `Bounds ${describeBounds(spec)} of "${indicatorId}" differ from the catalog valid range ${range.min} to ${range.max}.`,
          ),
        ]
      : [];
  return [...period, ...boundsProblem];
}

function describeBounds(spec: SignalSpec): string {
  const bounds = spec.bounds;
  if (bounds === undefined) {
    return 'none';
  }
  const min = bounds.min === undefined ? 'no minimum' : `min ${bounds.min}`;
  const max = bounds.max === undefined ? 'no maximum' : `max ${bounds.max}`;
  return `${min}, ${max}`;
}

/**
 * The baseline range uses `clip * noiseSd` as the requirement words it (20.5). That is wider than
 * the real maximum noise of `(1 + spread) * noiseSd`, so the check is conservative. Hard limits are
 * half-lines, so a limit is satisfied somewhere in the range exactly when it holds at an end.
 */
function checkBaselineRange(
  profile: CrewProfile,
  indicatorId: string,
  spec: SignalSpec,
  definition: IndicatorDefinition,
  settings: SimulationSettings,
): readonly SimulationProblem[] {
  const reach = settings.noise.clip * spec.noiseSd;
  const low = spec.baseline - reach;
  const high = spec.baseline + reach;
  const { orange, red } = definition.hardLimits;
  const limits = [...red, ...orange];
  const hit = limits.find(
    (limit) => compare(low, limit) || compare(high, limit),
  );
  if (hit === undefined) {
    return [];
  }
  return [
    makeProblem(
      'baseline-range-hits-limit',
      'crew',
      profile.id,
      `signals.${indicatorId}.baseline`,
      `Baseline ${spec.baseline} of "${indicatorId}" with noise reach ${reach} (clip ${settings.noise.clip} times noise ${spec.noiseSd}) covers ${low} to ${high}, which satisfies a hard limit (${hit.op} ${hit.value}).`,
    ),
  ];
}

/**
 * SD-10. No deviation settings: no rule. No floor: `noiseSd >= 3 * step`. A floor `f`:
 * `2 * noiseSd * (1 + spread) + step < f`. `step` is `1 / 10^decimals`.
 */
function checkNoiseResolution(
  profile: CrewProfile,
  indicatorId: string,
  spec: SignalSpec,
  definition: IndicatorDefinition,
  settings: SimulationSettings,
): readonly SimulationProblem[] {
  const deviation = definition.deviation;
  const step = ROUNDING_STEPS[spec.decimals];
  if (deviation === undefined || step === undefined) {
    return [];
  }
  const field = `signals.${indicatorId}.noiseSd`;
  const floor = deviation.minAbsoluteChange;
  if (floor === null) {
    const needed = MIN_NOISE_STEPS * step;
    return spec.noiseSd + RESOLUTION_TOLERANCE >= needed
      ? []
      : [
          makeProblem(
            'noise-resolution',
            'crew',
            profile.id,
            field,
            `Noise ${spec.noiseSd} of "${indicatorId}" is below ${MIN_NOISE_STEPS} rounding steps (${needed}) for ${spec.decimals} decimal(s).`,
          ),
        ];
  }
  const widest = 2 * spec.noiseSd * (1 + settings.noise.spread) + step;
  return widest < floor - RESOLUTION_TOLERANCE
    ? []
    : [
        makeProblem(
          'noise-resolution',
          'crew',
          profile.id,
          field,
          `Noise ${spec.noiseSd} of "${indicatorId}" is too large for the deviation floor ${floor}: 2 x noise x (1 + ${settings.noise.spread}) + rounding step ${step} is ${widest}, which must stay below the floor.`,
        ),
      ];
}

function checkSignals(
  profile: CrewProfile,
  catalog: Catalog,
  settings: SimulationSettings,
): readonly SimulationProblem[] {
  return Object.entries(profile.signals).flatMap(
    ([indicatorId, spec]): readonly SimulationProblem[] => {
      const definition = catalog.byId.get(indicatorId);
      if (definition === undefined) {
        return [
          makeProblem(
            'unknown-indicator',
            'crew',
            profile.id,
            `signals.${indicatorId}`,
            `Indicator "${indicatorId}" is not in the indicator catalog.`,
          ),
        ];
      }
      return [
        ...checkPeriodAndBounds(profile, indicatorId, spec, definition),
        ...checkBaselineRange(profile, indicatorId, spec, definition, settings),
        ...checkNoiseResolution(
          profile,
          indicatorId,
          spec,
          definition,
          settings,
        ),
      ];
    },
  );
}

/**
 * Checks one crew profile against the catalog. Starts with a schema parse, then runs the
 * consistency checks on data that parsed. An empty `sources` array is not a problem. Never throws.
 */
export function validateCrewProfile(
  profile: unknown,
  catalog: Catalog,
  config: EngineConfig,
  settings: SimulationSettings,
): readonly SimulationProblem[] {
  const parsed = CrewProfileSchema.safeParse(profile);
  if (!parsed.success) {
    const entryId = readEntryId(profile);
    return parsed.error.issues.map((issue) =>
      makeProblem(
        'schema',
        'crew',
        entryId,
        issue.path.map((key) => String(key)).join('.'),
        issue.message,
      ),
    );
  }
  const data = parsed.data;
  return [
    ...checkReservedId(data),
    ...checkPreflight(data, config),
    ...checkSignals(data, catalog, settings),
  ];
}
