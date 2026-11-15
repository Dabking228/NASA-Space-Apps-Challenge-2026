import type { ClusterDefinition } from '@/domain/schemas/cluster';

// Cluster rules from docs/PROJECT.md section 7. Every `sources` array is empty until
// the team supplies citations. Only the fatigue and stress window (5 days) is stated in
// PROJECT.md. The other windows reuse 5 days as `proposed-default` (TD-13).
// Flags: B (team heuristic) on the first four clusters, C on vision change (TD-23).

export const fatigueStressCluster = {
  id: 'fatigue-stress',
  label: 'Fatigue and stress',
  windowDays: 5,
  windowSource: 'project-doc',
  tier: 'orange',
  system: 'mental',
  members: [
    {
      kind: 'indicator',
      id: 'sleep',
      indicatorId: 'sleep-hours',
      minTier: 'yellow',
      direction: 'any',
    },
    {
      kind: 'indicator',
      id: 'mood',
      indicatorId: 'mood',
      minTier: 'yellow',
      direction: 'any',
    },
    {
      kind: 'indicator',
      id: 'resting-hr',
      indicatorId: 'resting-hr',
      minTier: 'yellow',
      direction: 'any',
    },
  ],
  // Worsening reaction time adds confidence only (PROJECT.md section 7).
  supporting: [
    {
      kind: 'indicator',
      id: 'reaction-time',
      indicatorId: 'reaction-time',
      minTier: 'yellow',
      direction: 'above-baseline',
    },
  ],
  tierRaises: [],
  verification: ['B'],
  sources: [],
} satisfies ClusterDefinition;

// "Elevated" means yellow or worse and above the baseline mean (TD-4).
export const possibleInfectionCluster = {
  id: 'possible-infection',
  label: 'Possible infection',
  windowDays: 5,
  windowSource: 'proposed-default',
  tier: 'orange',
  system: 'immune',
  members: [
    {
      kind: 'indicator',
      id: 'temperature',
      indicatorId: 'body-temperature',
      minTier: 'yellow',
      direction: 'above-baseline',
    },
    {
      kind: 'indicator',
      id: 'resting-hr',
      indicatorId: 'resting-hr',
      minTier: 'yellow',
      direction: 'above-baseline',
    },
    {
      kind: 'symptom',
      id: 'respiratory-symptom',
      symptoms: ['cough', 'sore-throat'],
    },
  ],
  supporting: [],
  tierRaises: [],
  verification: ['B'],
  sources: [],
} satisfies ClusterDefinition;

// Directions follow TD-22: mass loss above baseline, intake below baseline, so weight
// gain or high intake is not flagged. `body-mass-change-30d` is a percentage loss, so
// a loss shows as a value above its baseline mean.
export const underFuellingCluster = {
  id: 'under-fuelling',
  label: 'Under-fuelling or dehydration',
  windowDays: 5,
  windowSource: 'proposed-default',
  tier: 'orange',
  system: 'musculoskeletal',
  members: [
    {
      kind: 'indicator',
      id: 'mass-loss',
      indicatorId: 'body-mass-change-30d',
      minTier: 'yellow',
      direction: 'above-baseline',
    },
    {
      kind: 'indicator',
      id: 'low-intake',
      indicatorId: 'energy-intake',
      minTier: 'yellow',
      direction: 'below-baseline',
    },
    {
      kind: 'indicator',
      id: 'resting-hr',
      indicatorId: 'resting-hr',
      minTier: 'yellow',
      direction: 'above-baseline',
    },
  ],
  supporting: [],
  tierRaises: [],
  verification: ['B'],
  sources: [],
} satisfies ClusterDefinition;

export const possibleCo2ExposureCluster = {
  id: 'possible-co2-exposure',
  label: 'Possible CO₂ exposure',
  windowDays: 5,
  windowSource: 'proposed-default',
  tier: 'orange',
  system: 'mental',
  members: [
    {
      kind: 'symptom',
      id: 'headache',
      symptoms: ['headache'],
    },
    // TD-27 (team decision, accepted by the user, revisit if needed): any cabin CO₂
    // reading above the habitat baseline mean, with no tier gate.
    {
      kind: 'baseline-relative',
      id: 'co2-above-baseline',
      indicatorId: 'cabin-co2',
      op: 'gt',
      fraction: 0,
    },
    // TD-27 (team decision, accepted by the user, revisit if needed): the Cognitive_Dip
    // is one reaction-time reading at least 25% above the baseline mean, with no tier
    // gate. The 25% figure comes from the reaction-time rule in PROJECT.md section 6.4.
    {
      kind: 'baseline-relative',
      id: 'cognitive-dip',
      indicatorId: 'reaction-time',
      op: 'gte',
      fraction: 0.25,
    },
  ],
  supporting: [],
  tierRaises: [],
  verification: ['B'],
  sources: [],
} satisfies ClusterDefinition;

export const visionChangeCluster = {
  id: 'vision-change',
  label: 'Vision change',
  windowDays: 5,
  windowSource: 'proposed-default',
  tier: 'orange',
  system: 'vision',
  members: [
    {
      kind: 'symptom',
      id: 'vision-symptom',
      symptoms: ['vision-blurring', 'acuity-change', 'sudden-vision-loss'],
    },
  ],
  supporting: [],
  // Any new blurring or acuity change is orange. Sudden vision loss is red.
  tierRaises: [
    {
      memberId: 'vision-symptom',
      whenSymptomIn: ['sudden-vision-loss'],
      tier: 'red',
    },
  ],
  verification: ['C'],
  sources: [],
} satisfies ClusterDefinition;

export const clusterDefinitions = [
  fatigueStressCluster,
  possibleInfectionCluster,
  underFuellingCluster,
  possibleCo2ExposureCluster,
  visionChangeCluster,
] as const satisfies readonly ClusterDefinition[];
