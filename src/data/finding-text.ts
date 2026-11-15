import type { FindingText } from '@/domain/rules/text';

// Words and steps for findings (Requirements 22.2, 24.2, 24.6, 24.8). Placeholders are
// listed in the doc comment of `FindingText`. Tier steps are the PROJECT.md section 8
// behaviours. The copy gives no medication, dosing or treatment advice, and it holds
// no threshold numbers, so nothing here needs a source.
export const findingText = {
  indicatorReason: '{label} was {value} {unit} on day {day}. {ruleSentences}',

  // `{symptoms}` ends the sentence list and has no label, so an empty value leaves
  // no stray words behind.
  clusterReason:
    '{cluster} is {tier} on day {day}. Signs seen in the last {windowDays} days: {evidence} {symptoms}',

  opWords: {
    gt: 'above',
    gte: 'at or above',
    lt: 'below',
    lte: 'at or below',
  },

  ruleSentences: {
    hardLimit: 'This is {op} the {tier} limit of {limit}.',
    sequence:
      'The {tier} rule is met: {label} {op} {threshold}, with {periods} period(s) in a row required.',
    conditional: 'This gives {tier} when it comes with: {trigger}.',
    context: 'Context rule for {tier}: {detail}.',
    deviation:
      'Your own usual level is {mean} {unit} with a typical spread of {sd} {unit}. This reading is {difference} {unit} {direction} it, which gives {tier} (yellow starts at {yellowSd} spreads away, orange at {orangeSd}).',
  },

  tierSteps: {
    yellow: [
      'Keep to your normal routine and use the self-care guidance for this area.',
      'Take your next reading at the usual time and watch the trend over the coming days.',
      'Note anything that has changed, such as sleep, workload or the cabin environment.',
    ],
    orange: [
      'Do a guided assessment: repeat the measurement and review your recent readings and any symptoms.',
      'Prepare a message to ground that includes this finding, the readings and any symptoms.',
      'Tell the crew medical officer or a crewmate what you have found.',
      'Check again more often until the readings settle or ground replies.',
    ],
    red: [
      'Stop non-essential tasks and follow your emergency procedures now.',
      'Tell the crew medical officer and your crewmates right away.',
      'Send an urgent message to ground now and ask for a flight surgeon.',
      'Stay with a crewmate and keep checking your readings until ground replies.',
    ],
  },

  clusterSteps: {
    'fatigue-stress': [
      'Look at your recent sleep, workload and mood together, because the signs point to fatigue or stress.',
      'Tell a crewmate or the crew medical officer how you are feeling.',
    ],
    'possible-infection': [
      'Limit close contact with crewmates until you know more.',
      'Re-check your temperature and resting heart rate with the guided protocol.',
      'Note when any cough or sore throat started.',
    ],
    'under-fuelling': [
      'Compare what you have eaten and drunk with the mission plan.',
      'Re-check your body mass with the guided protocol.',
      'Note any missed meals or drinks and the reason.',
    ],
    'possible-co2-exposure': [
      'Check the environment first: look at the cabin CO₂ reading and the air circulation, and tell your crewmates.',
      'Ask your crewmates whether they have a headache or feel foggy too.',
      'Report any cabin air concern to ground.',
    ],
    'vision-change': [
      'Note when the change started and whether it affects one eye or both.',
      'Repeat the vision check in the guided protocol.',
      'Avoid tasks that need sharp vision until you have been assessed.',
    ],
  },
} satisfies FindingText;
