import { z } from 'zod';

export const SimulationProblemCodeSchema = z.enum([
  'schema',
  'invalid-argument',
  'engine-error',
  'expectation-unmet',
  'quiet-run-tier',
  'duplicate-id',
  'reserved-id',
  'unknown-environment',
  'unknown-crew',
  'duplicate-crew',
  'event-out-of-range',
  'unknown-indicator',
  'astronaut-not-in-crew',
  'astronaut-list-on-habitat-event',
  'event-without-signal-spec',
  'unknown-expectation-target',
  'period-mismatch',
  'bounds-mismatch',
  'too-few-preflight-samples',
  'preflight-count-odd',
  'baseline-range-hits-limit',
  'noise-resolution',
  'career-dose-headroom',
  'dose-range-order',
  'delay-range-order',
  'missing-hazard-weight',
  'emphasis-weight',
  'dose-baseline-midpoint',
  'co2-baseline-hits-limit',
  'environment-dose-order',
  'crew-count',
  'duplicate-baseline',
  'athlete-missing',
  'demo-duration',
  'demo-unknown-scenario',
  'demo-day-range',
  'demo-day-order',
  'demo-focus-not-in-crew',
  'demo-step-order',
]);
export type SimulationProblemCode = z.infer<typeof SimulationProblemCodeSchema>;

export const SimulationProblemEntryKindSchema = z.enum([
  'scenario',
  'crew',
  'environment',
  'demo-pack',
  'library',
  'settings',
  'run',
]);
export type SimulationProblemEntryKind = z.infer<
  typeof SimulationProblemEntryKindSchema
>;

// Every field is a string, so a problem list survives a JSON round trip unchanged.
export const SimulationProblemSchema = z.strictObject({
  code: SimulationProblemCodeSchema,
  entryKind: SimulationProblemEntryKindSchema,
  // The id of the offending entry.
  entryId: z.string().min(1),
  // Dotted path of the offending field. Empty when the whole entry is meant.
  field: z.string(),
  // Plain language. Quotes the offending value where one exists.
  message: z.string().min(1),
});
export type SimulationProblem = Readonly<
  z.infer<typeof SimulationProblemSchema>
>;

export function makeProblem(
  code: SimulationProblemCode,
  entryKind: SimulationProblemEntryKind,
  entryId: string,
  field: string,
  message: string,
): SimulationProblem {
  return { code, entryKind, entryId, field, message };
}

/** Short plain-language name of a problem code. A new code fails typecheck until it is handled here. */
export function describeProblemCode(code: SimulationProblemCode): string {
  switch (code) {
    case 'schema':
      return 'Data does not match its schema';
    case 'invalid-argument':
      return 'Invalid argument';
    case 'engine-error':
      return 'The health engine reported an error';
    case 'expectation-unmet':
      return 'Storyline expectation not met';
    case 'quiet-run-tier':
      return 'Quiet run produced a non-green tier';
    case 'duplicate-id':
      return 'Duplicate id';
    case 'reserved-id':
      return 'Reserved id';
    case 'unknown-environment':
      return 'Unknown environment';
    case 'unknown-crew':
      return 'Unknown crew member';
    case 'duplicate-crew':
      return 'Duplicate crew member';
    case 'event-out-of-range':
      return 'Event is dated outside the scenario';
    case 'unknown-indicator':
      return 'Unknown indicator';
    case 'astronaut-not-in-crew':
      return 'Astronaut is not in the crew';
    case 'astronaut-list-on-habitat-event':
      return 'Astronaut list on an event that targets a habitat indicator';
    case 'event-without-signal-spec':
      return 'Event targets an indicator without a signal spec';
    case 'unknown-expectation-target':
      return 'Expectation names an unknown target';
    case 'period-mismatch':
      return 'Period differs from the catalog';
    case 'bounds-mismatch':
      return 'Bounds differ from the catalog valid range';
    case 'too-few-preflight-samples':
      return 'Too few pre-flight samples';
    case 'preflight-count-odd':
      return 'Pre-flight sample count is odd';
    case 'baseline-range-hits-limit':
      return 'Baseline range reaches a hard limit';
    case 'noise-resolution':
      return 'Noise is too small for the rounding step';
    case 'career-dose-headroom':
      return 'Career dose leaves too little headroom';
    case 'dose-range-order':
      return 'Dose rate range is out of order';
    case 'delay-range-order':
      return 'Delay range is out of order';
    case 'missing-hazard-weight':
      return 'Hazard weight is missing';
    case 'emphasis-weight':
      return 'Emphasised hazard weight is not above the others';
    case 'dose-baseline-midpoint':
      return 'Dose rate baseline is not at the midpoint';
    case 'co2-baseline-hits-limit':
      return 'Cabin CO2 baseline reaches a hard limit';
    case 'environment-dose-order':
      return 'Environment dose rates are out of order';
    case 'crew-count':
      return 'Wrong number of crew profiles';
    case 'duplicate-baseline':
      return 'Duplicate baseline';
    case 'athlete-missing':
      return 'No athlete profile';
    case 'demo-duration':
      return 'Demo is longer than allowed';
    case 'demo-unknown-scenario':
      return 'Demo names an unknown scenario';
    case 'demo-day-range':
      return 'Demo day is outside the scenario';
    case 'demo-day-order':
      return 'Demo first day is after its last day';
    case 'demo-focus-not-in-crew':
      return 'Demo focus astronaut is not in the scenario crew';
    case 'demo-step-order':
      return 'Demo plan steps are not ascending';
    default: {
      const unreachable: never = code;
      return unreachable;
    }
  }
}
