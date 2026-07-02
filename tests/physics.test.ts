import { describe, expect, it } from 'vitest';
import { TUNING, type Tuning } from '../src/config/tuning';
import { PoleGeometry } from '../src/systems/PoleGenerator';
import { TubePhysics, type TubeEvent } from '../src/systems/Physics';

function makeTube(overrides: Partial<Tuning> = {}, seed = 1): { tube: TubePhysics; t: Tuning } {
  const t = { ...TUNING, ...overrides };
  return { tube: new TubePhysics(new PoleGeometry(seed, t), t), t };
}

function step(tube: TubePhysics, seconds: number, dt = 1 / 120): TubeEvent[] {
  const evs: TubeEvent[] = [];
  for (let c = 0; c < seconds; c += dt) evs.push(...tube.update(dt));
  return evs;
}

describe('TubePhysics — temel hareket', () => {
  it('flick yoksa tüp dipte oturur, ölmez', () => {
    const { tube } = makeTube();
    step(tube, 3);
    expect(tube.h).toBe(0);
    expect(tube.alive).toBe(true);
  });

  it('flick yukarı hız + spin verir', () => {
    const { tube } = makeTube();
    const imp = tube.flick(500);
    expect(imp).toBeCloseTo(500 * TUNING.IMPULSE_FACTOR);
    expect(tube.vy).toBeCloseTo(imp);
    expect(tube.spin).toBeCloseTo(imp * TUNING.SPIN_FACTOR);
  });

  it('impulse IMPULSE_MAX ile sınırlanır', () => {
    const { tube } = makeTube();
    expect(tube.flick(1e9)).toBe(TUNING.IMPULSE_MAX);
  });

  it('çok zayıf sürükleme yok sayılır', () => {
    const { tube } = makeTube();
    expect(tube.flick(10)).toBe(0);
    expect(tube.vy).toBe(0);
  });

  it('cooldown içindeki ikinci flick yok sayılır, sonrası kabul edilir', () => {
    const { tube } = makeTube();
    expect(tube.flick(99999)).toBeGreaterThan(0);
    step(tube, TUNING.FLICK_COOLDOWN * 0.5);
    expect(tube.flick(99999)).toBe(0);
    step(tube, TUNING.FLICK_COOLDOWN * 0.6);
    expect(tube.flick(99999)).toBeGreaterThan(0);
  });

  it('yerçekimi tüpü aşağı çeker: tek flick yükselir ve geri düşer', () => {
    const { tube } = makeTube();
    tube.flick(99999);
    step(tube, 0.2);
    expect(tube.h).toBeGreaterThan(0);
    step(tube, 3);
    expect(tube.h).toBe(0);
    expect(tube.maxH).toBeGreaterThan(50);
  });

  it('sürtünme hızı yerçekiminden bağımsız olarak söndürür', () => {
    const { tube } = makeTube({ GRAVITY: 0 });
    tube.flick(99999);
    const v0 = tube.vy;
    step(tube, 1);
    expect(tube.vy).toBeLessThan(v0);
    expect(tube.vy).toBeGreaterThan(0);
  });

  it('spin zamanla söner ve SPIN_MAX ile sınırlanır', () => {
    const { tube } = makeTube({ GRAVITY: 0 });
    tube.flick(99999);
    const s0 = tube.spin;
    step(tube, 2);
    expect(tube.spin).toBeLessThan(s0);
    // spam ile spin tavana dayanır
    const { tube: tube2 } = makeTube({ GRAVITY: 0 });
    for (let i = 0; i < 20; i++) {
      tube2.flick(99999);
      step(tube2, TUNING.FLICK_COOLDOWN + 0.01);
    }
    expect(tube2.spin).toBeLessThanOrEqual(TUNING.SPIN_MAX);
  });
});

describe('TubePhysics — başarısızlık koşulları', () => {
  it('tırmanış başladıktan sonra zemine dönüş = game over', () => {
    const { tube } = makeTube();
    // birkaç flick ile grace eşiğinin üstüne çık
    for (let i = 0; i < 4; i++) {
      tube.flick(99999);
      step(tube, TUNING.FLICK_COOLDOWN + 0.02);
    }
    expect(tube.maxH).toBeGreaterThan(TUNING.GROUND_FAIL_MIN_PEAK);
    const evs = step(tube, 5);
    expect(tube.alive).toBe(false);
    expect(tube.failReason).toBe('ground');
    expect(evs.some((e) => e.type === 'fail' && e.reason === 'ground')).toBe(true);
  });

  it('küçük hoplama (grace altı) zeminde fail üretmez', () => {
    const { tube } = makeTube();
    tube.flick(200); // impulse 160 → tepe ~8px
    step(tube, 2);
    expect(tube.alive).toBe(true);
    expect(tube.h).toBe(0);
  });

  it('öldükten sonra update olay üretmez, flick işlemez', () => {
    const { tube } = makeTube();
    for (let i = 0; i < 4; i++) {
      tube.flick(99999);
      step(tube, TUNING.FLICK_COOLDOWN + 0.02);
    }
    step(tube, 5);
    expect(tube.alive).toBe(false);
    expect(tube.flick(99999)).toBe(0);
    expect(tube.update(1 / 60)).toEqual([]);
  });
});

describe('TubePhysics — kıvrım geçişleri (spec 5.5)', () => {
  // Kontrollü senaryo: tek checkpoint'i bilinen hız/spin ile geç.
  function crossCheckpoint(vy: number, spin: number, seed = 1): TubeEvent[] {
    const t = { ...TUNING };
    const pole = new PoleGeometry(seed, t);
    const tube = new TubePhysics(pole, t);
    const cp = pole.nextCheckpointAfter(1000);
    // tüpü checkpoint'in hemen altına yerleştir, durumu elle kur
    tube.h = cp.h - 2;
    tube.maxH = tube.h;
    tube.vy = vy;
    tube.spin = spin;
    return tube.update(1 / 120);
  }

  it('yüksek hız + sıfır spin → savrulup düşme (thrown fail)', () => {
    const evs = crossCheckpoint(1500, 0);
    expect(evs.some((e) => e.type === 'fail' && e.reason === 'thrown')).toBe(true);
  });

  it('yüksek hız + bol spin → temiz geçiş', () => {
    const evs = crossCheckpoint(600, TUNING.SPIN_MAX);
    expect(evs.some((e) => e.type === 'clean')).toBe(true);
  });

  it('orta denge → wobble: hız ve spin kaybı, ölüm yok', () => {
    const t = { ...TUNING };
    const pole = new PoleGeometry(1, t);
    const tube = new TubePhysics(pole, t);
    const cp = pole.nextCheckpointAfter(1000);
    // stability = spin/(sev·vy) ∈ (CRIT, MIN) olacak şekilde kur
    const vy = 800;
    const spin = cp.severity * vy * (t.STABILITY_CRIT + t.STABILITY_MIN) * 0.5;
    tube.h = cp.h - 5;
    tube.maxH = tube.h;
    tube.vy = vy;
    tube.spin = spin;
    const evs = tube.update(1 / 120);
    expect(evs.some((e) => e.type === 'wobble')).toBe(true);
    expect(tube.alive).toBe(true);
    expect(tube.vy).toBeLessThan(vy * t.WOBBLE_SPEED_KEEP * 1.05);
    expect(tube.spin).toBeLessThan(spin * t.WOBBLE_SPIN_KEEP * 1.05);
  });

  it('yavaş geçiş güvenlidir: eşik altı hızda denge kontrolü yok', () => {
    const evs = crossCheckpoint(TUNING.BEND_CHECK_MIN_VY * 0.9, 0);
    expect(evs).toEqual([]);
  });

  it('temiz geçiş hıza sürüklenme (drag) uygular', () => {
    const t = { ...TUNING };
    const pole = new PoleGeometry(1, t);
    const tube = new TubePhysics(pole, t);
    const cp = pole.nextCheckpointAfter(1000);
    tube.h = cp.h - 2;
    tube.maxH = tube.h;
    tube.vy = 600;
    tube.spin = t.SPIN_MAX;
    tube.update(1 / 120);
    // yerçekimi tek karede ~12px/s alır; drag belirgin şekilde fazla almalı
    expect(tube.vy).toBeLessThan(600 - 600 * cp.severity * t.BEND_DRAG * 0.5);
  });

  it('aşağı düşerken kıvrımlar öldürmez', () => {
    const t = { ...TUNING };
    const pole = new PoleGeometry(1, t);
    const tube = new TubePhysics(pole, t);
    const cp = pole.nextCheckpointAfter(1000);
    tube.h = cp.h + 50;
    tube.maxH = tube.h;
    tube.vy = -1200;
    tube.spin = 0;
    const evs = tube.update(1 / 60);
    expect(evs).toEqual([]);
    expect(tube.alive).toBe(true);
  });

  it('büyük dt tek karede birden çok checkpoint atlasa da hepsi işlenir', () => {
    // denge eşiği devre dışı → sadece "hepsi işlendi mi" ölçülür
    const t = { ...TUNING, STABILITY_CRIT: -1, STABILITY_MIN: -1 };
    const dt = 0.5;
    const pole = new PoleGeometry(1, t);
    const tube = new TubePhysics(pole, t);
    const c1 = pole.nextCheckpointAfter(1000);
    const c3 = pole.nextCheckpointAfter(pole.nextCheckpointAfter(c1.h).h);
    tube.h = c1.h - 10;
    tube.maxH = tube.h;
    tube.spin = t.SPIN_MAX;
    // yerçekimi + sürtünme sonrası bile tek update'te c3'ü aşacak hız
    tube.vy = ((c3.h - tube.h) / dt + 100 + t.GRAVITY * dt) / (1 - t.FRICTION * dt);
    const evs = tube.update(dt);
    expect(evs.filter((e) => e.type === 'clean').length).toBeGreaterThanOrEqual(3);
  });
});
