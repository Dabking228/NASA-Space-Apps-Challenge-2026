import type {
  BodySystem,
  Hazard,
  VerificationFlag,
} from '@/domain/schemas/vocabulary';

// Proposed indicator-to-hazard and indicator-to-body-system table (TD-15).
// PROJECT.md section 9 maps hazards to indicators loosely and never maps
// indicators to body systems, so every entry is flag C. The weakest
// assignments are glucose, energy intake and the two radiation indicators.
// `vision` has no indicator, and `distance-from-earth` is owned by the
// simulation and escalation specs.

export const indicatorMapping = {
  'resting-hr': {
    hazards: ['gravity-fields'],
    system: 'cardiovascular',
    verification: { mapping: ['C'] },
  },
  'bp-systolic': {
    hazards: ['gravity-fields'],
    system: 'cardiovascular',
    verification: { mapping: ['C'] },
  },
  'bp-diastolic': {
    hazards: ['gravity-fields'],
    system: 'cardiovascular',
    verification: { mapping: ['C'] },
  },
  spo2: {
    hazards: ['hostile-closed-environment'],
    system: 'cardiovascular',
    verification: { mapping: ['C'] },
  },
  'fasting-glucose': {
    hazards: ['hostile-closed-environment'],
    system: 'cardiovascular',
    verification: { mapping: ['C'] },
  },
  'body-temperature': {
    hazards: ['hostile-closed-environment'],
    system: 'immune',
    verification: { mapping: ['C'] },
  },
  'sleep-hours': {
    hazards: ['isolation-confinement'],
    system: 'sleep',
    verification: { mapping: ['C'] },
  },
  mood: {
    hazards: ['isolation-confinement'],
    system: 'mental',
    verification: { mapping: ['C'] },
  },
  who5: {
    hazards: ['isolation-confinement'],
    system: 'mental',
    verification: { mapping: ['C'] },
  },
  'reaction-time': {
    hazards: ['isolation-confinement'],
    system: 'mental',
    verification: { mapping: ['C'] },
  },
  'cabin-co2': {
    hazards: ['hostile-closed-environment'],
    system: 'mental',
    verification: { mapping: ['C'] },
  },
  'body-mass-change-30d': {
    hazards: ['gravity-fields'],
    system: 'musculoskeletal',
    verification: { mapping: ['C'] },
  },
  'exercise-adherence': {
    hazards: ['gravity-fields'],
    system: 'musculoskeletal',
    verification: { mapping: ['C'] },
  },
  'energy-intake': {
    hazards: ['hostile-closed-environment'],
    system: 'musculoskeletal',
    verification: { mapping: ['C'] },
  },
  'career-effective-dose': {
    hazards: ['radiation'],
    system: 'immune',
    verification: { mapping: ['C'] },
  },
  'dose-rate': {
    hazards: ['radiation'],
    system: 'immune',
    verification: { mapping: ['C'] },
  },
} satisfies Record<
  string,
  {
    hazards: readonly Hazard[];
    system: BodySystem;
    verification: { mapping: readonly VerificationFlag[] };
  }
>;
