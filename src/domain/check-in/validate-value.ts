import type { IndicatorDefinition } from '../schemas/indicator';
import type { Result } from '../result';
import { formatNumber } from '../rules/text';

/** The part of an indicator definition the check-in validation reads. */
export type CheckInValueDefinition = Readonly<
  Pick<IndicatorDefinition, 'label' | 'validRange'>
>;

/** A check-in value problem. `field` is the indicator label shown to the user. */
export interface CheckInValueError {
  readonly field: string;
  readonly message: string;
}

/**
 * Checks the text a user typed for one check-in field.
 *
 * - The text is trimmed. Empty or blank text fails, because `Number('')` is 0.
 * - The text must parse to a finite number. `NaN` and infinities fail.
 * - When the definition has a `validRange`, the number must lie inside it, with
 *   `min` and `max` inclusive. The range comes from the catalog value passed in.
 * - When the definition has no `validRange`, any finite number is accepted. Only
 *   indicators with a stated scale carry a range, and the engine's own range
 *   check stays the final guard after saving (Requirement 24.5).
 *
 * The message names the field and the allowed range, for example
 * "Daily mood must be a number from 1 to 5.". Pure and never throws.
 */
export function validateCheckInValue(
  text: string,
  definition: CheckInValueDefinition,
): Result<number, CheckInValueError> {
  const { label, validRange } = definition;
  const trimmed = text.trim();
  const value = trimmed === '' ? Number.NaN : Number(trimmed);

  if (Number.isFinite(value)) {
    if (
      validRange === undefined ||
      (value >= validRange.min && value <= validRange.max)
    ) {
      return { ok: true, value };
    }
  }

  const expected =
    validRange === undefined
      ? 'a number'
      : `a number from ${formatNumber(validRange.min)} to ${formatNumber(validRange.max)}`;
  return {
    ok: false,
    error: { field: label, message: `${label} must be ${expected}.` },
  };
}
