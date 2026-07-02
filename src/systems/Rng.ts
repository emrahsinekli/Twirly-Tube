/**
 * Deterministik, seed'lenebilir RNG.
 * Günlük mod herkes için aynı direği üretmek zorunda → Math.random yasak.
 */

/** xmur3 string hash → 32-bit tohum üretici. */
export function hashString(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/** mulberry32 — hızlı, yeterince iyi dağılımlı PRNG. [0,1) döner. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed(): number {
  // Sonsuz mod için; determinism gerekmez.
  return (Math.floor(Math.random() * 0xffffffff)) >>> 0;
}
