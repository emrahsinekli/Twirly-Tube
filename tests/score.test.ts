import { describe, expect, it } from 'vitest';
import { TUNING } from '../src/config/tuning';
import { HighScores, ScoreTracker, type StorageLike } from '../src/systems/Score';

class FakeStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
}

describe('ScoreTracker', () => {
  it('metre = maxH · METERS_PER_PX, tam sayıya yuvarlanır', () => {
    const s = new ScoreTracker(TUNING);
    s.update(1000, []);
    expect(s.meters).toBe(Math.floor(1000 * TUNING.METERS_PER_PX));
  });

  it('geri kayınca skor azalmaz (maksimum yükseklik)', () => {
    const s = new ScoreTracker(TUNING);
    s.update(5000, []);
    const m = s.meters;
    s.update(1200, []);
    expect(s.meters).toBe(m);
  });

  it('combo temiz geçişle artar, wobble/fail ile sıfırlanır', () => {
    const s = new ScoreTracker(TUNING);
    s.update(0, [{ type: 'clean', h: 1, severity: 1, stability: 2 }]);
    s.update(0, [{ type: 'clean', h: 2, severity: 1, stability: 2 }]);
    expect(s.combo).toBe(3);
    s.update(0, [{ type: 'wobble', h: 3, severity: 1, stability: 0.7 }]);
    expect(s.combo).toBe(1);
    expect(s.bestCombo).toBe(3);
  });

  it('milestone her MILESTONE_METERS metrede bir kez tetiklenir', () => {
    const s = new ScoreTracker(TUNING);
    const px50 = (TUNING.MILESTONE_METERS + 1) / TUNING.METERS_PER_PX;
    expect(s.update(px50 * 0.4, [])).toBeNull();
    expect(s.update(px50, [])).toBe(TUNING.MILESTONE_METERS);
    expect(s.update(px50 + 10, [])).toBeNull(); // aynı milestone tekrar etmez
    expect(s.update(px50 * 2, [])).toBe(TUNING.MILESTONE_METERS * 2);
  });
});

describe('HighScores', () => {
  it('rekoru saklar; sadece daha yüksek skor rekor sayılır', () => {
    const hs = new HighScores(new FakeStorage());
    expect(hs.get('endless')).toBe(0);
    expect(hs.submit('endless', 120)).toBe(true);
    expect(hs.submit('endless', 90)).toBe(false);
    expect(hs.get('endless')).toBe(120);
  });

  it('günlük mod rekorları güne göre ayrı tutulur', () => {
    const hs = new HighScores(new FakeStorage());
    hs.submit('daily', 80, '2026-07-02');
    hs.submit('daily', 55, '2026-07-03');
    expect(hs.get('daily', '2026-07-02')).toBe(80);
    expect(hs.get('daily', '2026-07-03')).toBe(55);
    expect(hs.get('endless')).toBe(0);
  });

  it('storage yoksa sessizce çalışır', () => {
    const hs = new HighScores(undefined);
    expect(() => hs.submit('endless', 10)).not.toThrow();
  });
});
