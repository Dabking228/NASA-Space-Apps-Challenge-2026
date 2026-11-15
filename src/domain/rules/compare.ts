import type { Comparison } from '../schemas/indicator';

/** Applies the operator exactly as stored: `gt` is strict, `gte` is inclusive. */
export function compare(value: number, comparison: Comparison): boolean {
  const { op } = comparison;
  switch (op) {
    case 'gt':
      return value > comparison.value;
    case 'gte':
      return value >= comparison.value;
    case 'lt':
      return value < comparison.value;
    case 'lte':
      return value <= comparison.value;
    default: {
      const unreachable: never = op;
      return unreachable;
    }
  }
}
