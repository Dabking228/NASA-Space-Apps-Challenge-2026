import {
  CircleCheck,
  Eye,
  OctagonAlert,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Tier } from '@/domain/types';

interface TierBadgeProps {
  tier: Tier;
}

const TIER_BADGE: Record<
  Tier,
  { label: string; Icon: LucideIcon; className: string }
> = {
  green: {
    label: 'Normal for you',
    Icon: CircleCheck,
    className: 'bg-status-green text-status-green-foreground',
  },
  yellow: {
    label: 'Drifting',
    Icon: Eye,
    className: 'bg-status-yellow text-status-yellow-foreground',
  },
  orange: {
    label: 'Concerning',
    Icon: TriangleAlert,
    className: 'bg-status-orange text-status-orange-foreground',
  },
  red: {
    label: 'Act now',
    Icon: OctagonAlert,
    className: 'bg-status-red text-status-red-foreground',
  },
};

export function TierBadge({ tier }: TierBadgeProps) {
  const { label, Icon, className } = TIER_BADGE[tier];
  return (
    <Badge className={className}>
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  );
}
