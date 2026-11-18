import type { EnvironmentConfig } from './environment-schema';

// ISS (low Earth orbit) from docs/PROJECT.md section 10 and section 6.6.
// UNVERIFIED DRAFT: every value is flag C (written from memory) or a proposed default.
// Not a fact and not for use as one. `sources` stays empty until the team supplies citations.
export const iss = {
  id: 'iss',
  label: 'International Space Station',
  // Section 10: microgravity.
  gravityG: 0,
  doseRateMsvPerDay: {
    // Section 6.6: ISS background about 0.3 to 0.7 mSv/day.
    low: 0.3,
    high: 0.7,
  },
  // Section 10: evacuation in hours to days.
  evacuation: 'hours-to-days',
  groundLink: {
    // Section 10: "seconds", no figure given, so no delay is modelled (MR-1).
    oneWayDelaySeconds: null,
    // Section 10: signal gaps. No default blackout window (MR-1).
    blackoutRules: ['signal-gaps'],
  },
  // Section 10: gravity and the closed habitat (CO2) are emphasised. MR-4.
  emphasisedHazards: ['gravity-fields', 'hostile-closed-environment'],
  // Proposed default (MR-3): 2 for each emphasised hazard, 1 for the others.
  hazardWeights: {
    radiation: 1,
    'isolation-confinement': 1,
    'distance-from-earth': 1,
    'gravity-fields': 2,
    'hostile-closed-environment': 2,
  },
  hazardWeightSource: 'proposed-default',
  habitat: {
    'cabin-co2': {
      // SD-3: proposed default placeholder. Section 6.7 gives only "a few mmHg" for the ISS.
      baseline: 2.5,
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
      // Section 6.6: midpoint of 0.3 to 0.7 mSv/day (MR-2).
      baseline: 0.5,
      // Proposed default (design environment table).
      noiseSd: 0.015,
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
