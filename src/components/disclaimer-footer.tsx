import { DISCLAIMER_NOTICE } from '@/data/disclaimer';

export function DisclaimerFooter() {
  return (
    <footer className="border-t bg-muted px-4 py-3 text-center text-sm text-balance text-muted-foreground">
      {DISCLAIMER_NOTICE}
    </footer>
  );
}
