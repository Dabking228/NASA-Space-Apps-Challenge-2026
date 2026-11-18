import type { EnvironmentConfig } from './environment-schema';
import { iss } from './iss';
import { lunarSurface } from './lunar-surface';
import { marsTransit } from './mars-transit';

export { iss, lunarSurface, marsTransit };

// The three shipped environments, all unverified drafts.
export const environments: readonly EnvironmentConfig[] = [
  iss,
  lunarSurface,
  marsTransit,
];
