import type { CrewProfile } from './crew-schema';
import { aria } from './aria';
import { kofi } from './kofi';
import { mei } from './mei';
import { tomas } from './tomas';

export { aria, kofi, mei, tomas };

// The four virtual astronauts. The id `habitat` is reserved and not used here.
export const crew: readonly CrewProfile[] = [aria, kofi, mei, tomas];
