import { Skeleton } from '@/components/ui/skeleton';

interface SkeletonProps {
  /** Screen reader text while the content loads. */
  label?: string;
}

const DEFAULT_LABEL = 'Loading';

/**
 * Placeholder for the main area until the stores have hydrated.
 * Fixed block heights keep the layout from jumping. It renders no heading:
 * the page's single h1 comes from PageHeader once the real view renders.
 */
export function MainSkeleton({ label = DEFAULT_LABEL }: SkeletonProps) {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-6">
      <span className="sr-only">{label}</span>
      <div className="flex flex-col gap-2" aria-hidden="true">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div
        className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
        aria-hidden="true"
      >
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

/** Placeholder for the context bar (environment, day, crew, link) until hydrated. */
export function ContextBarSkeleton({ label = DEFAULT_LABEL }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      className="flex h-14 w-full items-center gap-3 overflow-hidden"
    >
      <span className="sr-only">{label}</span>
      <Skeleton aria-hidden="true" className="h-8 w-32 shrink-0" />
      <Skeleton aria-hidden="true" className="h-8 w-28 shrink-0" />
      <Skeleton aria-hidden="true" className="h-8 w-40 shrink-0" />
      <Skeleton aria-hidden="true" className="h-8 w-24 shrink-0" />
    </div>
  );
}
