import type { Result } from '../result';
import type { CatalogProblem } from '../schemas/catalog-problem';
import { ClusterDefinitionSchema } from '../schemas/cluster';
import type { ClusterDefinition } from '../schemas/cluster';
import { EngineConfigSchema } from '../schemas/config';
import type { EngineConfig } from '../schemas/config';
import { IndicatorDefinitionSchema } from '../schemas/indicator';
import type { IndicatorDefinition, IndicatorDraft } from '../schemas/indicator';
import type {
  BodySystem,
  Hazard,
  VerificationFlag,
} from '../schemas/vocabulary';
import { validateCatalog } from './validate-catalog';

const CONFIG_ENTRY_ID = 'engine-config';

/** The fields a draft lacks: hazards, body system and the mapping verification flags. */
export interface IndicatorMappingEntry {
  readonly hazards: readonly Hazard[];
  readonly system: BodySystem;
  readonly verification: { readonly mapping: readonly VerificationFlag[] };
}

/** Mapping entries keyed by indicator id. */
export type IndicatorMapping = Readonly<Record<string, IndicatorMappingEntry>>;

/**
 * Validated indicator definitions. `buildCatalog` is the only way to obtain one,
 * so the engine only ever receives data that passed `validateCatalog`.
 */
export interface Catalog {
  readonly indicators: readonly IndicatorDefinition[];
  readonly byId: ReadonlyMap<string, IndicatorDefinition>;
}

/** The validated, parsed values `buildCatalog` returns on success. */
export interface BuiltCatalog {
  readonly catalog: Catalog;
  readonly clusters: readonly ClusterDefinition[];
  readonly config: EngineConfig;
}

interface SchemaFailureIssue {
  readonly path: readonly PropertyKey[];
  readonly message: string;
}

function schemaFailure(
  entryKind: CatalogProblem['entryKind'],
  entryId: string,
  issues: readonly SchemaFailureIssue[],
): readonly CatalogProblem[] {
  return issues.map((issue) => ({
    code: 'schema',
    entryKind,
    entryId,
    field: issue.path.map((key) => String(key)).join('.'),
    message: issue.message,
  }));
}

/** Pairs each draft with its mapping entry. Drafts without one are reported, not merged. */
function mergeDrafts(
  drafts: readonly IndicatorDraft[],
  mapping: IndicatorMapping,
): { merged: readonly unknown[]; missing: readonly CatalogProblem[] } {
  const entries: ReadonlyMap<string, IndicatorMappingEntry> = new Map(
    Object.entries(mapping),
  );
  const merged = drafts.flatMap((draft) => {
    const entry = entries.get(draft.id);
    return entry === undefined
      ? []
      : [
          {
            ...draft,
            hazards: entry.hazards,
            system: entry.system,
            verification: {
              ...draft.verification,
              mapping: entry.verification.mapping,
            },
          },
        ];
  });
  const missing = drafts.flatMap((draft): readonly CatalogProblem[] =>
    entries.has(draft.id)
      ? []
      : [
          {
            code: 'missing-mapping',
            entryKind: 'indicator',
            entryId: draft.id,
            field: 'mapping',
            message: `Indicator "${draft.id}" has no entry in the indicator mapping. Add one with hazards, system and verification.mapping.`,
          },
        ],
  );
  return { merged, missing };
}

/**
 * Merges drafts with the mapping, validates everything and returns the parsed
 * values (schema defaults applied), or every problem found. Never throws.
 */
export function buildCatalog(
  drafts: readonly IndicatorDraft[],
  mapping: IndicatorMapping,
  clusters: readonly ClusterDefinition[],
  config: EngineConfig,
  approvedSourceIds: readonly string[],
): Result<BuiltCatalog, readonly CatalogProblem[]> {
  const { merged, missing } = mergeDrafts(drafts, mapping);
  const problems = [
    ...missing,
    ...validateCatalog({
      indicators: merged,
      clusters,
      config,
      approvedSourceIds,
    }),
  ];
  if (problems.length > 0) {
    return { ok: false, error: problems };
  }

  // Parse the validated values so schema defaults are applied. A failure here
  // is not expected after validateCatalog, but is still reported as a value.
  const indicatorParses = merged.map((entry) =>
    IndicatorDefinitionSchema.safeParse(entry),
  );
  const clusterParses = clusters.map((cluster) =>
    ClusterDefinitionSchema.safeParse(cluster),
  );
  const configParse = EngineConfigSchema.safeParse(config);

  const parseProblems = [
    ...indicatorParses.flatMap((result, index) =>
      result.success
        ? []
        : schemaFailure(
            'indicator',
            drafts[index]?.id ?? `indicators[${index}]`,
            result.error.issues,
          ),
    ),
    ...clusterParses.flatMap((result, index) =>
      result.success
        ? []
        : schemaFailure(
            'cluster',
            clusters[index]?.id ?? `clusters[${index}]`,
            result.error.issues,
          ),
    ),
    ...(configParse.success
      ? []
      : schemaFailure('config', CONFIG_ENTRY_ID, configParse.error.issues)),
  ];
  if (parseProblems.length > 0 || !configParse.success) {
    return { ok: false, error: parseProblems };
  }

  const indicators = indicatorParses.flatMap((result) =>
    result.success ? [result.data] : [],
  );
  const parsedClusters = clusterParses.flatMap((result) =>
    result.success ? [result.data] : [],
  );
  return {
    ok: true,
    value: {
      catalog: {
        indicators,
        byId: new Map(
          indicators.map((indicator): [string, IndicatorDefinition] => [
            indicator.id,
            indicator,
          ]),
        ),
      },
      clusters: parsedClusters,
      config: configParse.data,
    },
  };
}

/** Indicators whose definition lists the hazard, in catalog order. */
export function indicatorsForHazard(
  catalog: Catalog,
  hazard: Hazard,
): readonly IndicatorDefinition[] {
  return catalog.indicators.filter((indicator) =>
    indicator.hazards.includes(hazard),
  );
}

/** Indicators that belong to the body system, in catalog order. */
export function indicatorsForSystem(
  catalog: Catalog,
  system: BodySystem,
): readonly IndicatorDefinition[] {
  return catalog.indicators.filter((indicator) => indicator.system === system);
}
