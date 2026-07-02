import { describe, expect, it } from 'vitest';
import { TUNING } from '../src/config/tuning';
import { PoleGeometry } from '../src/systems/PoleGenerator';

describe('PoleGeometry', () => {
  it('aynı seed → birebir aynı direk (günlük mod şartı)', () => {
    const a = new PoleGeometry(20260702, TUNING);
    const b = new PoleGeometry(20260702, TUNING);
    for (let h = 0; h <= 50000; h += 137) {
      expect(a.offsetAt(h)).toBe(b.offsetAt(h));
      expect(a.widthAt(h)).toBe(b.widthAt(h));
    }
  });

  it('farklı seed → farklı direk', () => {
    const a = new PoleGeometry(1, TUNING);
    const b = new PoleGeometry(2, TUNING);
    let diff = 0;
    for (let h = 500; h <= 20000; h += 500) {
      if (Math.abs(a.offsetAt(h) - b.offsetAt(h)) > 1) diff++;
    }
    expect(diff).toBeGreaterThan(10);
  });

  it('kıvrım genliği yükseklikle artar ve sınırlanır', () => {
    const p = new PoleGeometry(7, TUNING);
    expect(p.ampAt(5000)).toBeGreaterThan(p.ampAt(0));
    expect(p.ampAt(1e6)).toBeLessThanOrEqual(TUNING.BEND_AMP_MAX);
    // offset hiçbir zaman genlik sınırını aşmaz (ekran içinde kalır)
    for (let h = 0; h < 100000; h += 333) {
      expect(Math.abs(p.offsetAt(h))).toBeLessThanOrEqual(TUNING.BEND_AMP_MAX + 1e-9);
    }
  });

  it('direk yukarı incelir, minimumda durur', () => {
    const p = new PoleGeometry(7, TUNING);
    expect(p.widthAt(0)).toBe(TUNING.POLE_WIDTH_BASE);
    expect(p.widthAt(8000)).toBeLessThan(p.widthAt(0));
    expect(p.widthAt(1e6)).toBe(TUNING.POLE_WIDTH_MIN);
  });

  it('checkpointler artan sırada, ilkini öğrenme alanının üstünde bırakır', () => {
    for (const seed of [1, 42, 999, 20260702]) {
      const p = new PoleGeometry(seed, TUNING);
      const cps = p.checkpointsBetween(0, 30000);
      expect(cps.length).toBeGreaterThan(10);
      expect(cps[0].h).toBeGreaterThanOrEqual(400);
      for (let i = 1; i < cps.length; i++) {
        expect(cps[i].h).toBeGreaterThan(cps[i - 1].h);
        expect(cps[i].severity).toBeGreaterThan(0);
      }
    }
  });

  it('checkpointler tam eğim tepe noktalarında (offset ≈ 0 geçişi)', () => {
    const p = new PoleGeometry(5, TUNING);
    for (const cp of p.checkpointsBetween(0, 20000)) {
      // θ = kπ → sin(θ) ≈ 0 → offset ≈ 0
      expect(Math.abs(p.offsetAt(cp.h))).toBeLessThan(0.5);
    }
  });

  it('parça parça taranınca da checkpoint kaçmaz/çiftlenmez', () => {
    const whole = new PoleGeometry(11, TUNING).checkpointsBetween(0, 25000);
    const scanned: number[] = [];
    const p = new PoleGeometry(11, TUNING);
    let h = 0;
    const rngSteps = [313, 77, 1201, 45, 890, 2203, 12, 505];
    let i = 0;
    while (h < 25000) {
      const nh = Math.min(25000, h + rngSteps[i++ % rngSteps.length]);
      for (const cp of p.checkpointsBetween(h, nh)) scanned.push(cp.h);
      h = nh;
    }
    expect(scanned).toEqual(whole.map((c) => c.h));
  });

  it('severity yükseklikle artar (zorluk eğrisi)', () => {
    const p = new PoleGeometry(3, TUNING);
    const low = p.checkpointsBetween(0, 3000);
    const high = p.checkpointsBetween(20000, 23000);
    const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
    expect(avg(high.map((c) => c.severity))).toBeGreaterThan(avg(low.map((c) => c.severity)) * 2);
  });
});
