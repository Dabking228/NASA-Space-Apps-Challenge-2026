import type { DomainError, Result } from '../result';
import type { ComparisonOp, FindingTier } from '../schemas/indicator';

/**
 * The words and steps `buildFindings` turns into reasons and actions.
 * The values live in `src/data/finding-text.ts`, typed `satisfies FindingText`.
 *
 * Templates use `{name}` placeholders. A placeholder that is not listed for its
 * template is an error at run time (`renderTemplate`), so a typo never reaches the
 * screen as silent text. Numbers are shown with at most two decimals. Values
 * marked "quantity" already include their unit.
 *
 * `indicatorReason` (one per indicator finding; also used once per indicator
 * inside a cluster reason):
 * - `{label}`: indicator label, for example "Resting heart rate"
 * - `{value}`: the reading value (number, no unit)
 * - `{unit}`: the indicator unit
 * - `{day}`: the Mission_Day of the reading
 * - `{ruleSentences}`: the rendered `ruleSentences` for every rule hit, joined
 *   with a space. Empty when no rule hit is known.
 *
 * `clusterReason`:
 * - `{cluster}`: cluster label
 * - `{tier}`: cluster tier (yellow, orange or red)
 * - `{day}`: the as-of Mission_Day
 * - `{windowDays}`: the cluster window length in days
 * - `{evidence}`: one `indicatorReason` sentence per contributing indicator,
 *   joined with a space. Empty when no indicator contributes.
 * - `{symptoms}`: the reported symptom kinds that satisfied the cluster, written
 *   with spaces ("headache", "vision blurring or acuity change"). Empty when no
 *   symptom contributes.
 *
 * `ruleSentences`. All five also receive `{label}`, `{value}`, `{unit}` (as
 * above) and `{tier}` (the tier that rule gave):
 * - `hardLimit`: `{op}` (word from `opWords`) and `{limit}` (quantity)
 * - `sequence`: `{op}`, `{threshold}` (quantity; "5× background" for a
 *   dose-rate multiple) and `{periods}` (number of consecutive periods)
 * - `conditional`: `{trigger}`: the symptom kinds written with spaces and joined
 *   by "or", "any symptom", or "safety flag"
 * - `context`: `{detail}`: a short phrase such as "at or above 80% of the
 *   remaining career allowance" or "a solar particle event alert is active"
 * - `deviation`: `{mean}` and `{sd}` (the baseline), `{difference}` (distance
 *   from the mean, always positive), `{direction}` ("above" or "below"),
 *   `{yellowSd}` and `{orangeSd}`
 *
 * `opWords` has one word per comparison operator ("above", "at or above",
 * "below", "at or below").
 *
 * `tierSteps` are the PROJECT.md section 8 behaviours as ordered steps. They
 * are numbered when the action is built. `clusterSteps` maps a cluster id to
 * steps that come first. The possible-CO₂-exposure steps start with "check the
 * environment". Steps are plain text and take no placeholders.
 */
export interface FindingText {
  readonly indicatorReason: string;
  readonly clusterReason: string;
  readonly opWords: Readonly<Record<ComparisonOp, string>>;
  readonly ruleSentences: {
    readonly hardLimit: string;
    readonly sequence: string;
    readonly conditional: string;
    readonly context: string;
    readonly deviation: string;
  };
  readonly tierSteps: Readonly<Record<FindingTier, readonly string[]>>;
  readonly clusterSteps: Readonly<Record<string, readonly string[]>>;
}

/** The word for a comparison operator. */
export function opWord(
  op: ComparisonOp,
  words: FindingText['opWords'],
): string {
  switch (op) {
    case 'gt':
      return words.gt;
    case 'gte':
      return words.gte;
    case 'lt':
      return words.lt;
    case 'lte':
      return words.lte;
    default: {
      const unreachable: never = op;
      return unreachable;
    }
  }
}

/** A number with at most two decimals and no trailing zeros. */
export function formatNumber(value: number): string {
  return String(Number(value.toFixed(2)));
}

const PLACEHOLDER = /\{([^{}]*)\}/g;

/**
 * Replaces every `{name}` with its value in one pass, so a value that contains
 * braces is never expanded again. Numbers are written with `formatNumber`.
 * Returns an `invalid-input` error that names every unknown placeholder.
 */
export function renderTemplate(
  template: string,
  values: Readonly<Record<string, string | number>>,
): Result<string, DomainError> {
  const known = new Map(Object.entries(values));
  const unknown = Array.from(
    new Set(
      Array.from(template.matchAll(PLACEHOLDER), (match) => match[1]).filter(
        (name) => !known.has(name),
      ),
    ),
  );
  const first = unknown.at(0);
  if (first !== undefined) {
    return {
      ok: false,
      error: {
        code: 'invalid-input',
        field: `placeholder.${first}`,
        message: `Unknown placeholder ${unknown.map((name) => `{${name}}`).join(', ')} in template "${template}".`,
      },
    };
  }

  return {
    ok: true,
    value: template.replace(PLACEHOLDER, (_whole, name: string) => {
      const value = known.get(name);
      return typeof value === 'number' ? formatNumber(value) : (value ?? '');
    }),
  };
}
