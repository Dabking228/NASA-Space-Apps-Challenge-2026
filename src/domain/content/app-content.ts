import type { AboutContent } from './about-schema';
import type { AppDefaults } from './app-defaults-schema';
import type { BodyRegions } from './body-regions-schema';
import type { CheckInContent } from './check-in-schema';
import type { Countermeasures } from './countermeasures-schema';
import type { DirectorPresets } from './director-presets-schema';
import type { EngagementSettings } from './engagement-schema';
import type { EscalationContent } from './escalation-schema';
import type { Hazards } from './hazards-schema';
import type { Navigation } from './navigation-schema';
import type { RadiationContent } from './radiation-schema';

/** All eleven content shapes. The composition root builds it and the session provider receives it. */
export type AppContent = Readonly<{
  appDefaults: AppDefaults;
  navigation: Navigation;
  bodyRegions: BodyRegions;
  hazards: Hazards;
  checkIn: CheckInContent;
  countermeasures: Countermeasures;
  engagement: EngagementSettings;
  escalation: EscalationContent;
  radiation: RadiationContent;
  directorPresets: DirectorPresets;
  about: AboutContent;
}>;
