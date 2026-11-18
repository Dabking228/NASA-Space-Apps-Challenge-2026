import type { EnvironmentProfile } from '../environments/environment-profile';
import type { Catalog } from '../indicators/build-catalog';
import type { DomainError } from '../result';
import { MissionDaySchema } from '../schemas/vocabulary';
import type { AlertReport, Reading } from '../types';

const DOSE_RATE_ID = 'dose-rate';
const CAREER_DOSE_ID = 'career-effective-dose';

export interface RadiationFiguresInput {
  readonly readings: readonly Reading[];
  readonly astronautId: string;
  readonly day: number;
  readonly environment: EnvironmentProfile;
  readonly catalog: Catalog;
  /** Career dose the astronaut had accrued before the mission, in mSv. */
  readonly careerDoseBeforeMissionMsv: number;
  readonly alerts: readonly AlertReport[];
}

/**
 * Dose figures for one astronaut on one Mission_Day. A figure is `undefined`
 * when its inputs are absent or invalid; invalid inputs are named in `problems`.
 * No Tier is returned: the page reads tiers from the evaluation result.
 */
export interface RadiationFigures {
  /** Dose-rate reading of the day divided by the environment background rate. */
  readonly doseRateMultiple: number | undefined;
  /** The `career-effective-dose` reading of the day, in mSv. */
  readonly projectedMissionDoseMsv: number | undefined;
  /** Projected dose divided by the remaining career allowance (a fraction, 1 = all of it). */
  readonly allowanceShare: number | undefined;
  readonly solarParticleEventActive: boolean;
  readonly problems: readonly DomainError[];
}

function invalidInput(field: string, message: string): DomainError {
  return { code: 'invalid-input', field, message };
}

/** Same pick as the engine and the trend helper: good quality first, then the lower value. */
function readingOfDay(
  readings: readonly Reading[],
  astronautId: string,
  indicatorId: string,
  day: number,
): Reading | undefined {
  return readings
    .filter(
      (reading) =>
        reading.astronautId === astronautId &&
        reading.indicatorId === indicatorId &&
        reading.day === day,
    )
    .toSorted(
      (a, b) =>
        Number(a.quality === 'poor') - Number(b.quality === 'poor') ||
        a.value - b.value,
    )[0];
}

/**
 * Dose-rate multiple of background, projected mission dose, share of the
 * remaining allowance and whether a solar particle event covers the day.
 * Pure, never throws, and compares no number with a threshold.
 *
 * Problems are reported whatever the readings are, because they concern the
 * caller's inputs: an invalid day, a background rate of zero (no multiple can be
 * formed), a catalog with no `careerLimitMsv` for `career-effective-dose`, a
 * non-finite or negative career dose before the mission, and a remaining
 * allowance of zero or less. Each names the field.
 */
export function computeRadiationFigures(
  input: RadiationFiguresInput,
): RadiationFigures {
  const { readings, astronautId, day, environment, catalog, alerts } = input;
  const { careerDoseBeforeMissionMsv } = input;
  const problems: DomainError[] = [];

  if (!MissionDaySchema.safeParse(day).success) {
    problems.push(
      invalidInput(
        'day',
        `Invalid day: ${day} is not a Mission_Day (a whole number, 0 or more).`,
      ),
    );
  }

  const doseRateReading = readingOfDay(
    readings,
    astronautId,
    DOSE_RATE_ID,
    day,
  );
  const careerReading = readingOfDay(
    readings,
    astronautId,
    CAREER_DOSE_ID,
    day,
  );

  // Dose-rate multiple.
  const background = environment.backgroundDoseRateMsvPerDay;
  let doseRateMultiple: number | undefined;
  if (!(Number.isFinite(background) && background > 0)) {
    problems.push(
      invalidInput(
        'environment.backgroundDoseRateMsvPerDay',
        `Invalid environment.backgroundDoseRateMsvPerDay: ${background} must be greater than 0 to form a multiple of background.`,
      ),
    );
  } else if (doseRateReading !== undefined) {
    doseRateMultiple = doseRateReading.value / background;
  }

  // Projected dose and share of the remaining allowance.
  const projectedMissionDoseMsv = careerReading?.value;
  let allowanceShare: number | undefined;
  const careerLimitMsv = catalog.byId.get(CAREER_DOSE_ID)?.careerLimitMsv;
  if (!Number.isFinite(careerDoseBeforeMissionMsv)) {
    problems.push(
      invalidInput(
        'careerDoseBeforeMissionMsv',
        `Invalid careerDoseBeforeMissionMsv: ${careerDoseBeforeMissionMsv} is not a finite number.`,
      ),
    );
  } else if (careerLimitMsv === undefined) {
    problems.push(
      invalidInput(
        `indicators.${CAREER_DOSE_ID}.careerLimitMsv`,
        `Indicator "${CAREER_DOSE_ID}" has no careerLimitMsv in the catalog, so the share of the remaining allowance cannot be formed.`,
      ),
    );
  } else {
    const remainingMsv = careerLimitMsv - careerDoseBeforeMissionMsv;
    if (remainingMsv <= 0) {
      problems.push(
        invalidInput(
          'careerDoseBeforeMissionMsv',
          `Invalid careerDoseBeforeMissionMsv: ${careerDoseBeforeMissionMsv} leaves a remaining allowance of ${remainingMsv} (zero or less), so no share can be formed.`,
        ),
      );
    } else if (projectedMissionDoseMsv !== undefined) {
      allowanceShare = projectedMissionDoseMsv / remainingMsv;
    }
  }

  const solarParticleEventActive = alerts.some(
    (alert) =>
      alert.kind === 'solar-particle-event' &&
      alert.startDay <= day &&
      day <= alert.endDay,
  );

  return {
    doseRateMultiple,
    projectedMissionDoseMsv,
    allowanceShare,
    solarParticleEventActive,
    problems,
  };
}
