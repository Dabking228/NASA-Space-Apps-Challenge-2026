import { CircleQuestionMark, FilePenLine } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { VerificationFlag } from '@/domain/schemas/vocabulary';

const UNVERIFIED_LABEL = 'Unverified';
const DRAFT_LABEL = 'Draft value';
const NO_SOURCE_TEXT = 'No source has been supplied yet.';
const DRAFT_TEXT =
  'This is a draft written by the team. It has not been checked against a published source.';

interface VerificationMarkerProps {
  /** Verification flags of the value, text or claim being marked. */
  flags: readonly VerificationFlag[];
  /** Number of sources supplied for it. Zero means unverified. */
  sourceCount: number;
  /** What is being marked, named in the tooltip. */
  subject?: string;
}

/**
 * Marks values that are not verified.
 * "Unverified" shows outside production when no source exists. "Draft value"
 * shows in every build for a flag C value. `process.env.NODE_ENV` is inlined
 * at build time, so the server and the browser render the same output.
 */
export function VerificationMarker({
  flags,
  sourceCount,
  subject,
}: VerificationMarkerProps) {
  const hasNoSource = sourceCount === 0;
  const showUnverified = process.env.NODE_ENV !== 'production' && hasNoSource;
  const showDraft = flags.includes('C');

  if (!showUnverified && !showDraft) {
    return null;
  }

  const badges = (
    <>
      {showUnverified ? (
        <Badge variant="outline">
          <CircleQuestionMark aria-hidden="true" />
          {UNVERIFIED_LABEL}
        </Badge>
      ) : null}
      {showDraft ? (
        <Badge variant="secondary">
          <FilePenLine aria-hidden="true" />
          {DRAFT_LABEL}
        </Badge>
      ) : null}
    </>
  );

  if (!hasNoSource) {
    return <span className="inline-flex items-center gap-1">{badges}</span>;
  }

  const prefix = subject === undefined ? '' : `${subject}: `;
  return (
    <Tooltip>
      <TooltipTrigger className="inline-flex items-center gap-1 rounded-4xl focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
        {badges}
      </TooltipTrigger>
      <TooltipContent>
        {prefix}
        {NO_SOURCE_TEXT}
        {showDraft ? ` ${DRAFT_TEXT}` : ''}
      </TooltipContent>
    </Tooltip>
  );
}
