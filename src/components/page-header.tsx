import type { ReactNode } from 'react';

interface PageHeaderProps {
  /** The page's single `h1`. Every page renders exactly one PageHeader. */
  title: string;
  /** One-line purpose of the page. */
  purpose: string;
  /** Optional controls shown beside the title (buttons, links). */
  actions?: ReactNode;
}

export function PageHeader({ title, purpose, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      <div className="min-w-0 flex-1 basis-64">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{purpose}</p>
      </div>
      {actions === undefined ? null : (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
