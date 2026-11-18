import { z } from 'zod';
import { SourceReferenceSchema } from '../schemas/source';
import {
  SymptomKindSchema,
  VerificationFlagSchema,
} from '../schemas/vocabulary';

/** One value field of a measurement step. Blood pressure has two. */
export const CheckInFieldSchema = z.strictObject({
  // Catalog id of the indicator that this field fills.
  indicatorId: z.string().min(1),
  label: z.string().min(1),
  // Null when the value has no unit, such as a 1 to 5 scale.
  unit: z.string().min(1).nullable(),
});
export type CheckInField = Readonly<z.infer<typeof CheckInFieldSchema>>;

/** One measurement step. The order of the steps is the order of the array. */
export const CheckInStepSchema = z.strictObject({
  id: z.string().min(1),
  title: z.string().min(1),
  // Plain steps. The view numbers them.
  instructions: z.array(z.string().min(1)).min(1),
  fields: z.array(CheckInFieldSchema).min(1),
  verification: VerificationFlagSchema,
  // An empty array means unverified, and is valid.
  sources: z.array(SourceReferenceSchema),
});
export type CheckInStep = Readonly<z.infer<typeof CheckInStepSchema>>;

/** The optional symptom step that follows the measurement steps. */
export const SymptomStepSchema = z.strictObject({
  id: z.string().min(1),
  title: z.string().min(1),
  intro: z.string().min(1),
  // Zod 4 requires every symptom kind as a key when the key schema is an enum.
  symptomLabels: z.record(SymptomKindSchema, z.string().min(1)),
  verification: VerificationFlagSchema,
  // An empty array means unverified, and is valid.
  sources: z.array(SourceReferenceSchema),
});
export type SymptomStep = Readonly<z.infer<typeof SymptomStepSchema>>;

/** Check-in wording (FD-6). There is no safety-flag input. */
export const CheckInContentSchema = z.strictObject({
  steps: z.array(CheckInStepSchema).min(1),
  symptomStep: SymptomStepSchema,
  // Fixed text shown when chest pain or fainting is selected.
  emergencyNote: z.string().min(1),
});
export type CheckInContent = Readonly<z.infer<typeof CheckInContentSchema>>;
