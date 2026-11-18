// Keyed 32-bit hash for the seeded random source.
// Only 32-bit integer operations and exact IEEE 754 `+ - * /` are used, so every JavaScript engine
// gives the same numbers. No transcendental Math function appears here.
// This is a statistical hash for demo data, not a cryptographic one.

/** Identifies one random number. Parts are validated ids and whole numbers. */
export type RandomKey = readonly (string | number)[];

/** MurmurHash3 32-bit finaliser (Austin Appleby, public domain). Returns an unsigned 32-bit value. */
export function fmix32(input: number): number {
  let h = input >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

// Each part becomes `<len>:<tag><text>`. The length prefix makes the encoding injective:
// ['ab', 'c'] and ['a', 'bc'] give different strings.
export function encodeKey(key: RandomKey): string {
  return key
    .map((part) => {
      const tagged = typeof part === 'number' ? `i${part}` : `s${part}`;
      return `${tagged.length}:${tagged}`;
    })
    .join('');
}

/** Maps a seed and a key to an unsigned 32-bit integer. Keeps no state. */
export function hashKey(seed: number, key: RandomKey): number {
  const low = seed >>> 0;
  const high = Math.floor(seed / 4294967296) >>> 0; // division by 2^32 is exact
  let h = fmix32((low ^ fmix32((high + 0x9e3779b9) >>> 0)) >>> 0);
  const text = encodeKey(key);
  for (let i = 0; i < text.length; i += 1) {
    // FNV-1a step over UTF-16 code units
    h = Math.imul((h ^ text.charCodeAt(i)) >>> 0, 16777619) >>> 0;
  }
  return fmix32(h);
}
