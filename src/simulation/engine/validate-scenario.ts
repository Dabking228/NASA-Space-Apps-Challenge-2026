import type { Catalog } from '@/domain/indicators/build-catalog';
import type { ClusterDefinition } from '@/domain/schemas/cluster';
import type { EngineConfig } from '@/domain/schemas/config';
import type { ScenarioEvent } from '../events/event-schemas';
import type { SimulationLibrary } from '../library';
import { ScenarioSchema } from '../scenarios/scenario-schema';
import type {
  Scenario,
  StorylineExpectation,
} from '../scenarios/scenario-schema';
import { makeProblem } from './problem';
import type { SimulationProblem } from './problem';

const UNKNOWN_ENTRY_ID = 'unknown';
// Habitat_Indicators: shared by the whole crew, so they have no per-astronaut Signal_Spec.
const HABITAT_INDICATOR_IDS: readonly string[] = ['cabin-co2', 'dose-rate'];

/** The indicator an event changes, and whether that indicator belongs to the habitat. */
type EventTarget =
  | { readonly kind: 'none' }
  | { readonly kind: 'habitat'; readonly indicatorId: string }
  | { readonly kind: 'astronaut'; readonly indicatorId: string };

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

/** Which indicator each Event_Kind targets (Requirements 9 and 10). Ends with a `never` check. */
function eventTarget(event: ScenarioEvent): EventTarget {
  switch (event.type) {
    case 'drift':
      return HABITAT_INDICATOR_IDS.includes(event.indicator)
        ? { kind: 'habitat', indicatorId: event.indicator }
        : { kind: 'astronaut', indicatorId: event.indicator };
    case 'moodDip':
      return { kind: 'astronaut', indicatorId: 'mood' };
    case 'eva':
      return { kind: 'astronaut', indicatorId: 'resting-hr' };
    case 'equipmentOutage':
      return { kind: 'astronaut', indicatorId: 'exercise-adherence' };
    case 'co2Spike':
      return { kind: 'habitat', indicatorId: 'cabin-co2' };
    case 'solarParticleEvent':
      return { kind: 'habitat', indicatorId: 'dose-rate' };
    case 'symptom':
    case 'commsBlackout':
      return { kind: 'none' };
    default: {
      const unreachable: never = event;
      return unreachable;
    }
  }
}

/**
 * Duplicate means two or more library scenarios share the id. A single library entry with the
 * id is not a duplicate, because the runner validates a library scenario and the editor
 * validates a changed copy of one, and both carry the id of the library original.
 */
function checkDuplicateId(
  scenario: Scenario,
  library: SimulationLibrary,
): readonly SimulationProblem[] {
  const count = library.scenarios.filter(
    (candidate) => candidate.id === scenario.id,
  ).length;
  return count >= 2
    ? [
        makeProblem(
          'duplicate-id',
          'scenario',
          scenario.id,
          'id',
          `Scenario id "${scenario.id}" is used by ${count} scenarios in the library. Each scenario needs its own id.`,
        ),
      ]
    : [];
}

function checkEnvironment(
  scenario: Scenario,
  library: SimulationLibrary,
): readonly SimulationProblem[] {
  return library.environments.some(
    (environment) => environment.id === scenario.environmentId,
  )
    ? []
    : [
        makeProblem(
          'unknown-environment',
          'scenario',
          scenario.id,
          'environmentId',
          `Environment "${scenario.environmentId}" is not in the library.`,
        ),
      ];
}

function checkCrew(
  scenario: Scenario,
  library: SimulationLibrary,
): readonly SimulationProblem[] {
  return scenario.crew.flatMap(
    (crewId, index): readonly SimulationProblem[] => {
      const unknown: readonly SimulationProblem[] = library.crew.some(
        (profile) => profile.id === crewId,
      )
        ? []
        : [
            makeProblem(
              'unknown-crew',
              'scenario',
              scenario.id,
              `crew.${index}`,
              `Crew member "${crewId}" is not in the library.`,
            ),
          ];
      const duplicate: readonly SimulationProblem[] =
        scenario.crew.indexOf(crewId) === index
          ? []
          : [
              makeProblem(
                'duplicate-crew',
                'scenario',
                scenario.id,
                `crew.${index}`,
                `Crew member "${crewId}" is listed more than once in the crew.`,
              ),
            ];
      return [...unknown, ...duplicate];
    },
  );
}

function checkEventRange(
  scenario: Scenario,
  event: ScenarioEvent,
  index: number,
): readonly SimulationProblem[] {
  // Mission days run from 0 to durationDays - 1.
  return event.day >= scenario.durationDays
    ? [
        makeProblem(
          'event-out-of-range',
          'scenario',
          scenario.id,
          `events.${index}.day`,
          `Event ${index} (${event.type}) is dated day ${event.day}, but the scenario lasts ${scenario.durationDays} days (days 0 to ${scenario.durationDays - 1}).`,
        ),
      ]
    : [];
}

function checkEventIndicator(
  scenario: Scenario,
  event: ScenarioEvent,
  index: number,
  catalog: Catalog,
): readonly SimulationProblem[] {
  return event.type === 'drift' && !catalog.byId.has(event.indicator)
    ? [
        makeProblem(
          'unknown-indicator',
          'scenario',
          scenario.id,
          `events.${index}.indicator`,
          `Indicator "${event.indicator}" of event ${index} is not in the indicator catalog.`,
        ),
      ]
    : [];
}

function checkEventAstronauts(
  scenario: Scenario,
  event: ScenarioEvent,
  index: number,
): readonly SimulationProblem[] {
  if (!('astronauts' in event) || event.astronauts === undefined) {
    return [];
  }
  const listed = event.astronauts;
  const notInCrew = listed.flatMap(
    (astronautId, position): readonly SimulationProblem[] =>
      scenario.crew.includes(astronautId)
        ? []
        : [
            makeProblem(
              'astronaut-not-in-crew',
              'scenario',
              scenario.id,
              `events.${index}.astronauts.${position}`,
              `Astronaut "${astronautId}" of event ${index} (${event.type}) is not in the crew of scenario "${scenario.id}".`,
            ),
          ],
  );
  const onHabitat: readonly SimulationProblem[] =
    eventTarget(event).kind === 'habitat'
      ? [
          makeProblem(
            'astronaut-list-on-habitat-event',
            'scenario',
            scenario.id,
            `events.${index}.astronauts`,
            `Event ${index} (${event.type}) changes a habitat indicator, which the whole crew shares, so it cannot list astronauts.`,
          ),
        ]
      : [];
  return [...notInCrew, ...onHabitat];
}

/**
 * An event on an astronaut indicator needs a Signal_Spec for that indicator on each affected
 * astronaut: the listed ones, or the whole scenario crew when the list is omitted. An indicator
 * the catalog does not know is already reported as `unknown-indicator`, and a crew member the
 * library does not know as `unknown-crew`, so both are skipped here.
 */
function checkEventSignalSpecs(
  scenario: Scenario,
  event: ScenarioEvent,
  index: number,
  library: SimulationLibrary,
  catalog: Catalog,
): readonly SimulationProblem[] {
  const target = eventTarget(event);
  if (target.kind !== 'astronaut' || !catalog.byId.has(target.indicatorId)) {
    return [];
  }
  const listed = 'astronauts' in event ? event.astronauts : undefined;
  const affected = listed ?? scenario.crew;
  const field =
    event.type === 'drift'
      ? `events.${index}.indicator`
      : `events.${index}.type`;
  return affected.flatMap(
    (astronautId, position): readonly SimulationProblem[] => {
      const profile = library.crew.find(
        (candidate) => candidate.id === astronautId,
      );
      if (
        profile === undefined ||
        Object.keys(profile.signals).includes(target.indicatorId)
      ) {
        return [];
      }
      return [
        makeProblem(
          'event-without-signal-spec',
          'scenario',
          scenario.id,
          listed === undefined
            ? field
            : `events.${index}.astronauts.${position}`,
          `Event ${index} (${event.type}) targets "${target.indicatorId}", but astronaut "${astronautId}" has no signal spec for it.`,
        ),
      ];
    },
  );
}

function checkEvents(
  scenario: Scenario,
  library: SimulationLibrary,
  catalog: Catalog,
): readonly SimulationProblem[] {
  return scenario.events.flatMap((event, index) => [
    ...checkEventRange(scenario, event, index),
    ...checkEventIndicator(scenario, event, index, catalog),
    ...checkEventAstronauts(scenario, event, index),
    ...checkEventSignalSpecs(scenario, event, index, library, catalog),
  ]);
}

function checkExpectation(
  scenario: Scenario,
  expectation: StorylineExpectation,
  index: number,
  catalog: Catalog,
  clusters: readonly ClusterDefinition[],
): readonly SimulationProblem[] {
  const scopeProblems: readonly SimulationProblem[] =
    expectation.scope.who === 'astronaut' &&
    !scenario.crew.includes(expectation.scope.astronautId)
      ? [
          makeProblem(
            'unknown-expectation-target',
            'scenario',
            scenario.id,
            `expectations.${index}.scope.astronautId`,
            `Expectation ${index} names astronaut "${expectation.scope.astronautId}", who is not in the crew of scenario "${scenario.id}".`,
          ),
        ]
      : [];
  const targetProblems: readonly SimulationProblem[] =
    expectation.form === 'cluster'
      ? clusters.some((cluster) => cluster.id === expectation.clusterId)
        ? []
        : [
            makeProblem(
              'unknown-expectation-target',
              'scenario',
              scenario.id,
              `expectations.${index}.clusterId`,
              `Expectation ${index} names cluster "${expectation.clusterId}", which is not one of the cluster definitions.`,
            ),
          ]
      : catalog.byId.has(expectation.indicatorId)
        ? []
        : [
            makeProblem(
              'unknown-expectation-target',
              'scenario',
              scenario.id,
              `expectations.${index}.indicatorId`,
              `Expectation ${index} names indicator "${expectation.indicatorId}", which is not in the indicator catalog.`,
            ),
          ];
  return [...scopeProblems, ...targetProblems];
}

/**
 * Checks one scenario against the library, the catalog and the cluster definitions. Starts with
 * a schema parse, then runs the consistency checks on data that parsed and returns every problem
 * in one list. Never throws.
 * `_config` is accepted for the common validator signature; no scenario check reads it.
 */
export function validateScenario(
  scenario: unknown,
  library: SimulationLibrary,
  catalog: Catalog,
  _config: EngineConfig,
  clusters: readonly ClusterDefinition[],
): readonly SimulationProblem[] {
  void _config;
  const parsed = ScenarioSchema.safeParse(scenario);
  if (!parsed.success) {
    const entryId = readEntryId(scenario);
    return parsed.error.issues.map((issue) =>
      makeProblem(
        'schema',
        'scenario',
        entryId,
        issue.path.map((key) => String(key)).join('.'),
        issue.message,
      ),
    );
  }
  const data = parsed.data;
  return [
    ...checkDuplicateId(data, library),
    ...checkEnvironment(data, library),
    ...checkCrew(data, library),
    ...checkEvents(data, library, catalog),
    ...data.expectations.flatMap((expectation, index) =>
      checkExpectation(data, expectation, index, catalog, clusters),
    ),
  ];
}
