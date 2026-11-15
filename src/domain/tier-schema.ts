import { z } from 'zod';
import type { Tier } from './types';

export const TierSchema = z.enum(['green', 'yellow', 'orange', 'red']);

// Compile-time guard: the schema and the Tier type must describe the same set.
type SchemaTier = z.infer<typeof TierSchema>;
type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
export const tierSchemaMatchesType: Equal<SchemaTier, Tier> = true;
