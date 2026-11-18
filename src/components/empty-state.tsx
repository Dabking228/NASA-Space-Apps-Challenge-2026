import { Inbox } from 'lucide-react';
import { TierBadge } from '@/components/tier-badge';
import type { Tier } from '@/domain/types';

interface EmptyStateProps {
  title: string;
  detail?: string;
  /** `green` shows the green tier badge (icon and label) above the title. */
  tier?: Extract<Tier, 'green'>;
}

/** Fixed minimum height, so the layout does not jump when content arrives. */
export function EmptyState({ title, detail, tier }: EmptyStateProps) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-6 text-center">
      {tier === undefined ? (
        <Inbox aria-hidden="true" className="size-6 text-muted-foreground" />
      ) : (
        <TierBadge tier={tier} />
      )}
      <p className="text-base font-medium">{title}</p>
      {detail === undefined ? null : (
        <p className="max-w-prose text-sm text-muted-foreground">{detail}</p>
      )}
    </div>
  );
}
