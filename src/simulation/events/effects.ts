import type { AlertReport, SymptomKind } from '@/domain/types';
import type { EventSettings } from '@/simulation/engine/settings-schema';
import { canonicalEventOrder } from '@/simulation/events/canonical-order';
import type {
  EventKind,
  ScenarioEvent,
} from '@/simulation/events/event-schemas';

/** What one event does to one reading target. Neutral values (0 and 1) mean "no effect". */
export interface EffectTarget {
  /** `null` for a habitat series, which is shared by the whole crew. */
  readonly astronautId: string | null;
  readonly indicatorId: string;
  readonly day: number;
}

export interface EffectRule<E extends ScenarioEvent> {
  readonly additive: (event: E, target: EffectTarget) => number;
  readonly multiplicative: (
    event: E,
    target: EffectTarget,
    settings: EventSettings,
  ) => number;
  readonly symptoms: (
    event: E,
    astronautId: string,
    day: number,
    settings: EventSettings,
  ) => readonly SymptomKind[];
  readonly alerts: (
    event: E,
    settings: EventSettings,
    lastDay: number,
  ) => readonly AlertReport[];
  readonly blackoutOn: (event: E, day: number) => boolean;
}

type EventOf<K extends EventKind> = Extract<ScenarioEvent, { type: K }>;

// The caller asks only for indicators the astronaut has a Signal_Spec for, plus the habitat
// indicators (Requirement 10.9). The rules below match on indicator id and do not check specs.
const MOOD_ID = 'mood';
const CO2_ID = 'cabin-co2';
const RESTING_HR_ID = 'resting-hr';
const EXERCISE_ADHERENCE_ID = 'exercise-adherence';
const DOSE_RATE_ID = 'dose-rate';

const NO_SYMPTOMS: readonly SymptomKind[] = [];
const NO_ALERTS: readonly AlertReport[] = [];

/** Rule with no effect of any kind. Each rule below overrides only what its event does. */
const NEUTRAL: EffectRule<ScenarioEvent> = {
  additive: () => 0,
  multiplicative: () => 1,
  symptoms: () => NO_SYMPTOMS,
  alerts: () => NO_ALERTS,
  blackoutOn: () => false,
};

/** True when `day` lies in `[start, start + lengthDays)`. */
function inWindow(day: number, start: number, lengthDays: number): boolean {
  return day >= start && day < start + lengthDays;
}

/** An omitted astronaut list means the whole crew. */
function listsAstronaut(
  astronauts: readonly string[] | undefined,
  astronautId: string,
): boolean {
  return astronauts === undefined || astronauts.includes(astronautId);
}

const driftRule: EffectRule<EventOf<'drift'>> = {
  ...NEUTRAL,
  additive: (event, target) => {
    if (target.indicatorId !== event.indicator) return 0;
    // An absent lengthDays is open-ended. After the window the ramp resets to 0 (SD-5).
    const inside =
      target.day >= event.day &&
      (event.lengthDays === undefined ||
        target.day < event.day + event.lengthDays);
    if (!inside) return 0;
    // A habitat target (null) is the shared series, so the astronaut list does not apply.
    if (
      target.astronautId !== null &&
      !listsAstronaut(event.astronauts, target.astronautId)
    ) {
      return 0;
    }
    return event.perDay * (target.day - event.day + 1);
  },
};

const moodDipRule: EffectRule<EventOf<'moodDip'>> = {
  ...NEUTRAL,
  additive: (event, target) =>
    target.indicatorId === MOOD_ID &&
    target.astronautId !== null &&
    listsAstronaut(event.astronauts, target.astronautId) &&
    inWindow(target.day, event.day, event.lengthDays)
      ? -event.depth
      : 0,
};

const co2SpikeRule: EffectRule<EventOf<'co2Spike'>> = {
  ...NEUTRAL,
  additive: (event, target) =>
    target.indicatorId === CO2_ID &&
    inWindow(target.day, event.day, event.lengthDays)
      ? event.deltaMmHg
      : 0,
};

const evaRule: EffectRule<EventOf<'eva'>> = {
  ...NEUTRAL,
  additive: (event, target) =>
    target.indicatorId === RESTING_HR_ID &&
    target.astronautId !== null &&
    listsAstronaut(event.astronauts, target.astronautId) &&
    inWindow(target.day, event.day, event.lengthDays)
      ? event.heartRateDeltaBpm
      : 0,
};

const equipmentOutageRule: EffectRule<EventOf<'equipmentOutage'>> = {
  ...NEUTRAL,
  multiplicative: (event, target) =>
    target.indicatorId === EXERCISE_ADHERENCE_ID &&
    target.astronautId !== null &&
    listsAstronaut(event.astronauts, target.astronautId) &&
    inWindow(target.day, event.day, event.lengthDays)
      ? 1 - event.reductionFraction
      : 1,
};

function solarParticleEventLength(
  event: EventOf<'solarParticleEvent'>,
  settings: EventSettings,
): number {
  return event.lengthDays ?? settings.solarParticleEvent.defaultLengthDays;
}

const solarParticleEventRule: EffectRule<EventOf<'solarParticleEvent'>> = {
  ...NEUTRAL,
  // The factor scales the whole reading in composeReading, so the multiple itself
  // makes the dose rate about the multiple times the background (Requirement 11.2).
  multiplicative: (event, target, settings) =>
    target.indicatorId === DOSE_RATE_ID &&
    inWindow(target.day, event.day, solarParticleEventLength(event, settings))
      ? settings.solarParticleEvent.doseRateMultiple[event.severity]
      : 1,
  alerts: (event, settings, lastDay) => {
    if (event.day > lastDay) return NO_ALERTS;
    const length = solarParticleEventLength(event, settings);
    return [
      {
        kind: 'solar-particle-event',
        startDay: event.day,
        endDay: Math.min(lastDay, event.day + length - 1),
      },
    ];
  },
};

const symptomRule: EffectRule<EventOf<'symptom'>> = {
  ...NEUTRAL,
  symptoms: (event, astronautId, day, settings) =>
    listsAstronaut(event.astronauts, astronautId) &&
    inWindow(
      day,
      event.day,
      event.lengthDays ?? settings.symptom.defaultLengthDays,
    )
      ? [event.kind]
      : NO_SYMPTOMS,
};

const commsBlackoutRule: EffectRule<EventOf<'commsBlackout'>> = {
  ...NEUTRAL,
  blackoutOn: (event, day) => inWindow(day, event.day, event.lengthDays),
};

/** The single place an effect formula exists. A missing Event_Kind fails typecheck (Requirement 9.12). */
export const EFFECT_RULES = {
  drift: driftRule,
  moodDip: moodDipRule,
  solarParticleEvent: solarParticleEventRule,
  co2Spike: co2SpikeRule,
  eva: evaRule,
  equipmentOutage: equipmentOutageRule,
  symptom: symptomRule,
  commsBlackout: commsBlackoutRule,
} satisfies {
  readonly [K in EventKind]: EffectRule<EventOf<K>>;
};

/** The rule of one event with the event already applied. */
export interface BoundEffect {
  readonly additive: (target: EffectTarget) => number;
  readonly multiplicative: (
    target: EffectTarget,
    settings: EventSettings,
  ) => number;
  readonly symptoms: (
    astronautId: string,
    day: number,
    settings: EventSettings,
  ) => readonly SymptomKind[];
  readonly alerts: (
    settings: EventSettings,
    lastDay: number,
  ) => readonly AlertReport[];
  readonly blackoutOn: (day: number) => boolean;
}

function bindRule<E extends ScenarioEvent>(
  rule: EffectRule<E>,
  event: E,
): BoundEffect {
  return {
    additive: (target) => rule.additive(event, target),
    multiplicative: (target, settings) =>
      rule.multiplicative(event, target, settings),
    symptoms: (astronautId, day, settings) =>
      rule.symptoms(event, astronautId, day, settings),
    alerts: (settings, lastDay) => rule.alerts(event, settings, lastDay),
    blackoutOn: (day) => rule.blackoutOn(event, day),
  };
}

/** Dispatch over `event.type`. Ends with a `never` check, so a new Event_Kind fails typecheck. */
export function effectOf(event: ScenarioEvent): BoundEffect {
  switch (event.type) {
    case 'drift':
      return bindRule(EFFECT_RULES.drift, event);
    case 'moodDip':
      return bindRule(EFFECT_RULES.moodDip, event);
    case 'solarParticleEvent':
      return bindRule(EFFECT_RULES.solarParticleEvent, event);
    case 'co2Spike':
      return bindRule(EFFECT_RULES.co2Spike, event);
    case 'eva':
      return bindRule(EFFECT_RULES.eva, event);
    case 'equipmentOutage':
      return bindRule(EFFECT_RULES.equipmentOutage, event);
    case 'symptom':
      return bindRule(EFFECT_RULES.symptom, event);
    case 'commsBlackout':
      return bindRule(EFFECT_RULES.commsBlackout, event);
    default: {
      const unhandled: never = event;
      return unhandled;
    }
  }
}

/** Sum of the additive effects, added in canonical event order (Requirement 10.7). */
export function sumAdditive(
  events: readonly ScenarioEvent[],
  target: EffectTarget,
): number {
  return canonicalEventOrder(events).reduce(
    (total, event) => total + effectOf(event).additive(target),
    0,
  );
}

/** Product of the multiplicative effects, multiplied in canonical event order (Requirement 10.7). */
export function multiplyMultiplicative(
  events: readonly ScenarioEvent[],
  target: EffectTarget,
  settings: EventSettings,
): number {
  return canonicalEventOrder(events).reduce(
    (product, event) =>
      product * effectOf(event).multiplicative(target, settings),
    1,
  );
}

/** Both totals for one reading target. Same shape as the `EffectTotals` that `composeReading` reads. */
export interface CombinedEffects {
  readonly additive: number;
  readonly multiplicative: number;
}

export function combineEffects(
  events: readonly ScenarioEvent[],
  target: EffectTarget,
  settings: EventSettings,
): CombinedEffects {
  return {
    additive: sumAdditive(events, target),
    multiplicative: multiplyMultiplicative(events, target, settings),
  };
}

/** Symptom kinds one astronaut reports on one day, without duplicates, in canonical event order. */
export function collectSymptoms(
  events: readonly ScenarioEvent[],
  astronautId: string,
  day: number,
  settings: EventSettings,
): readonly SymptomKind[] {
  return canonicalEventOrder(events)
    .flatMap((event) => effectOf(event).symptoms(astronautId, day, settings))
    .filter((kind, index, kinds) => kinds.indexOf(kind) === index);
}

/** Alerts of all events that start on or before `lastDay`, in canonical event order. */
export function collectAlerts(
  events: readonly ScenarioEvent[],
  settings: EventSettings,
  lastDay: number,
): readonly AlertReport[] {
  return canonicalEventOrder(events).flatMap((event) =>
    effectOf(event).alerts(settings, lastDay),
  );
}

/** True when some `commsBlackout` event covers `day`. */
export function isBlackoutDay(
  events: readonly ScenarioEvent[],
  day: number,
): boolean {
  return events.some((event) => effectOf(event).blackoutOn(day));
}
