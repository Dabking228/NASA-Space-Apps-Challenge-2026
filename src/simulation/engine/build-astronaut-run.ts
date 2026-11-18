import type { Reading, SymptomReport } from '@/domain/types';
import type { CrewProfile } from '../crew/crew-schema';
import type { EnvironmentConfig } from '../environments/environment-schema';
import { collectSymptoms, combineEffects } from '../events/effects';
import type { ScenarioEvent } from '../events/event-schemas';
import {
  buildReading,
  composeReading,
  noiseIndexOfDay,
  readingDays,
} from './generate-reading';
import { HABITAT_ID, pairedNoiseSample } from './noise';
import {
  astronautPreFlightSamples,
  habitatPreFlightSamples,
} from './pre-flight';
import type { AstronautRun } from './run-schema';
import type { SeededRandom } from './seeded-random';
import type { SimulationSettings } from './settings-schema';
import type { SignalSpec } from './signal-spec-schema';

const CABIN_CO2_ID = 'cabin-co2';
const DOSE_RATE_ID = 'dose-rate';
const CAREER_DOSE_ID = 'career-effective-dose';
// The career dose is reported to 3 decimals (design, Radiation outputs).
const CAREER_DOSE_FACTOR = 1000;

/** What every series of one run reads. `last` is the only place `throughDay` enters. */
export interface RunParts {
  readonly random: SeededRandom;
  readonly settings: SimulationSettings;
  readonly events: readonly ScenarioEvent[];
  readonly last: number;
  readonly durationDays: number;
}

/** The shared habitat series: one value per day, index = day. */
export interface HabitatSeries {
  readonly cabinCo2: readonly number[];
  readonly doseRate: readonly number[];
}

function compareStrings(a: string, b: string): number {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

function daysUpTo(last: number): readonly number[] {
  return Array.from({ length: last + 1 }, (_, day) => day);
}

function habitatValues(
  env: EnvironmentConfig,
  indicatorId: typeof CABIN_CO2_ID | typeof DOSE_RATE_ID,
  run: RunParts,
): readonly number[] {
  const spec = env.habitat[indicatorId];
  return daysUpTo(run.last).map((day) =>
    composeReading(
      spec,
      combineEffects(
        run.events,
        { astronautId: null, indicatorId, day },
        run.settings.events,
      ),
      pairedNoiseSample(
        run.random,
        [HABITAT_ID, indicatorId],
        day,
        run.settings.noise,
      ),
    ),
  );
}

/** Habitat series for days 0 to `last`. Built once per run and shared by every astronaut. */
export function buildHabitatSeries(
  env: EnvironmentConfig,
  run: RunParts,
): HabitatSeries {
  return {
    cabinCo2: habitatValues(env, CABIN_CO2_ID, run),
    doseRate: habitatValues(env, DOSE_RATE_ID, run),
  };
}

/**
 * Projected mission dose on day M: dose rates of days 0..M plus the background rate for each
 * remaining day of the scenario. No value reads beyond day M, so it does not depend on `throughDay`.
 */
function careerDoseSeries(
  doseRates: readonly number[],
  background: number,
  durationDays: number,
): readonly number[] {
  let total = 0;
  return doseRates.map((rate, day) => {
    total += rate;
    const projected = total + background * (durationDays - 1 - day);
    return Math.round(projected * CAREER_DOSE_FACTOR) / CAREER_DOSE_FACTOR;
  });
}

function astronautReadings(
  profile: CrewProfile,
  run: RunParts,
): readonly Reading[] {
  return Object.entries(profile.signals).flatMap(([indicatorId, spec]) =>
    readingDays(spec, run.last).map((day) =>
      buildReading(
        profile.id,
        indicatorId,
        day,
        composeReading(
          spec,
          combineEffects(
            run.events,
            { astronautId: profile.id, indicatorId, day },
            run.settings.events,
          ),
          pairedNoiseSample(
            run.random,
            [profile.id, indicatorId, 'noise'],
            noiseIndexOfDay(spec, day),
            run.settings.noise,
          ),
        ),
      ),
    ),
  );
}

function sharedReadings(
  astronautId: string,
  habitat: HabitatSeries,
  background: number,
  durationDays: number,
): readonly Reading[] {
  const series: readonly (readonly [string, readonly number[]])[] = [
    [CABIN_CO2_ID, habitat.cabinCo2],
    [DOSE_RATE_ID, habitat.doseRate],
    [
      CAREER_DOSE_ID,
      careerDoseSeries(habitat.doseRate, background, durationDays),
    ],
  ];
  return series.flatMap(([indicatorId, values]) =>
    values.map((value, day) =>
      buildReading(astronautId, indicatorId, day, value),
    ),
  );
}

function compareReadings(a: Reading, b: Reading): number {
  return a.day - b.day || compareStrings(a.indicatorId, b.indicatorId);
}

function compareSymptoms(a: SymptomReport, b: SymptomReport): number {
  return a.day - b.day || compareStrings(a.kind, b.kind);
}

function astronautSymptoms(
  astronautId: string,
  run: RunParts,
): readonly SymptomReport[] {
  const reports = daysUpTo(run.last).flatMap((day) =>
    collectSymptoms(run.events, astronautId, day, run.settings.events).map(
      (kind): SymptomReport => ({ astronautId, day, kind }),
    ),
  );
  // One report per astronaut, kind and day (Requirement 12.4).
  return reports.filter(
    (report, index) =>
      reports.findIndex(
        (other) => other.day === report.day && other.kind === report.kind,
      ) === index,
  );
}

function preFlightSeeds(
  profile: CrewProfile,
  env: EnvironmentConfig,
  run: RunParts,
): AstronautRun['preFlightSeeds'] {
  const { noise } = run.settings;
  const count = profile.preflightSamples;
  const own = Object.entries(profile.signals).map(
    ([indicatorId, spec]): readonly [string, number[]] => [
      indicatorId,
      [
        ...astronautPreFlightSamples(
          run.random,
          profile.id,
          indicatorId,
          spec,
          count,
          noise,
        ),
      ],
    ],
  );
  const habitatSpecs: readonly (readonly [string, SignalSpec])[] = [
    [CABIN_CO2_ID, env.habitat[CABIN_CO2_ID]],
    [DOSE_RATE_ID, env.habitat[DOSE_RATE_ID]],
  ];
  const habitat = habitatSpecs.map(
    ([indicatorId, spec]): readonly [string, number[]] => [
      indicatorId,
      [...habitatPreFlightSamples(run.random, indicatorId, spec, count, noise)],
    ],
  );
  return Object.fromEntries([...own, ...habitat]);
}

/** Everything one astronaut contributes to the run. Safety flags stay empty (Requirement 12.3). */
export function buildAstronautRun(
  profile: CrewProfile,
  env: EnvironmentConfig,
  habitat: HabitatSeries,
  background: number,
  run: RunParts,
): AstronautRun {
  return {
    astronautId: profile.id,
    preFlightSeeds: preFlightSeeds(profile, env, run),
    careerDoseBeforeMissionMsv: profile.careerDoseBeforeMissionMsv,
    readings: [
      ...astronautReadings(profile, run),
      ...sharedReadings(profile.id, habitat, background, run.durationDays),
    ].toSorted(compareReadings),
    symptoms: [...astronautSymptoms(profile.id, run)].toSorted(compareSymptoms),
    safetyFlags: [],
  };
}
