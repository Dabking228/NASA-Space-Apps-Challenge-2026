import type { SimulationSettings } from './settings-schema';

// Shipped simulation settings. Every number is a proposed default, not taken from a source.
export const defaultSettings = {
  noise: {
    // SD-1: paired noise amplitude is 1 + spread * z / clip.
    clip: 1.5,
    spread: 0.2,
    // SD-2: redraw limit of the truncated normal sample.
    maxDraws: 16,
  },
  events: {
    solarParticleEvent: {
      defaultLengthDays: 1,
      // SD-4: synthetic multiple of the background dose rate, above 20 (Requirement 11.2).
      doseRateMultiple: { moderate: 25 },
      valueSource: 'proposed-default',
      verification: 'C',
    },
    symptom: {
      defaultLengthDays: 1,
    },
  },
} satisfies SimulationSettings;
