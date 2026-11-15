import { z } from 'zod';

export const SourceReferenceSchema = z.strictObject({
  id: z.string().min(1),
  citation: z.string().min(1),
  url: z.url().optional(),
});
export type SourceReference = z.infer<typeof SourceReferenceSchema>;
