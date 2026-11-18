import {
  EscalationContentSchema,
  type EscalationContent,
} from '../domain/content/escalation-schema';
import { parseContent } from './content-parse';

// Ground link wording and demo behaviour (FD-11, Requirements 31 and 32).
// PROJECT.md gives no ISS delay figure, so the ISS demo delay is a proposed
// default for the team to review: 300 link-seconds one way, which is a few
// real seconds at the proposed link time-scale.
// Scripted replies are simulation text. They give no medical advice and ask
// only that the crew continue the steps shown and report changes (FD-11).
const escalationValue = {
  issDemoDelayLinkSeconds: { value: 300, source: 'proposed-default' },
  demoDelayLabel: 'Demo delay (not a real figure)',
  scriptedReplyLabel: 'Scripted demo reply',
  scriptedReplies: {
    'reply-green':
      'Scripted demo reply. This is simulated text, not medical advice. The ground team has received your summary. Please continue the steps shown in the app and report any changes.',
    'reply-yellow':
      'Scripted demo reply. This is simulated text, not medical advice. The ground team has received your summary and will keep watching. Please continue the steps shown in the app and report any changes.',
    'reply-orange':
      'Scripted demo reply. This is simulated text, not medical advice. The ground team has received your summary and is reviewing it. Please continue the steps shown in the app and report any changes.',
    'reply-red':
      'Scripted demo reply. This is simulated text, not medical advice. The ground team has received your urgent summary and is reviewing it now. Please continue the steps shown in the app and report any changes.',
  },
  stageLabels: {
    queued: 'Queued',
    transmitting: 'Transmitting',
    delivered: 'Delivered',
    'reply-received': 'Reply received',
  },
  // Draft wording: the blackout rules are space-specific (verification flag C).
  blackoutWording: {
    conjunction:
      'Draft rule: the Sun is between Earth and Mars, so the link is expected to be unavailable for a period.',
    'signal-gaps':
      'Draft rule: the link drops out in gaps, so messages may wait until the signal returns.',
  },
  queueWording: 'Link unavailable. Messages wait in the queue.',
  summarySectionTitles: {
    whoAndWhen: 'Who and when',
    environmentAndDay: 'Environment and mission day',
    findings: 'Findings',
    trends: 'Trends',
    context: 'Context',
    actionsTaken: 'Actions taken',
  },
} satisfies EscalationContent;

export const escalation = parseContent(
  'src/data/escalation.ts',
  EscalationContentSchema,
  escalationValue,
);
