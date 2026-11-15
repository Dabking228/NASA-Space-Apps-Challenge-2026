/** Ascending copy of the values. The argument is never modified. */
function ascending(values: readonly number[]): readonly number[] {
  return values.toSorted((a, b) => a - b);
}

/**
 * Arithmetic mean. Sums over an ascending copy, so the result does not depend on input order.
 * An empty list returns 0 so callers never receive NaN; callers that need a mean check the count first.
 */
export function meanOf(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const total = ascending(values).reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

/**
 * Sample standard deviation (divides by n - 1). Returns 0 for fewer than two values.
 * The variance is clamped at zero before the square root, so the result is never negative or NaN.
 */
export function sampleSd(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const mean = meanOf(values);
  const sumOfSquares = ascending(values)
    .map((value) => (value - mean) ** 2)
    .reduce((sum, square) => sum + square, 0);
  const variance = sumOfSquares / (values.length - 1);
  return Math.sqrt(Math.max(0, variance));
}
