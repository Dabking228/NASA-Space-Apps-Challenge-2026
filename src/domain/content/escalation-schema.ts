import { z } from 'zod';

/** The scripted acknowledgement the ground sends, chosen by the highest tier in the summary. */
export const ScriptedReplyIdSchema = z.enum([
  'reply-green',
  'reply-yellow',
  'reply-orange',
  'reply-red',
]);
export type ScriptedReplyId = z.infer<typeof ScriptedReplyIdSchema>;

/** Where a message is on its way to the ground and back. Derived from the link clock, never stored. */
export const MessageStageSchema = z.enum([
  'queued',
  'transmitting',
  'delivered',
  'reply-received',
]);
export type MessageStage = z.infer<typeof MessageStageSchema>;

// The same two rules as the simulation's blackout rules. The domain layer must not import
// from the simulation layer, so the names are repeated here.
export const BlackoutWordingKeySchema = z.enum(['conjunction', 'signal-gaps']);
export type BlackoutWordingKey = z.infer<typeof BlackoutWordingKeySchema>;

/** Titles of the sections of the escalation summary (Requirement 31.1). */
export const SummarySectionTitlesSchema = z.strictObject({
  whoAndWhen: z.string().min(1),
  environmentAndDay: z.string().min(1),
  findings: z.string().min(1),
  trends: z.string().min(1),
  context: z.string().min(1),
  actionsTaken: z.string().min(1),
});
export type SummarySectionTitles = Readonly<
  z.infer<typeof SummarySectionTitlesSchema>
>;

/** Ground link wording and demo behaviour (FD-11). */
export const EscalationContentSchema = z.strictObject({
  // One-way delay in link-seconds where the environment has no delay figure (ISS).
  issDemoDelayLinkSeconds: z.strictObject({
    value: z.int().positive(),
    source: z.literal('proposed-default'),
  }),
  // Shown next to the demo delay so that it is not read as a real figure.
  demoDelayLabel: z.string().min(1),
  // Label of the reply card.
  scriptedReplyLabel: z.string().min(1),
  // Zod 4 requires every key of the enum for a record keyed by an enum.
  scriptedReplies: z.record(ScriptedReplyIdSchema, z.string().min(1)),
  stageLabels: z.record(MessageStageSchema, z.string().min(1)),
  blackoutWording: z.record(BlackoutWordingKeySchema, z.string().min(1)),
  // Shown while the link is unavailable.
  queueWording: z.string().min(1),
  summarySectionTitles: SummarySectionTitlesSchema,
});
export type EscalationContent = Readonly<
  z.infer<typeof EscalationContentSchema>
>;
