/** A value or an error. Domain functions return this instead of throwing on caller data. */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

/** Errors the engine reports as values. Each `message` names the offending id or field. */
export type DomainError =
  | { code: 'unknown-indicator'; indicatorId: string; message: string }
  | {
      code: 'baseline-unavailable';
      astronautId: string;
      indicatorId: string;
      message: string;
    }
  | {
      code: 'duplicate-reading';
      astronautId: string;
      indicatorId: string;
      day: number;
      message: string;
    }
  | {
      code: 'value-out-of-range';
      indicatorId: string;
      day: number;
      message: string;
    }
  | { code: 'invalid-input'; field: string; message: string };
