import {
  CircleCheck,
  CircleDashed,
  Eye,
  OctagonAlert,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import type { Tier } from '@/domain/types';

/** A Tier, or the state of a value that has no reading yet. */
export type TierOrNoData = Tier | 'no-data';

export interface TierPresentation {
  /** Plain label shown next to every colour. */
  readonly label: string;
  /** Icon shown next to every colour. Decorative: render it with `aria-hidden`. */
  readonly Icon: LucideIcon;
  /** Background and text colour pair, for badges and chips. */
  readonly className: string;
  /** Fill class for SVG shapes such as the body map regions. */
  readonly fill: string;
  /** CSS variable reference for chart props such as `stroke` and `fill`. */
  readonly cssVar: string;
}

/**
 * The one place that names tier colour tokens in Tailwind classes.
 * Keyed by the full Tier union plus 'no-data', so a missing key fails typecheck.
 * Class strings are written out in full so Tailwind can find them.
 */
export const TIER_PRESENTATION: Readonly<
  Record<TierOrNoData, TierPresentation>
> = {
  green: {
    label: 'Normal for you',
    Icon: CircleCheck,
    className: 'bg-status-green text-status-green-foreground',
    fill: 'fill-status-green',
    cssVar: 'var(--status-green)',
  },
  yellow: {
    label: 'Drifting',
    Icon: Eye,
    className: 'bg-status-yellow text-status-yellow-foreground',
    fill: 'fill-status-yellow',
    cssVar: 'var(--status-yellow)',
  },
  orange: {
    label: 'Concerning',
    Icon: TriangleAlert,
    className: 'bg-status-orange text-status-orange-foreground',
    fill: 'fill-status-orange',
    cssVar: 'var(--status-orange)',
  },
  red: {
    label: 'Act now',
    Icon: OctagonAlert,
    className: 'bg-status-red text-status-red-foreground',
    fill: 'fill-status-red',
    cssVar: 'var(--status-red)',
  },
  'no-data': {
    label: 'No data yet',
    Icon: CircleDashed,
    className: 'bg-muted text-muted-foreground',
    fill: 'fill-muted',
    cssVar: 'var(--muted-foreground)',
  },
};

/** The presentation of a Tier or of the no-data state. */
export function presentationFor(tierOrNoData: TierOrNoData): TierPresentation {
  return TIER_PRESENTATION[tierOrNoData];
}
