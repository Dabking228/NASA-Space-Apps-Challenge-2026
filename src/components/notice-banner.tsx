import Link from 'next/link';
import { CircleAlert, Info, TriangleAlert, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type NoticeTone = 'neutral' | 'warning' | 'error';

interface TonePresentation {
  /** Read by screen readers before the message, so the tone is never colour alone. */
  readonly label: string;
  readonly Icon: LucideIcon;
  readonly variant: 'default' | 'destructive';
  /** Extra classes: a stronger border and text colour that do not name a tier. */
  readonly className: string;
  readonly descriptionClassName: string;
  /** `status` is polite, `alert` is assertive. */
  readonly role: 'status' | 'alert';
}

/** Keyed by the full NoticeTone union, so a missing key fails typecheck. */
const TONE_PRESENTATION: Readonly<Record<NoticeTone, TonePresentation>> = {
  neutral: {
    label: 'Notice',
    Icon: Info,
    variant: 'default',
    className: '',
    descriptionClassName: 'text-foreground',
    role: 'status',
  },
  warning: {
    label: 'Warning',
    Icon: TriangleAlert,
    variant: 'default',
    className: 'border-foreground/60',
    descriptionClassName: 'text-foreground',
    role: 'status',
  },
  error: {
    label: 'Error',
    Icon: CircleAlert,
    variant: 'destructive',
    className: 'border-destructive',
    descriptionClassName: '',
    role: 'alert',
  },
};

/** An action is either a button (`onClick`) or an internal link (`href`). */
export type NoticeAction =
  | {
      readonly label: string;
      readonly onClick: () => void;
      readonly href?: undefined;
    }
  | {
      readonly label: string;
      readonly href: string;
      readonly onClick?: undefined;
    };

interface NoticeBannerProps {
  tone: NoticeTone;
  /** Plain text for the user. Never pass a stack trace or an error object. */
  message: string;
  action?: NoticeAction;
  /** When set, a dismiss button appears and calls this. */
  onDismiss?: () => void;
  /** Accessible name of the dismiss button. */
  dismissLabel?: string;
  className?: string;
}

const TOUCH_TARGET = 'max-md:min-h-11 max-md:min-w-11';

export function NoticeBanner({
  tone,
  message,
  action,
  onDismiss,
  dismissLabel = 'Dismiss',
  className,
}: NoticeBannerProps) {
  const presentation = TONE_PRESENTATION[tone];
  const { Icon } = presentation;

  return (
    <Alert
      variant={presentation.variant}
      role={presentation.role}
      className={cn(presentation.className, className)}
    >
      <Icon aria-hidden="true" />
      <AlertDescription className={presentation.descriptionClassName}>
        <span className="sr-only">{presentation.label}: </span>
        {message}
      </AlertDescription>
      {action === undefined ? null : (
        <div className="col-start-2 mt-1.5">
          {action.href === undefined ? (
            <Button
              variant="outline"
              size="sm"
              className={TOUCH_TARGET}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ) : (
            <Link
              href={action.href}
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                TOUCH_TARGET,
              )}
            >
              {action.label}
            </Link>
          )}
        </div>
      )}
      {onDismiss === undefined ? null : (
        <AlertAction>
          <Button
            variant="ghost"
            size="icon-sm"
            className={TOUCH_TARGET}
            aria-label={dismissLabel}
            onClick={onDismiss}
          >
            <X aria-hidden="true" />
          </Button>
        </AlertAction>
      )}
    </Alert>
  );
}
