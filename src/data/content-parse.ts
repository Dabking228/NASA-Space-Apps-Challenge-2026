import type { z } from 'zod';

/**
 * Parses the value of a content file with its schema at module load.
 * On failure it throws an error that names the file and each field path, so the
 * dev server and the build stop (Requirement 9.3). This is the one place a
 * content file may throw. The style matches `src/data/indicators/index.ts`.
 */
export function parseContent<S extends z.ZodType>(
  fileName: string,
  schema: S,
  value: z.input<S>,
): z.output<S> {
  const parsed = schema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }
  const { issues } = parsed.error;
  const lines = issues.map((issue) => {
    const field =
      issue.path.length === 0 ? '(whole file)' : issue.path.join('.');
    return `- field ${field}: ${issue.message}`;
  });
  throw new Error(
    `The content file ${fileName} is invalid (${issues.length} problem${issues.length === 1 ? '' : 's'}):\n${lines.join('\n')}`,
  );
}
