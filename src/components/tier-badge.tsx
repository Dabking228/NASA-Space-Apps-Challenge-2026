import { Badge } from '@/components/ui/badge';
import {
  presentationFor,
  type TierOrNoData,
} from '@/components/tier-presentation';

interface TierBadgeProps {
  tier: TierOrNoData;
}

export function TierBadge({ tier }: TierBadgeProps) {
  const { label, Icon, className } = presentationFor(tier);
  return (
    <Badge className={className}>
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  );
}
