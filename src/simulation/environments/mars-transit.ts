import type { EnvironmentConfig } from './environment-schema';

// Mars transit from docs/PROJECT.md section 10 and section 6.6.
// UNVERIFIED DRAFT: every value is flag C (written from memory) or a proposed default.
// Not a fact and not for use as one. `sources` stays empty until the team supplies citations.
export const marsTransit = {
  id: 'mars-transit',
  label: 'Mars transit',
  // Section 10: microgravity.
  gravityG: 0,
  doseRateMsvPerDay: {
    // Section 6.6: Mars transit background about 1.8 mSv/day (a single figure, so low equals high).
    low: 1.8,
    high: 1.8,
  },
  // Section 10: evacuation not possible.
  evacuation: 'not-possible',
  groundLink: {
    oneWayDelaySeconds: {
      // Section 10: roughly 3 minutes one way (180 s).
      min: 180,
      // Section 10: roughly 22 minutes one way (1320 s).
      max: 1320,
    },
    // Section 10: conjunction blackouts.
    blackoutRules: ['conjunction'],
  },
  // Section 10: isolation, radiation and autonomy (distance from Earth) are emphasised. MR-4.
  emphasisedHazards: [
    'isolation-confinement',
    'radiation',
    'distance-from-earth',
  ],
  // Proposed default (MR-3): 2 for each emphasised hazard, 1 for the others.
  hazardWeights: {
    radiation: 2,
    'isolation-confinement': 2,
    'distance-from-earth': 2,
    'gravity-fields': 1,
    'hostile-closed-environment': 1,
  },
  hazardWeightSource: 'proposed-default',
  habitat: {
    'cabin-co2': {
      // SD-3: proposed default placeholder, below the catalog orange limit.
      baseline: 2.0,
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
      // Section 6.6: the single Mars transit figure, which is also the midpoint (MR-2).
      baseline: 1.8,
      // Proposed default (design environment table).
      noiseSd: 0.05,
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
