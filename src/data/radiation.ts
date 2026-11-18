import {
  RadiationContentSchema,
  type RadiationContent,
} from '../domain/content/radiation-schema';
import { parseContent } from './content-parse';

// Shelter flow and radiation wording (Requirement 33). The text states no
// number, dose or limit. Figures come from the app's own cards. Radiation
// claims are space-specific and written from background knowledge, so the
// file carries verification flag C and the draft marker. `sources` stays
// empty until the team supplies citations.
const radiationValue = {
  shelterTitle: 'Solar particle event: shelter checklist',
  shelterSteps: [
    'Stop what you are doing and tell the rest of the crew.',
    'Move to the area that your mission plan names as the radiation shelter.',
    'Check that every crew member is accounted for.',
    'Stay in the shelter until your mission plan or the ground team says it is safe to leave.',
    'Note any symptoms and the time you first noticed them.',
  ],
  shelterEscalationText:
    'Open the escalation page to send a summary to the ground team. It waits in the queue if the link is unavailable.',
  doseRateExplanation:
    'Dose rate is how much radiation your body takes in each day. The card compares it with the usual background level of this environment, so you can see how many times higher it is. A short rise during a solar particle event is different from a rise that lasts.',
  careerDoseExplanation:
    'This card adds up the radiation you are projected to take in by the end of this mission, on top of what you took in before it. It compares that total with the allowance you have left, shown as a share. It is a draft estimate for planning and does not state a limit as a fact.',
  draftMarkerText:
    'Draft value: written from background knowledge, no source supplied yet.',
  verification: 'C',
  sources: [],
} satisfies RadiationContent;

export const radiation = parseContent(
  'src/data/radiation.ts',
  RadiationContentSchema,
  radiationValue,
);
