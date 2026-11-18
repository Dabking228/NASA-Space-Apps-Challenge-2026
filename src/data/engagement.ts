import {
  EngagementSettingsSchema,
  type EngagementSettings,
} from '../domain/content/engagement-schema';
import { parseContent } from './content-parse';

// Gamification settings (FD-12). PROJECT.md gives no value for any of them,
// so each one is a proposed default for the team to review.
const engagementValue = {
  crewGoalTargetShare: { value: 1, source: 'proposed-default' },
  weeklyStripLength: { value: 7, source: 'proposed-default' },
  streakRuleText: {
    value:
      'A day counts toward your streak when you finish every daily task. Your streak is the number of days in a row that count, up to today.',
    source: 'proposed-default',
  },
  teammateCompletionProbability: { value: 0.7, source: 'proposed-default' },
} satisfies EngagementSettings;

export const engagement = parseContent(
  'src/data/engagement.ts',
  EngagementSettingsSchema,
  engagementValue,
);
