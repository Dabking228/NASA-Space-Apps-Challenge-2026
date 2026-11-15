import type { ConfidenceConfig } from '../schemas/config';
import type { Confidence } from '../schemas/vocabulary';
import { CONFIDENCE_ORDER } from '../tiers';

export interface ConfidenceFactors {
  readonly missingData: boolean;
  readonly poorQuality: boolean;
  readonly singleSignal: boolean;
  readonly supportingSignal: boolean;
}

/**
 * Confidence of a finding. Starts at `cfg.start`, loses the configured steps
 * for each reduction factor that is true (once each) and regains
 * `supportBonusSteps` for a supporting signal. The result is clamped between
 * low and high. A configured step of 0 is allowed.
 */
export function evaluateConfidence(
  factors: ConfidenceFactors,
  cfg: ConfidenceConfig,
): Confidence {
  const reduction =
    (factors.missingData ? cfg.steps.missingData : 0) +
    (factors.poorQuality ? cfg.steps.poorQuality : 0) +
    (factors.singleSignal ? cfg.steps.singleSignal : 0);
  const bonus = factors.supportingSignal ? cfg.supportBonusSteps : 0;
  const score = CONFIDENCE_ORDER.indexOf(cfg.start) - reduction + bonus;
  const clamped = Math.min(Math.max(score, 0), CONFIDENCE_ORDER.length - 1);

  // Highest level at or below the clamped score. Starts at the floor.
  return CONFIDENCE_ORDER.reduce<Confidence>(
    (result, level, position) => (position <= clamped ? level : result),
    'low',
  );
}
