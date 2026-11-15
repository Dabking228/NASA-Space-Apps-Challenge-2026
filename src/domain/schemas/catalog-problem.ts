import { z } from 'zod';

export const CatalogProblemCodeSchema = z.enum([
  // Any Zod issue without a more specific code.
  'schema',
  'duplicate-indicator-id',
  'duplicate-cluster-id',
  'missing-verification-flags',
  'missing-mapping',
  'limit-order',
  'sd-order',
  'unknown-body-system',
  'unknown-hazard',
  'unknown-indicator-ref',
  'unapproved-source',
]);
export type CatalogProblemCode = z.infer<typeof CatalogProblemCodeSchema>;

// Every field is a string, so a problem survives a JSON round trip unchanged.
export const CatalogProblemSchema = z.strictObject({
  code: CatalogProblemCodeSchema,
  entryKind: z.enum(['indicator', 'cluster', 'config']),
  // The entry id, `indicators[3]` when it has no id, or `engine-config`.
  entryId: z.string().min(1),
  // Dotted path, for example `hardLimits.red` or `members.2.indicatorId`.
  field: z.string(),
  // Plain language. Quotes the offending value where one exists.
  message: z.string().min(1),
});
export type CatalogProblem = z.infer<typeof CatalogProblemSchema>;
