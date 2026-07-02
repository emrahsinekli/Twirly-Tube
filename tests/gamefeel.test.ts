import { describe, expect, it } from 'vitest';
import { TUNING } from '../src/config/tuning';
import { simulate, singleFlickHop } from './sim';

/**
 * Oyna-test kalibrasyon sözleşmesi (spec 8 + 15).
 * Bu testler "oyun hissi" hedeflerini kilitler; tuning.ts değişirse ve bu
 * hedefler bozulursa test kırılır → bilinçli yeniden kalibrasyon gerekir.
 */

const SEEDS = [1, 42, 777, 20260702];

describe('Game feel — ağırlık hissi', () => {
  it('tek max flick: kısa, ağır bir hoplama (2.5–5 m, ~1 sn altı havada)', () => {
    const hop = singleFlickHop();
    const meters = hop.peak * TUNING.METERS_PER_PX;
    expect(meters).toBeGreaterThan(2.5);
    expect(meters).toBeLessThan(5);
    expect(hop.airTime).toBeLessThan(1.1);
  });
});

describe('Game feel — zorluk eğrisi', () => {
  it('ilk 30 sn kolay: ritmik oyuncu 30 saniyede 100 m üstüne ölmeden çıkar', () => {
    for (const seed of SEEDS) {
      const r = simulate({ period: 0.3, swipeVelocity: 99999 }, 30, seed);
      expect(r.alive, `seed ${seed}`).toBe(true);
      expect(r.meters, `seed ${seed}`).toBeGreaterThan(100);
    }
  });

  it('pervasız spam eninde sonunda savrularak ölür (150–800 m bandında)', () => {
    for (const seed of SEEDS) {
      const r = simulate({ period: 0.05, swipeVelocity: 99999 }, 240, seed);
      expect(r.alive, `seed ${seed}`).toBe(false);
      expect(r.failReason, `seed ${seed}`).toBe('thrown');
      expect(r.meters, `seed ${seed}`).toBeGreaterThan(150);
      expect(r.meters, `seed ${seed}`).toBeLessThan(800);
    }
  });

  it('hızlı ama dikkatsiz oyun da ölür; spam\'den ileri gider', () => {
    for (const seed of SEEDS) {
      const spam = simulate({ period: 0.05, swipeVelocity: 99999 }, 240, seed);
      const fast = simulate({ period: 0.28, swipeVelocity: 99999 }, 240, seed);
      expect(fast.alive, `seed ${seed}`).toBe(false);
      expect(fast.meters, `seed ${seed}`).toBeGreaterThanOrEqual(spam.meters);
    }
  });

  it('kıvrım öncesi yavaşlayan dikkatli oyuncu dikkatsizden ileri gider (beceri ödülü)', () => {
    let carefulWins = 0;
    for (const seed of SEEDS) {
      const fast = simulate({ period: 0.28, swipeVelocity: 99999 }, 240, seed);
      const careful = simulate(
        { period: 0.28, swipeVelocity: 99999, cautionDistance: 300 },
        240,
        seed
      );
      const carefulScore = careful.alive ? Infinity : careful.meters;
      if (carefulScore >= fast.meters) carefulWins++;
    }
    expect(carefulWins).toBeGreaterThanOrEqual(3);
  });

  it('zayıf/yavaş flick tırmanışı süremez (tüp ağır) ama anında ölüm de olmaz', () => {
    for (const seed of SEEDS) {
      const r = simulate({ period: 0.6, swipeVelocity: 400 }, 20, seed);
      expect(r.meters, `seed ${seed}`).toBeLessThan(30);
      expect(r.timeAlive, `seed ${seed}`).toBeGreaterThan(1.5);
    }
  });

  it('wobble mekaniği devrede: dikkatsiz koşularda savrulmalar yaşanır', () => {
    const r = simulate({ period: 0.28, swipeVelocity: 99999 }, 240, 42);
    expect(r.wobbleCount).toBeGreaterThan(5);
    expect(r.cleanCount).toBeGreaterThan(5);
  });
});

describe('Game feel — günlük mod adaleti', () => {
  it('aynı seed + aynı girdi → birebir aynı sonuç (determinizm)', () => {
    const a = simulate({ period: 0.31, swipeVelocity: 1200 }, 60, 20260702);
    const b = simulate({ period: 0.31, swipeVelocity: 1200 }, 60, 20260702);
    expect(a.maxH).toBe(b.maxH);
    expect(a.events.length).toBe(b.events.length);
    expect(a.failReason).toBe(b.failReason);
  });
});
