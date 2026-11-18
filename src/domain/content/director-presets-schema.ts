import { z } from 'zod';

/** Where the preset values come from: a shipped scenario, or a proposal to review (FD-14). */
export const DirectorPresetOriginSchema = z.enum([
  'from-scenario',
  'proposed-default',
]);
export type DirectorPresetOrigin = z.infer<typeof DirectorPresetOriginSchema>;

/**
 * A plain event payload with a `type` string and the event's parameters. It holds no
 * `day`: the day field of the director panel adds it. The simulation validates the
 * finished event, so this schema only checks the parts the panel relies on.
 */
export const DirectorPayloadSchema = z.looseObject({
  type: z.string().min(1),
  day: z.never().optional(),
});
export type DirectorPayload = Readonly<z.infer<typeof DirectorPayloadSchema>>;

export const DirectorPresetSchema = z.strictObject({
  id: z.string().min(1),
  label: z.string().min(1),
  payload: DirectorPayloadSchema,
  origin: DirectorPresetOriginSchema,
});
export type DirectorPreset = Readonly<z.infer<typeof DirectorPresetSchema>>;

export const DirectorPresetsSchema = z.array(DirectorPresetSchema).min(1);
export type DirectorPresets = Readonly<z.infer<typeof DirectorPresetsSchema>>;
