import type { EnvironmentConfig } from '@/simulation/environments/environment-schema';
import { isBlackoutDay } from '@/simulation/events/effects';
import type { ScenarioEvent } from '@/simulation/events/event-schemas';
import type { GroundLinkStatus } from './run-schema';

export type { GroundLinkStatus };

/**
 * Ground link state on one mission day. `available` is false exactly when a `commsBlackout`
 * event covers the day. Message queuing, the scripted reply and the escalation summary belong
 * to the alerts-escalation spec.
 */
export function groundLinkStatus(
  env: EnvironmentConfig,
  events: readonly ScenarioEvent[],
  day: number,
): GroundLinkStatus {
  const delay = env.groundLink.oneWayDelaySeconds;
  return {
    available: !isBlackoutDay(events, day),
    // A copy, so the status shares no object with the config.
    oneWayDelaySeconds:
      delay === null ? null : { min: delay.min, max: delay.max },
  };
}
