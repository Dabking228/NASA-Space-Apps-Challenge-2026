import {
  SignalHigh,
  SignalLow,
  SignalMedium,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Confidence } from '@/domain/schemas/vocabulary';

interface ConfidencePresentation {
  readonly label: string;
  readonly Icon: LucideIcon;
}

/** Keyed by the full Confidence union, so a missing key fails typecheck. */
const CONFIDENCE_PRESENTATION: Readonly<
  Record<Confidence, ConfidencePresentation>
> = {
  low: { label: 'Confidence: low', Icon: SignalLow },
  medium: { label: 'Confidence: medium', Icon: SignalMedium },
  high: { label: 'Confidence: high', Icon: SignalHigh },
};

interface ConfidenceBadgeProps {
  confidence: Confidence;
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const { label, Icon } = CONFIDENCE_PRESENTATION[confidence];
  return (
    <Badge variant="outline">
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  );
}
