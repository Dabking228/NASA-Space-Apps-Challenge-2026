import {
  NavigationSchema,
  type Navigation,
} from '../domain/content/navigation-schema';
import { parseContent } from './content-parse';

// Page list for the shell. The seven main pages and About appear in the
// navigation. The director page is a fallback route and stays out of it.
// Icon names are lucide-react component names. The shell maps each name.
const navigationValue = [
  {
    route: '/',
    label: 'Dashboard',
    description: 'Your body map, daily status and what needs attention.',
    iconName: 'LayoutDashboard',
    inNav: true,
  },
  {
    route: '/check-in',
    label: 'Check-in',
    description: 'A short guided check of your vitals and how you feel.',
    iconName: 'ClipboardCheck',
    inNav: true,
  },
  {
    route: '/trends',
    label: 'Trends',
    description:
      'How each measurement changes over time against your own normal.',
    iconName: 'ChartLine',
    inNav: true,
  },
  {
    route: '/alerts',
    label: 'Alerts',
    description: 'What changed, why it matters and what to do next.',
    iconName: 'BellRing',
    inNav: true,
  },
  {
    route: '/escalation',
    label: 'Escalation',
    description: 'Prepare a summary for the flight surgeons and see the reply.',
    iconName: 'Send',
    inNav: true,
  },
  {
    route: '/radiation',
    label: 'Radiation',
    description:
      'Radiation readings and what to do during a solar particle event.',
    iconName: 'Radiation',
    inNav: true,
  },
  {
    route: '/countermeasures',
    label: 'Countermeasures',
    description: 'Daily actions that help protect your health.',
    iconName: 'HeartPulse',
    inNav: true,
  },
  {
    route: '/about',
    label: 'About',
    description: 'What this tool is, how it works and what is still a draft.',
    iconName: 'Info',
    inNav: true,
  },
  {
    route: '/director',
    label: 'Director',
    description: 'Demo controls for moving time and adding events.',
    iconName: 'SlidersHorizontal',
    inNav: false,
  },
] satisfies Navigation;

export const navigation = parseContent(
  'src/data/navigation.ts',
  NavigationSchema,
  navigationValue,
);
