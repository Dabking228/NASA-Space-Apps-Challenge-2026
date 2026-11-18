import type { EnvironmentProfile } from '@/domain/environments/environment-profile';
import type { EnvironmentConfig } from './environment-schema';

/**
 * Converts an environment config into the domain Environment_Profile.
 * The background dose rate is the midpoint of the dose rate range.
 * Hazard weights are copied, so the result shares no object with the input.
 */
export function toEnvironmentProfile(
  env: EnvironmentConfig,
): EnvironmentProfile {
  return {
    id: env.id,
    label: env.label,
    backgroundDoseRateMsvPerDay:
      (env.doseRateMsvPerDay.low + env.doseRateMsvPerDay.high) / 2,
    hazardWeights: { ...env.hazardWeights },
  };
}
