import type { ZodType } from 'zod';
import type { Catalog } from '@/domain/indicators/build-catalog';
import type { ClusterDefinition } from '@/domain/schemas/cluster';
import type { EngineConfig } from '@/domain/schemas/config';
import { CrewProfileSchema } from '../crew/crew-schema';
import { EnvironmentConfigSchema } from '../environments/environment-schema';
import type { SimulationLibrary } from '../library';
import { ScenarioSchema } from '../scenarios/scenario-schema';
import { makeProblem } from './problem';
import type { SimulationProblem } from './problem';
import { SimulationSettingsSchema } from './settings-schema';
import type { SimulationSettings } from './settings-schema';
import { validateCrewProfile } from './validate-crew';
import { validateDemoPack } from './validate-demo-pack';
import { validateEnvironmentConfig } from './validate-environment';
import { validateScenario } from './validate-scenario';

// Entry id of problems that belong to the library as a whole.
const LIBRARY_ID = 'library';
const SETTINGS_ID = 'settings';
// Requirement 7.1 and 7.6.
const EXPECTED_CREW_COUNT = 4;
const ATHLETE_RESTING_HR = 48;
// Requirement 5.4: the qualitative order of PROJECT.md section 10, lowest first.
const DOSE_ORDER: readonly string[] = ['iss', 'lunar-surface', 'mars-transit'];
const CAREER_INDICATOR_ID = 'career-effective-dose';
// Design, `career-dose-headroom`: the projected dose must stay below this share of the allowance.
const HEADROOM_FRACTION = 0.8;
const ROUNDING_FACTOR = 1000;

function round3(value: number): number {
  return Math.round(value * ROUNDING_FACTOR) / ROUNDING_FACTOR;
}

/** The entries that pass their schema. Schema failures are already reported by the entry validators. */
function parsedEntries<T>(
  entries: readonly unknown[],
  schema: ZodType<T>,
): readonly T[] {
  return entries.flatMap((entry): readonly T[] => {
    const parsed = schema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
}

function checkCrewCount(
  library: SimulationLibrary,
): readonly SimulationProblem[] {
  const count = library.crew.length;
  return count === EXPECTED_CREW_COUNT
    ? []
    : [
        makeProblem(
          'crew-count',
          'library',
          LIBRARY_ID,
          'crew',
          `The library has ${count} crew profile(s), but it needs exactly ${EXPECTED_CREW_COUNT}.`,
        ),
      ];
}

function checkDuplicateCrewIds(
  library: SimulationLibrary,
): readonly SimulationProblem[] {
  const ids = library.crew.map((profile) => profile.id);
  return ids.flatMap((id, index): readonly SimulationProblem[] =>
    ids.indexOf(id) === index
      ? []
      : [
          makeProblem(
            'duplicate-id',
            'crew',
            id,
            `crew.${index}.id`,
            `Crew profile id "${id}" is used by more than one crew profile. Each profile needs its own id.`,
          ),
        ],
  );
}

function checkRestingHr(
  profiles: readonly { readonly id: string; readonly baseline: number }[],
): readonly SimulationProblem[] {
  const duplicates = profiles.flatMap(
    (profile, index): readonly SimulationProblem[] => {
      const earlier = profiles
        .slice(0, index)
        .find((other) => other.baseline === profile.baseline);
      return earlier === undefined
        ? []
        : [
            makeProblem(
              'duplicate-baseline',
              'crew',
              profile.id,
              'signals.resting-hr.baseline',
              `Crew profile "${profile.id}" has the same resting-hr baseline ${profile.baseline} as "${earlier.id}". Each profile needs its own value.`,
            ),
          ];
    },
  );
  const hasAthlete = profiles.some(
    (profile) => profile.baseline === ATHLETE_RESTING_HR,
  );
  const missing: readonly SimulationProblem[] = hasAthlete
    ? []
    : [
        makeProblem(
          'athlete-missing',
          'library',
          LIBRARY_ID,
          'crew',
          `No crew profile has a resting-hr baseline of ${ATHLETE_RESTING_HR} bpm, so the library has no athlete.`,
        ),
      ];
  return [...duplicates, ...missing];
}

/**
 * Requirement 5.4: ISS below lunar surface below Mars transit, compared on the midpoint of the
 * dose rate range, for the environments that are present. Each present environment is compared
 * with the previous present one in that order.
 */
function checkDoseOrder(
  environments: readonly {
    readonly id: string;
    readonly doseRateMsvPerDay: {
      readonly low: number;
      readonly high: number;
    };
  }[],
): readonly SimulationProblem[] {
  const present = DOSE_ORDER.flatMap((id) => {
    const found = environments.find((environment) => environment.id === id);
    return found === undefined
      ? []
      : [
          {
            id,
            midpoint:
              (found.doseRateMsvPerDay.low + found.doseRateMsvPerDay.high) / 2,
          },
        ];
  });
  return present.flatMap((current, index): readonly SimulationProblem[] => {
    const previous = index === 0 ? undefined : present[index - 1];
    if (previous === undefined || previous.midpoint < current.midpoint) {
      return [];
    }
    return [
      makeProblem(
        'environment-dose-order',
        'environment',
        current.id,
        'doseRateMsvPerDay',
        `Dose rate midpoint ${current.midpoint} mSv/day of "${current.id}" is not above ${previous.midpoint} mSv/day of "${previous.id}". The order must be ISS, then lunar surface, then Mars transit.`,
      ),
    ];
  });
}

/**
 * `career-dose-headroom`, as the design words it: for every crew profile and environment,
 * `careerDose + maxProjected` stays below `0.8 * (careerLimit - careerDose)`.
 * `maxProjected` is `high * (days - 1 + multiple)`: the upper dose rate of the environment on
 * every day, with the SPE multiple on one day. `days` is the longest duration among library
 * scenarios in that environment; an environment without a scenario has no duration and is skipped.
 * The career limit comes from the catalog (`careerLimitMsv` of `career-effective-dose`).
 */
function checkCareerDoseHeadroom(
  library: SimulationLibrary,
  catalog: Catalog,
  settings: SimulationSettings,
): readonly SimulationProblem[] {
  const profiles = parsedEntries(library.crew, CrewProfileSchema);
  const environments = parsedEntries(
    library.environments,
    EnvironmentConfigSchema,
  );
  const scenarios = parsedEntries(library.scenarios, ScenarioSchema);
  const multiple = settings.events.solarParticleEvent.doseRateMultiple.moderate;

  const cases = environments.flatMap((environment) => {
    const durations = scenarios
      .filter((scenario) => scenario.environmentId === environment.id)
      .map((scenario) => scenario.durationDays);
    return durations.length === 0
      ? []
      : [{ environment, days: Math.max(...durations) }];
  });
  if (cases.length === 0 || profiles.length === 0) {
    return [];
  }

  const limit = catalog.byId.get(CAREER_INDICATOR_ID)?.careerLimitMsv;
  if (limit === undefined) {
    return [
      makeProblem(
        'unknown-indicator',
        'library',
        LIBRARY_ID,
        `catalog.${CAREER_INDICATOR_ID}.careerLimitMsv`,
        `The indicator catalog has no career limit for "${CAREER_INDICATOR_ID}", so the career dose headroom cannot be checked.`,
      ),
    ];
  }

  return profiles.flatMap((profile) =>
    cases.flatMap(({ environment, days }): readonly SimulationProblem[] => {
      const career = profile.careerDoseBeforeMissionMsv;
      const maxProjected =
        environment.doseRateMsvPerDay.high * (days - 1 + multiple);
      const allowed = HEADROOM_FRACTION * (limit - career);
      return career + maxProjected < allowed
        ? []
        : [
            makeProblem(
              'career-dose-headroom',
              'crew',
              profile.id,
              'careerDoseBeforeMissionMsv',
              `Career dose ${career} mSv of "${profile.id}" plus the maximum projected dose ${round3(maxProjected)} mSv in "${environment.id}" (${days} days, one day at ${multiple} times the dose rate) is ${round3(career + maxProjected)} mSv, which is not below ${HEADROOM_FRACTION} of the remaining allowance (${round3(allowed)} mSv from limit ${limit} mSv).`,
            ),
          ];
    }),
  );
}

/**
 * Checks a whole library. Runs the four entry validators for every environment, crew profile,
 * scenario and demo pack, then the checks that need the whole library: crew count, duplicate crew
 * id, duplicate or missing `resting-hr` baseline, environment dose order and career dose headroom.
 * A duplicate scenario id is reported by `validateScenario` for each such scenario, so no
 * library-level duplicate-scenario check is added here. The design lists no duplicate check for
 * environments or demo packs. Returns every problem in one list and never throws.
 */
export function validateLibrary(
  library: SimulationLibrary,
  catalog: Catalog,
  config: EngineConfig,
  clusters: readonly ClusterDefinition[],
): readonly SimulationProblem[] {
  const settings = SimulationSettingsSchema.safeParse(library.settings);
  // The crew validator and the headroom check read the settings, so they run only when the
  // settings parse. Invalid settings are reported as schema problems instead.
  const settingsDependent: readonly SimulationProblem[] = settings.success
    ? [
        ...library.crew.flatMap((profile) =>
          validateCrewProfile(profile, catalog, config, settings.data),
        ),
        ...checkCareerDoseHeadroom(library, catalog, settings.data),
      ]
    : settings.error.issues.map((issue) =>
        makeProblem(
          'schema',
          'settings',
          SETTINGS_ID,
          issue.path.map((key) => String(key)).join('.'),
          issue.message,
        ),
      );

  const restingHr = parsedEntries(library.crew, CrewProfileSchema).map(
    (profile) => ({
      id: profile.id,
      baseline: profile.signals['resting-hr'].baseline,
    }),
  );
  return [
    ...settingsDependent,
    ...validateEntriesExceptCrew(library, catalog, config, clusters),
    ...checkCrewCount(library),
    ...checkDuplicateCrewIds(library),
    ...checkRestingHr(restingHr),
    ...checkDoseOrder(
      parsedEntries(library.environments, EnvironmentConfigSchema),
    ),
  ];
}

function validateEntriesExceptCrew(
  library: SimulationLibrary,
  catalog: Catalog,
  config: EngineConfig,
  clusters: readonly ClusterDefinition[],
): readonly SimulationProblem[] {
  return [
    ...library.environments.flatMap((environment) =>
      validateEnvironmentConfig(environment, catalog, config),
    ),
    ...library.scenarios.flatMap((scenario) =>
      validateScenario(scenario, library, catalog, config, clusters),
    ),
    ...library.demoPacks.flatMap((pack) =>
      validateDemoPack(pack, library, catalog, config),
    ),
  ];
}
