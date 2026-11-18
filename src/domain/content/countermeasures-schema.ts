import { z } from 'zod';
import { SourceReferenceSchema } from '../schemas/source';
import {
  BodySystemSchema,
  VerificationFlagSchema,
} from '../schemas/vocabulary';

export const CountermeasureTaskSchema = z.strictObject({
  id: z.string().min(1),
  title: z.string().min(1),
  why: z.string().min(1),
  howSteps: z.array(z.string().min(1)).min(1),
  system: BodySystemSchema,
  // True for a task that belongs in the daily list.
  daily: z.boolean(),
  // The task is suggested while any of these systems is yellow or worse.
  suggestedWhen: z.array(BodySystemSchema),
  // Environment ids where the task applies. Absent means every environment.
  environments: z.array(z.string().min(1)).min(1).optional(),
  verification: VerificationFlagSchema,
  // An empty array means unverified, and is valid.
  sources: z.array(SourceReferenceSchema),
});
export type CountermeasureTask = Readonly<
  z.infer<typeof CountermeasureTaskSchema>
>;

export const CountermeasuresSchema = z
  .array(CountermeasureTaskSchema)
  .min(1)
  .refine((tasks) => tasks.some((task) => task.daily), {
    message: 'At least one countermeasure must have daily set to true.',
  });
export type Countermeasures = Readonly<z.infer<typeof CountermeasuresSchema>>;
