import type { z } from 'zod';
import type { EngineConfigSchema } from '../domain/schemas/config';

// Engine-wide settings. Values are proposed defaults, not cited thresholds.
// Deviation SDs follow PROJECT.md section 6.2 (flag B). The rest are design
// decisions awaiting team review: baseline TD-18 and TD-19, persistence TD-20,
// confidence TD-21. The freeze rule follows Requirement 12.1.
export const engineConfig = {
  deviationDefaults: { yellowSd: 2, orangeSd: 3 },
  baseline: { windowDays: 14, minSeedReadings: 2, minWindowReadings: 2 },
  freeze: { atOrAbove: 'orange' },
  persistence: { minTier: 'yellow', consecutivePeriods: 2, raisesTo: 'orange' },
  confidence: {
    start: 'high',
    steps: { missingData: 1, poorQuality: 1, singleSignal: 1 },
    supportBonusSteps: 1,
  },
} satisfies z.input<typeof EngineConfigSchema>;
