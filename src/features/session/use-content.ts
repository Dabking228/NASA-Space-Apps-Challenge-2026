import type { AboutContent } from '@/domain/content/about-schema';
import type { AppContent } from '@/domain/content/app-content';
import type { AppDefaults } from '@/domain/content/app-defaults-schema';
import type { BodyRegions } from '@/domain/content/body-regions-schema';
import type { CheckInContent } from '@/domain/content/check-in-schema';
import type { Countermeasures } from '@/domain/content/countermeasures-schema';
import type { DirectorPresets } from '@/domain/content/director-presets-schema';
import type { EngagementSettings } from '@/domain/content/engagement-schema';
import type { EscalationContent } from '@/domain/content/escalation-schema';
import type { Hazards } from '@/domain/content/hazards-schema';
import type { Navigation } from '@/domain/content/navigation-schema';
import type { RadiationContent } from '@/domain/content/radiation-schema';
import { useSessionData } from './session-context';

// Each hook returns one content value. All throw outside the provider (see `useSessionData`).

export function useContent(): AppContent {
  return useSessionData().content;
}

export function useAppDefaults(): AppDefaults {
  return useSessionData().content.appDefaults;
}

export function useNavigation(): Navigation {
  return useSessionData().content.navigation;
}

export function useBodyRegions(): BodyRegions {
  return useSessionData().content.bodyRegions;
}

export function useHazards(): Hazards {
  return useSessionData().content.hazards;
}

export function useCheckInContent(): CheckInContent {
  return useSessionData().content.checkIn;
}

export function useCountermeasures(): Countermeasures {
  return useSessionData().content.countermeasures;
}

export function useEngagementSettings(): EngagementSettings {
  return useSessionData().content.engagement;
}

export function useEscalationContent(): EscalationContent {
  return useSessionData().content.escalation;
}

export function useRadiationContent(): RadiationContent {
  return useSessionData().content.radiation;
}

export function useDirectorPresets(): DirectorPresets {
  return useSessionData().content.directorPresets;
}

export function useAboutContent(): AboutContent {
  return useSessionData().content.about;
}
