import {
  CheckInContentSchema,
  type CheckInContent,
} from '../domain/content/check-in-schema';
import { parseContent } from './content-parse';

// Check-in wording (FD-6, Requirements 23 and 25). Team-written guidance, so
// each step carries flag B, except blood pressure: its indicators rest on flag
// C thresholds, so the step carries flag C and shows the Draft marker.
// Every `sources` array is empty, which means unverified.
// Allowed value ranges come from the indicator catalog, not from this file.
// There is no safety-flag input and no self-harm question (needs an ethics
// discussion first).
const checkInValue = {
  steps: [
    {
      id: 'resting-heart-rate',
      title: 'Resting heart rate',
      instructions: [
        'Sit or float quietly and stay calm until you feel settled.',
        'Put on your wrist device or pulse sensor, or use the usual crew method for finding your pulse.',
        'Keep still while it reads. Do not talk or move your arm.',
        'Type in the heart rate it shows.',
        'If the reading looked unreliable, for example the sensor slipped, choose "Poor" for quality.',
      ],
      fields: [
        {
          indicatorId: 'resting-hr',
          label: 'Resting heart rate',
          unit: 'bpm',
        },
      ],
      verification: 'B',
      sources: [],
    },
    {
      id: 'blood-pressure',
      title: 'Blood pressure',
      instructions: [
        'Rest quietly in a comfortable position before you start.',
        'Fit the cuff snugly on your upper arm, as shown in your device guide.',
        'Keep your arm relaxed and still while the cuff works.',
        'Type in the top number (systolic) and the bottom number (diastolic) that the device shows.',
        'If the cuff slipped or you moved, choose "Poor" for quality.',
      ],
      fields: [
        {
          indicatorId: 'bp-systolic',
          label: 'Top number (systolic)',
          unit: 'mmHg',
        },
        {
          indicatorId: 'bp-diastolic',
          label: 'Bottom number (diastolic)',
          unit: 'mmHg',
        },
      ],
      verification: 'C',
      sources: [],
    },
    {
      id: 'mood',
      title: 'Mood',
      instructions: [
        'Think about how you have felt over the last day.',
        'Pick a score on the scale from 1 to 5. 1 is very low and 5 is very good.',
        'Go with your first answer. There is no right or wrong score.',
        'If you were not able to think it through properly, choose "Poor" for quality.',
      ],
      fields: [
        {
          indicatorId: 'mood',
          label: 'Mood (1 to 5)',
          unit: null,
        },
      ],
      verification: 'B',
      sources: [],
    },
  ],
  symptomStep: {
    id: 'symptoms',
    title: 'Symptoms (optional)',
    intro:
      'Tick anything you have noticed today. You can skip this step if you have nothing to report.',
    symptomLabels: {
      'chest-pain': 'Chest pain',
      fainting: 'Fainting or nearly fainting',
      headache: 'Headache',
      cough: 'Cough',
      'sore-throat': 'Sore throat',
      'vision-blurring': 'Blurry vision',
      'acuity-change': 'Change in how sharp your vision is',
      'sudden-vision-loss': 'Sudden loss of vision',
      other: 'Something else',
    },
    verification: 'B',
    sources: [],
  },
  emergencyNote:
    'Chest pain or fainting can be urgent. Follow your emergency procedures and tell the crew now. Then use the escalation page to prepare a message to the flight surgeons.',
} satisfies CheckInContent;

export const checkIn = parseContent(
  'src/data/check-in.ts',
  CheckInContentSchema,
  checkInValue,
);
