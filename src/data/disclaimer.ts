export const DISCLAIMER_NOTICE =
  'Decision support only, not a diagnostic device. This prototype uses synthetic data and draft thresholds.';

export function assertDisclaimerPresent(text: string): void {
  if (text.trim().length === 0) {
    throw new Error(
      'Disclaimer_Notice is missing or empty; refusing to build without it.',
    );
  }
}

assertDisclaimerPresent(DISCLAIMER_NOTICE);
