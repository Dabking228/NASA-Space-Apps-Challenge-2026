import {
  CountermeasuresSchema,
  type Countermeasures,
} from '../domain/content/countermeasures-schema';
import { parseContent } from './content-parse';

// Countermeasure tasks (FD-12, Requirement 34). General wellbeing habits
// written by the team, so each carries flag B. They are not treatment: no
// medication, dose, clinical number or space-specific claim. Every `sources`
// array is empty, which means unverified. `environments` is left out, so
// each task applies in every environment.
const countermeasuresValue = [
  {
    id: 'daily-exercise',
    title: 'Daily exercise session',
    why: 'Regular exercise helps keep your muscles, bones and heart in good shape while you are away from normal gravity.',
    howSteps: [
      'Pick the exercise equipment that is free and working today.',
      'Warm up gently before you start.',
      'Do your planned session at a steady effort that you can keep going.',
      'Cool down and stretch when you finish.',
      'Tell the crew if the equipment is out of order, so you can swap to another routine.',
    ],
    system: 'musculoskeletal',
    daily: true,
    suggestedWhen: ['musculoskeletal', 'cardiovascular'],
    verification: 'B',
    sources: [],
  },
  {
    id: 'sleep-routine',
    title: 'Wind-down and sleep routine',
    why: 'A steady routine helps you fall asleep and wake up at regular times, which supports mood and alertness.',
    howSteps: [
      'Finish demanding tasks and screens a while before your sleep period.',
      'Dim the lights around your sleep area.',
      'Keep your sleep area quiet and comfortable.',
      'Go to sleep and get up at about the same times each day.',
    ],
    system: 'sleep',
    daily: true,
    suggestedWhen: ['sleep', 'mental'],
    verification: 'B',
    sources: [],
  },
  {
    id: 'hydration',
    title: 'Drink water regularly',
    why: 'Drinking water through the day helps you stay alert and supports your heart and circulation.',
    howSteps: [
      'Drink water with each meal.',
      'Keep a drink pouch within reach while you work.',
      'Take a few sips at each scheduled break.',
    ],
    system: 'cardiovascular',
    daily: true,
    suggestedWhen: ['cardiovascular'],
    verification: 'B',
    sources: [],
  },
  {
    id: 'social-check-in',
    title: 'Talk with the crew',
    why: 'Time spent talking with others helps ease the strain of living in a small space for a long time.',
    howSteps: [
      'Share a meal or a break with at least one crew member.',
      'Talk about something other than work.',
      'Say so if you are feeling low or tired, so others can support you.',
    ],
    system: 'mental',
    daily: true,
    suggestedWhen: ['mental', 'sleep'],
    verification: 'B',
    sources: [],
  },
  {
    id: 'posture-stretch',
    title: 'Posture and stretch routine',
    why: 'Gentle stretching eases stiffness in your back and neck and helps you move comfortably.',
    howSteps: [
      'Stretch your neck, shoulders and back slowly.',
      'Hold each stretch gently and breathe out as you stretch.',
      'Stop any stretch that hurts.',
    ],
    system: 'musculoskeletal',
    daily: false,
    suggestedWhen: ['musculoskeletal'],
    verification: 'B',
    sources: [],
  },
  {
    id: 'eye-comfort',
    title: 'Eye comfort break',
    why: 'Resting your eyes from close screen work can ease tiredness and help you notice changes in your vision.',
    howSteps: [
      'Look away from your screen to something far away in the cabin.',
      'Blink slowly a few times.',
      'Repeat at each scheduled break during long screen tasks.',
      'Report any lasting change in your vision to the crew and use the escalation page.',
    ],
    system: 'vision',
    daily: false,
    suggestedWhen: ['vision'],
    verification: 'B',
    sources: [],
  },
  {
    id: 'light-exposure',
    title: 'Bright light in your day',
    why: 'Bright light in your waking hours and dim light in the evening helps your body keep a steady sleep rhythm.',
    howSteps: [
      'Use bright cabin lighting during your work period.',
      'Spend part of your day in a well-lit area.',
      'Switch to dim lighting as your sleep period gets closer.',
    ],
    system: 'sleep',
    daily: false,
    suggestedWhen: ['sleep', 'mental'],
    verification: 'B',
    sources: [],
  },
  {
    id: 'clean-living-space',
    title: 'Keep your living space clean',
    why: 'Clean hands and surfaces lower the chance of passing on a cough or cold in a shared space.',
    howSteps: [
      'Wipe the surfaces you touch most, such as your work area and handles.',
      'Clean your hands before you eat.',
      'Tell the crew if you have a cough or sore throat, so everyone can take care.',
    ],
    system: 'immune',
    daily: false,
    suggestedWhen: ['immune'],
    verification: 'B',
    sources: [],
  },
] satisfies Countermeasures;

export const countermeasures = parseContent(
  'src/data/countermeasures.ts',
  CountermeasuresSchema,
  countermeasuresValue,
);
