import {
  AboutContentSchema,
  type AboutContent,
} from '../domain/content/about-schema';
import { parseContent } from './content-parse';

// About page text. The decision-support notice is not held here: the page
// receives it as a prop from src/data/disclaimer.ts. Flag meanings follow
// docs/PROJECT.md section 6.1. The reading list holds the three NASA Human
// Research Program pages named in section 1, with their URLs copied from there.
// It is a reading list, not a set of citations, and no source is added to it.
const aboutValue = {
  sectionTitles: {
    notice: 'What this tool is',
    draftData: 'How sure the values are',
    sources: 'Sources',
    howItWorks: 'How it works',
  },
  statements: [
    'This tool helps you think about your health. It supports your decisions and does not replace a flight surgeon or a doctor.',
    'All the data you see is synthetic. It comes from a simulation, not from real people or real devices.',
    'Every threshold and every space-specific value is a draft. The team has not checked them against NASA or agency documents yet.',
  ],
  flagExplanations: {
    A: 'Flag A: a standard clinical reference value that is likely correct. It still needs a cited source and a check before anyone relies on it.',
    B: 'Flag B: a team rule of thumb or convention. It is a design decision, and the reason for it is written down.',
    C: 'Flag C: a space-specific value written from memory. Treat it as a placeholder, not as a fact, until it is checked against NASA or agency documents.',
  },
  noThresholdSourceText: 'No threshold has a source yet.',
  noSourcesText: 'No sources have been supplied yet',
  readingListLabel: 'Reading list, not citations',
  readingList: [
    {
      title: 'NASA Human Research Program: hazards',
      url: 'https://www.nasa.gov/hrp/hazards/',
    },
    {
      title: 'NASA Human Research Program: risks',
      url: 'https://www.nasa.gov/hrp/risks/',
    },
    {
      title: 'NASA Human Research Program: ongoing research',
      url: 'https://www.nasa.gov/hrp/ongoing-hrp-research/',
    },
  ],
  howItWorksSteps: [
    {
      title: 'Measure',
      text: 'You take a short daily check-in, and the simulation adds passive data such as sleep.',
    },
    {
      title: 'Compare to your personal baseline',
      text: 'Each reading is compared with your own usual values, not with an average person on Earth.',
    },
    {
      title: 'Classify',
      text: 'Every measurement and every body system gets a status: normal for you, drifting, concerning or act now.',
    },
    {
      title: 'Explain',
      text: 'Every status shows why it was given, how sure the tool is and where its limit comes from.',
    },
    {
      title: 'Act',
      text: 'The tool suggests daily habits and guided steps that fit what it found.',
    },
    {
      title: 'Escalate',
      text: 'When something needs the ground team, the tool prepares a short summary for the flight surgeons. The reply may be late, so the message waits in a queue.',
    },
  ],
  personalBaseline: {
    title: 'Your personal baseline',
    text: 'Healthy people differ a lot. Your baseline is what is normal for you, built from your own recent readings. A change from your baseline can matter even when the value looks ordinary for other people.',
  },
} satisfies AboutContent;

export const aboutContent = parseContent(
  'src/data/about.ts',
  AboutContentSchema,
  aboutValue,
);
