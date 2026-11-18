import type { Catalog } from '@/domain/indicators/build-catalog';
import type { EngineConfig } from '@/domain/schemas/config';
import { DemoPackSchema } from '../demo-packs/demo-pack-schema';
import type { DemoPack, DemoSegment } from '../demo-packs/demo-pack-schema';
import type { SimulationLibrary } from '../library';
import { makeProblem } from './problem';
import type { SimulationProblem } from './problem';

const UNKNOWN_ENTRY_ID = 'unknown';
// Requirement 19.7: the target durations of all segments sum to at most 180 seconds.
const MAX_DEMO_SECONDS = 180;

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

function checkTotalDuration(pack: DemoPack): readonly SimulationProblem[] {
  const total = pack.segments.reduce(
    (sum, segment) => sum + segment.targetSeconds,
    0,
  );
  if (total <= MAX_DEMO_SECONDS) {
    return [];
  }
  return [
    makeProblem(
      'demo-duration',
      'demo-pack',
      pack.id,
      'segments',
      `The target durations add up to ${total} seconds, which is above the limit of ${MAX_DEMO_SECONDS} seconds.`,
    ),
  ];
}

function checkStepOrder(
  pack: DemoPack,
  segment: DemoSegment,
  index: number,
): readonly SimulationProblem[] {
  const previous = index === 0 ? undefined : pack.segments[index - 1];
  if (previous === undefined || segment.planStep > previous.planStep) {
    return [];
  }
  return [
    makeProblem(
      'demo-step-order',
      'demo-pack',
      pack.id,
      `segments.${index}.planStep`,
      `Segment "${segment.id}" has plan step ${segment.planStep}, which is not above plan step ${previous.planStep} of the segment before it.`,
    ),
  ];
}

function checkDayOrder(
  pack: DemoPack,
  segment: DemoSegment,
  index: number,
): readonly SimulationProblem[] {
  if (segment.firstDay <= segment.lastDay) {
    return [];
  }
  return [
    makeProblem(
      'demo-day-order',
      'demo-pack',
      pack.id,
      `segments.${index}.firstDay`,
      `Segment "${segment.id}" has first day ${segment.firstDay}, which is after its last day ${segment.lastDay}.`,
    ),
  ];
}

function checkSegmentAgainstScenario(
  pack: DemoPack,
  segment: DemoSegment,
  index: number,
  library: SimulationLibrary,
): readonly SimulationProblem[] {
  const scenario = library.scenarios.find(
    (candidate) => candidate.id === segment.scenarioId,
  );
  if (scenario === undefined) {
    return [
      makeProblem(
        'demo-unknown-scenario',
        'demo-pack',
        pack.id,
        `segments.${index}.scenarioId`,
        `Segment "${segment.id}" names scenario "${segment.scenarioId}", which is not in the library.`,
      ),
    ];
  }
  // Mission days run from 0 to durationDays - 1.
  const lastValidDay = scenario.durationDays - 1;
  const dayProblems = (['firstDay', 'lastDay'] as const).flatMap(
    (field): readonly SimulationProblem[] =>
      segment[field] > lastValidDay
        ? [
            makeProblem(
              'demo-day-range',
              'demo-pack',
              pack.id,
              `segments.${index}.${field}`,
              `Segment "${segment.id}" has ${field} ${segment[field]}, but scenario "${scenario.id}" lasts ${scenario.durationDays} days (days 0 to ${lastValidDay}).`,
            ),
          ]
        : [],
  );
  const focusProblems: readonly SimulationProblem[] = scenario.crew.includes(
    segment.focusAstronautId,
  )
    ? []
    : [
        makeProblem(
          'demo-focus-not-in-crew',
          'demo-pack',
          pack.id,
          `segments.${index}.focusAstronautId`,
          `Segment "${segment.id}" focuses on astronaut "${segment.focusAstronautId}", who is not in the crew of scenario "${scenario.id}".`,
        ),
      ];
  return [...dayProblems, ...focusProblems];
}

/**
 * Checks one demo pack against the library. Starts with a schema parse, then runs the
 * consistency checks on data that parsed. The 180-second limit applies to the sum of all
 * segment target durations. Never throws.
 * `_catalog` and `_config` are accepted for the common validator signature; no demo pack
 * check reads them.
 */
export function validateDemoPack(
  pack: unknown,
  library: SimulationLibrary,
  _catalog: Catalog,
  _config: EngineConfig,
): readonly SimulationProblem[] {
  void _catalog;
  void _config;
  const parsed = DemoPackSchema.safeParse(pack);
  if (!parsed.success) {
    const entryId = readEntryId(pack);
    return parsed.error.issues.map((issue) =>
      makeProblem(
        'schema',
        'demo-pack',
        entryId,
        issue.path.map((key) => String(key)).join('.'),
        issue.message,
      ),
    );
  }
  const data = parsed.data;
  return [
    ...checkTotalDuration(data),
    ...data.segments.flatMap((segment, index) => [
      ...checkStepOrder(data, segment, index),
      ...checkDayOrder(data, segment, index),
      ...checkSegmentAgainstScenario(data, segment, index, library),
    ]),
  ];
}
