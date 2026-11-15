import type {
  CatalogProblem,
  CatalogProblemCode,
} from '../schemas/catalog-problem';
import { ClusterDefinitionSchema } from '../schemas/cluster';
import type { ClusterDefinition, ClusterMember } from '../schemas/cluster';
import { EngineConfigSchema } from '../schemas/config';
import type { EngineConfig } from '../schemas/config';
import { IndicatorDefinitionSchema } from '../schemas/indicator';
import type {
  Comparison,
  ComparisonOp,
  IndicatorDefinition,
} from '../schemas/indicator';
import type { SourceReference } from '../schemas/source';
import { BodySystemSchema, HazardSchema } from '../schemas/vocabulary';

/** Raw, not yet trusted catalog data. Unknown on purpose, so out-of-union values can be reported. */
export interface CatalogInput {
  /** Merged definitions (draft plus mapping). */
  readonly indicators: readonly unknown[];
  readonly clusters: readonly unknown[];
  readonly config: unknown;
  readonly approvedSourceIds: readonly string[];
}

const CONFIG_ENTRY_ID = 'engine-config';

type EntryKind = CatalogProblem['entryKind'];

/** One Zod issue, reduced to the parts this file reads. */
interface SchemaIssue {
  readonly code: string;
  readonly path: readonly PropertyKey[];
  readonly message: string;
}

/** One raw entry after the schema pass. `data` is undefined when parsing failed. */
interface ParsedEntry<T> {
  readonly entryId: string;
  readonly raw: unknown;
  readonly data: T | undefined;
  readonly issues: readonly SchemaIssue[];
}

function makeProblem(
  code: CatalogProblemCode,
  entryKind: EntryKind,
  entryId: string,
  field: string,
  message: string,
): CatalogProblem {
  return { code, entryKind, entryId, field, message };
}

/** The entry's own non-empty string id, or undefined. */
function readId(entry: unknown): string | undefined {
  if (typeof entry === 'object' && entry !== null && 'id' in entry) {
    const id = entry.id;
    if (typeof id === 'string' && id.length > 0) {
      return id;
    }
  }
  return undefined;
}

/** One step down a raw value. Missing or non-container parents give undefined. */
function readChild(parent: unknown, key: PropertyKey): unknown {
  if (Array.isArray(parent)) {
    return typeof key === 'number' ? parent[key] : undefined;
  }
  if (
    typeof parent === 'object' &&
    parent !== null &&
    typeof key === 'string'
  ) {
    return Object.getOwnPropertyDescriptor(parent, key)?.value;
  }
  return undefined;
}

function valueAtPath(root: unknown, path: readonly PropertyKey[]): unknown {
  return path.reduce<unknown>((current, key) => readChild(current, key), root);
}

function quoteValue(value: unknown): string {
  if (typeof value === 'string') {
    return `"${value}"`;
  }
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null ||
    value === undefined
  ) {
    return String(value);
  }
  return `a value of type ${typeof value}`;
}

function dotted(path: readonly PropertyKey[]): string {
  return path.map((key) => String(key)).join('.');
}

function isPath(path: readonly PropertyKey[], expected: readonly string[]) {
  return (
    path.length === expected.length &&
    expected.every((key, index) => path[index] === key)
  );
}

function parseEntries<T>(
  entries: readonly unknown[],
  fallbackPrefix: string,
  safeParse: (
    raw: unknown,
  ) =>
    | { success: true; data: T }
    | { success: false; error: { issues: readonly SchemaIssue[] } },
): readonly ParsedEntry<T>[] {
  return entries.map((raw, index) => {
    const entryId = readId(raw) ?? `${fallbackPrefix}[${index}]`;
    const result = safeParse(raw);
    return result.success
      ? { entryId, raw, data: result.data, issues: [] }
      : { entryId, raw, data: undefined, issues: result.error.issues };
  });
}

/** Maps one Zod issue to one problem. Two issue kinds get specific codes. */
function issueToProblem(
  entryKind: EntryKind,
  entry: ParsedEntry<unknown>,
  issue: SchemaIssue,
): CatalogProblem {
  const { entryId, raw } = entry;
  const field = dotted(issue.path);

  if (entryKind !== 'config' && issue.code === 'invalid_value') {
    const offending = quoteValue(valueAtPath(raw, issue.path));
    if (isPath(issue.path, ['system'])) {
      return makeProblem(
        'unknown-body-system',
        entryKind,
        entryId,
        field,
        `Body system ${offending} is not one of: ${BodySystemSchema.options.join(', ')}.`,
      );
    }
    if (issue.path.length === 2 && issue.path[0] === 'hazards') {
      return makeProblem(
        'unknown-hazard',
        entryKind,
        entryId,
        field,
        `Hazard ${offending} is not one of: ${HazardSchema.options.join(', ')}.`,
      );
    }
  }

  if (
    entryKind === 'indicator' &&
    issue.code === 'too_small' &&
    (isPath(issue.path, ['verification', 'thresholds']) ||
      isPath(issue.path, ['verification', 'mapping']))
  ) {
    return makeProblem(
      'missing-verification-flags',
      entryKind,
      entryId,
      field,
      `Indicator "${entryId}" has no verification flags in ${field}. List at least one of A, B or C.`,
    );
  }

  return makeProblem('schema', entryKind, entryId, field, issue.message);
}

function schemaProblems(
  entryKind: EntryKind,
  entries: readonly ParsedEntry<unknown>[],
): readonly CatalogProblem[] {
  return entries.flatMap((entry) =>
    entry.issues.map((issue) => issueToProblem(entryKind, entry, issue)),
  );
}

/** One problem per id that occurs more than once, in order of first appearance. */
function duplicateIdProblems(
  entryKind: 'indicator' | 'cluster',
  entries: readonly ParsedEntry<unknown>[],
): readonly CatalogProblem[] {
  const code: CatalogProblemCode =
    entryKind === 'indicator'
      ? 'duplicate-indicator-id'
      : 'duplicate-cluster-id';
  const counts = entries.reduce((acc, entry) => {
    const id = readId(entry.raw);
    return id === undefined ? acc : acc.set(id, (acc.get(id) ?? 0) + 1);
  }, new Map<string, number>());
  return Array.from(counts)
    .filter(([, count]) => count > 1)
    .map(([id, count]) =>
      makeProblem(
        code,
        entryKind,
        id,
        'id',
        `The ${entryKind} id "${id}" is used ${count} times. Ids must be unique.`,
      ),
    );
}

function unapprovedSourceProblems(
  entryKind: 'indicator' | 'cluster',
  entryId: string,
  sources: readonly SourceReference[],
  approved: ReadonlySet<string>,
): readonly CatalogProblem[] {
  return sources.flatMap((source, index) =>
    approved.has(source.id)
      ? []
      : [
          makeProblem(
            'unapproved-source',
            entryKind,
            entryId,
            `sources.${index}.id`,
            `Source id "${source.id}" is not in the approved source list.`,
          ),
        ],
  );
}

const OP_SYMBOLS = {
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
} satisfies Record<ComparisonOp, string>;

function describeLimit(limit: Comparison): string {
  return `${OP_SYMBOLS[limit.op]} ${limit.value}`;
}

type LimitSide = 'high' | 'low';

function sideOf(op: ComparisonOp): LimitSide {
  switch (op) {
    case 'gt':
    case 'gte':
      return 'high';
    case 'lt':
    case 'lte':
      return 'low';
    default: {
      const unreachable: never = op;
      return unreachable;
    }
  }
}

/**
 * True when every value that satisfies `red` also satisfies `orange`.
 * Both limits must be on the same side.
 */
function isRedAtLeastAsSevere(orange: Comparison, red: Comparison): boolean {
  if (sideOf(orange.op) === 'high') {
    return (
      red.value > orange.value ||
      (red.value === orange.value && !(orange.op === 'gt' && red.op === 'gte'))
    );
  }
  return (
    red.value < orange.value ||
    (red.value === orange.value && !(orange.op === 'lt' && red.op === 'lte'))
  );
}

function limitOrderProblems(
  definition: IndicatorDefinition,
): readonly CatalogProblem[] {
  const { orange, red } = definition.hardLimits;
  return red.flatMap((redLimit, redIndex) => {
    const orangeIndex = orange.findIndex(
      (orangeLimit) =>
        sideOf(orangeLimit.op) === sideOf(redLimit.op) &&
        !isRedAtLeastAsSevere(orangeLimit, redLimit),
    );
    const orangeLimit = orange[orangeIndex];
    return orangeLimit === undefined
      ? []
      : [
          makeProblem(
            'limit-order',
            'indicator',
            definition.id,
            'hardLimits.red',
            `Red limit ${redIndex} (${describeLimit(redLimit)}) is less severe than orange limit ${orangeIndex} (${describeLimit(orangeLimit)}) on the same side.`,
          ),
        ];
  });
}

function sdOrderProblems(
  definition: IndicatorDefinition,
  config: EngineConfig | undefined,
): readonly CatalogProblem[] {
  const deviation = definition.deviation;
  if (deviation === undefined) {
    return [];
  }
  const yellowSd = deviation.yellowSd ?? config?.deviationDefaults.yellowSd;
  const orangeSd = deviation.orangeSd ?? config?.deviationDefaults.orangeSd;
  if (
    yellowSd === undefined ||
    orangeSd === undefined ||
    orangeSd >= yellowSd
  ) {
    return [];
  }
  return [
    makeProblem(
      'sd-order',
      'indicator',
      definition.id,
      'deviation.orangeSd',
      `orangeSd (${orangeSd}) is below yellowSd (${yellowSd}). The orange step must not come before the yellow step.`,
    ),
  ];
}

function configSdOrderProblems(
  config: EngineConfig,
): readonly CatalogProblem[] {
  const { yellowSd, orangeSd } = config.deviationDefaults;
  return orangeSd >= yellowSd
    ? []
    : [
        makeProblem(
          'sd-order',
          'config',
          CONFIG_ENTRY_ID,
          'deviationDefaults.orangeSd',
          `orangeSd (${orangeSd}) is below yellowSd (${yellowSd}). The orange step must not come before the yellow step.`,
        ),
      ];
}

function memberRefProblems(
  entryId: string,
  group: 'members' | 'supporting',
  members: readonly ClusterMember[],
  knownIndicatorIds: ReadonlySet<string>,
): readonly CatalogProblem[] {
  return members.flatMap((member, index) => {
    switch (member.kind) {
      case 'indicator':
      case 'baseline-relative':
        return knownIndicatorIds.has(member.indicatorId)
          ? []
          : [
              makeProblem(
                'unknown-indicator-ref',
                'cluster',
                entryId,
                `${group}.${index}.indicatorId`,
                `Cluster member "${member.id}" names unknown indicator "${member.indicatorId}".`,
              ),
            ];
      case 'symptom':
        return [];
      default: {
        const unreachable: never = member;
        return unreachable;
      }
    }
  });
}

function clusterRefProblems(
  cluster: ClusterDefinition,
  knownIndicatorIds: ReadonlySet<string>,
): readonly CatalogProblem[] {
  const memberIds = new Set(
    [...cluster.members, ...cluster.supporting].map((member) => member.id),
  );
  const raiseProblems = cluster.tierRaises.flatMap((raise, index) =>
    memberIds.has(raise.memberId)
      ? []
      : [
          makeProblem(
            'unknown-indicator-ref',
            'cluster',
            cluster.id,
            `tierRaises.${index}.memberId`,
            `tierRaises entry ${index} names unknown cluster member "${raise.memberId}".`,
          ),
        ],
  );
  return [
    ...memberRefProblems(
      cluster.id,
      'members',
      cluster.members,
      knownIndicatorIds,
    ),
    ...memberRefProblems(
      cluster.id,
      'supporting',
      cluster.supporting,
      knownIndicatorIds,
    ),
    ...raiseProblems,
  ];
}

/**
 * Checks raw catalog data and returns every problem found, or an empty list.
 * Never throws. Problems are plain strings, so they survive a JSON round trip.
 * An empty `sources` array is valid and never reported.
 */
export function validateCatalog(
  input: CatalogInput,
): readonly CatalogProblem[] {
  const indicators = parseEntries(input.indicators, 'indicators', (raw) =>
    IndicatorDefinitionSchema.safeParse(raw),
  );
  const clusters = parseEntries(input.clusters, 'clusters', (raw) =>
    ClusterDefinitionSchema.safeParse(raw),
  );
  const configResult = EngineConfigSchema.safeParse(input.config);
  const config: ParsedEntry<EngineConfig> = {
    entryId: CONFIG_ENTRY_ID,
    raw: input.config,
    data: configResult.success ? configResult.data : undefined,
    issues: configResult.success ? [] : configResult.error.issues,
  };

  const approved: ReadonlySet<string> = new Set(input.approvedSourceIds);
  const knownIndicatorIds: ReadonlySet<string> = new Set(
    indicators.flatMap((entry) => readId(entry.raw) ?? []),
  );

  const indicatorProblems = indicators.flatMap(({ data }) =>
    data === undefined
      ? []
      : [
          ...limitOrderProblems(data),
          ...sdOrderProblems(data, config.data),
          ...unapprovedSourceProblems(
            'indicator',
            data.id,
            data.sources,
            approved,
          ),
        ],
  );
  const clusterProblems = clusters.flatMap(({ data }) =>
    data === undefined
      ? []
      : [
          ...clusterRefProblems(data, knownIndicatorIds),
          ...unapprovedSourceProblems(
            'cluster',
            data.id,
            data.sources,
            approved,
          ),
        ],
  );

  return [
    ...schemaProblems('indicator', indicators),
    ...schemaProblems('cluster', clusters),
    ...schemaProblems('config', [config]),
    ...duplicateIdProblems('indicator', indicators),
    ...duplicateIdProblems('cluster', clusters),
    ...indicatorProblems,
    ...clusterProblems,
    ...(config.data === undefined ? [] : configSdOrderProblems(config.data)),
  ];
}
