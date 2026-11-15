import { TierBadge } from '@/components/tier-badge';
import type { Tier } from '@/domain/types';

const TIERS: Tier[] = ['green', 'yellow', 'orange', 'red'];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-semibold">Health Companion</h1>
      <ul className="flex flex-wrap items-center justify-center gap-3">
        {TIERS.map((tier) => (
          <li key={tier}>
            <TierBadge tier={tier} />
          </li>
        ))}
      </ul>
    </div>
  );
}
