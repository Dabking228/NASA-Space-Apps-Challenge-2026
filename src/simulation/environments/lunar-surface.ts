import type { EnvironmentConfig } from './environment-schema';

// Lunar surface from docs/PROJECT.md section 10 and section 6.6.
// UNVERIFIED DRAFT: every value is flag C (written from memory) or a proposed default.
// Not a fact and not for use as one. `sources` stays empty until the team supplies citations.
export const lunarSurface = {
  id: 'lunar-surface',
  label: 'Lunar surface',
  // Section 10: about 0.16 g.
  gravityG: 0.16,
  doseRateMsvPerDay: {
    // Section 6.6: lunar surface background about 1.3 mSv/day (a single figure, so low equals high).
    low: 1.3,
    high: 1.3,
  },
  // Section 10: evacuation in days.
  evacuation: 'days',
  groundLink: {
    oneWayDelaySeconds: {
      // Section 10: about 1.3 s one way (a single figure, so min equals max).
      min: 1.3,
      max: 1.3,
    },
    // Section 10 names no blackout rule for the lunar surface.
    blackoutRules: [],
  },
  // Section 10: dust, EVA and radiation are emphasised. MR-4.
  emphasisedHazards: ['hostile-closed-environment', 'radiation'],
  // Proposed default (MR-3): 2 for each emphasised hazard, 1 for the others.
  hazardWeights: {
    radiation: 2,
    'isolation-confinement': 1,
    'distance-from-earth': 1,
    'gravity-fields': 1,
    'hostile-closed-environment': 2,
  },
  hazardWeightSource: 'proposed-default',
  habitat: {
    'cabin-co2': {
      // SD-3: proposed default placeholder, below the catalog orange limit.
      baseline: 1.5,
      // SD-3: proposed default.
      noiseSd: 0.15,
      // SD-3: proposed default.
      decimals: 2,
      // Proposed default: one reading per day.
      periodDays: 1,
      // Proposed default: a partial pressure cannot be negative.
      bounds: { min: 0 },
    },
    'dose-rate': {
      // Section 6.6: the single lunar figure, which is also the midpoint (MR-2).
      baseline: 1.3,
      // Proposed default (design environment table).
      noiseSd: 0.04,
      // Proposed default (design environment table).
      decimals: 3,
      // Proposed default: one reading per day.
      periodDays: 1,
      // Proposed default: a dose rate cannot be negative.
      bounds: { min: 0 },
    },
  },
  verification: 'C',
  status: 'unverified-draft',
  sources: [],
} satisfies EnvironmentConfig;
