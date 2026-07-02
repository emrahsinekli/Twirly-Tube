import { describe, expect, it } from 'vitest';
import { hashString, mulberry32 } from '../src/systems/Rng';
import { dailySeed, dateKey } from '../src/systems/DailySeed';

describe('Rng', () => {
  it('mulberry32 deterministik ve [0,1) aralığında', () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    for (let i = 0; i < 1000; i++) {
      const va = a();
      expect(va).toBe(b());
      expect(va).toBeGreaterThanOrEqual(0);
      expect(va).toBeLessThan(1);
    }
  });

  it('farklı seed → farklı dizi', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const seqA = Array.from({ length: 5 }, a);
    const seqB = Array.from({ length: 5 }, b);
    expect(seqA).not.toEqual(seqB);
  });

  it('hashString deterministik, farklı stringler farklı hash', () => {
    expect(hashString('2026-07-02')).toBe(hashString('2026-07-02'));
    expect(hashString('2026-07-02')).not.toBe(hashString('2026-07-03'));
  });
});

describe('DailySeed', () => {
  it('dateKey YYYY-MM-DD üretir', () => {
    expect(dateKey(new Date(2026, 6, 2))).toBe('2026-07-02');
    expect(dateKey(new Date(2026, 0, 9))).toBe('2026-01-09');
  });

  it('aynı gün aynı seed, farklı gün farklı seed', () => {
    const d1 = new Date(2026, 6, 2, 9, 30);
    const d2 = new Date(2026, 6, 2, 23, 59);
    const d3 = new Date(2026, 6, 3, 0, 0);
    expect(dailySeed(d1)).toBe(dailySeed(d2));
    expect(dailySeed(d1)).not.toBe(dailySeed(d3));
  });
});
