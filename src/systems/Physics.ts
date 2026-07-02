import type { Tuning } from '../config/tuning';
import type { PoleGeometry } from './PoleGenerator';

/**
 * Tüp fiziği (spec 5). Phaser'dan tamamen bağımsız → headless test edilebilir.
 *
 * Durum: h (zeminden yükseklik, px, yukarı pozitif), vy (px/s, yukarı pozitif),
 * spin (denge sağlayan açısal momentum). Tüpün x'i her zaman direğin o h'deki
 * offset'idir (tüp direğe geçilidir) — x burada tutulmaz, render katmanı
 * PoleGeometry.offsetAt(h) ile bulur.
 */

export type TubeEvent =
  | { type: 'clean'; h: number; severity: number; stability: number }
  | { type: 'wobble'; h: number; severity: number; stability: number }
  | { type: 'fail'; reason: 'thrown'; h: number; severity: number; stability: number }
  | { type: 'fail'; reason: 'ground'; h: number }
  | { type: 'flick'; impulse: number };

export class TubePhysics {
  readonly pole: PoleGeometry;
  private readonly t: Tuning;

  h = 0;
  vy = 0;
  spin = 0;
  maxH = 0;
  alive = true;
  failReason: 'thrown' | 'ground' | null = null;

  /** İç saat (s) — flick cooldown için. */
  private time = 0;
  private lastFlickAt = -Infinity;

  constructor(pole: PoleGeometry, tuning: Tuning) {
    this.pole = pole;
    this.t = tuning;
  }

  /**
   * Flick girdisi: dikey sürükleme hızı (px/s, yukarı pozitif).
   * Cooldown içindeyse veya çok zayıfsa yok sayılır.
   * Uygulanan impulse'u döner (0 = yok sayıldı).
   */
  flick(swipeVelocity: number): number {
    if (!this.alive) return 0;
    if (this.time - this.lastFlickAt < this.t.FLICK_COOLDOWN) return 0;
    const raw = swipeVelocity * this.t.IMPULSE_FACTOR;
    if (raw < this.t.IMPULSE_MIN) return 0;
    const impulse = Math.min(raw, this.t.IMPULSE_MAX);
    this.vy += impulse;
    this.spin = Math.min(this.t.SPIN_MAX, this.spin + impulse * this.t.SPIN_FACTOR);
    this.lastFlickAt = this.time;
    return impulse;
  }

  /** Bir fizik adımı. Bu adımda oluşan olayları döner. */
  update(dt: number): TubeEvent[] {
    if (!this.alive || dt <= 0) return [];
    this.time += dt;
    const events: TubeEvent[] = [];

    // Yerçekimi + sürtünme (spec 5.2)
    this.vy -= this.t.GRAVITY * dt;
    this.vy *= Math.max(0, 1 - this.t.FRICTION * dt);
    // Spin sönümü (spec 5.3)
    this.spin *= Math.max(0, 1 - this.t.SPIN_DECAY * dt);

    const prevH = this.h;
    this.h += this.vy * dt;

    // Kıvrım checkpoint'leri: sadece anlamlı hızla YUKARI geçerken kontrol edilir.
    // Yavaş süzülerek veya geri kayarken geçmek güvenlidir (spec 5.5: yavaş = güvenli).
    if (this.h > prevH && this.vy > this.t.BEND_CHECK_MIN_VY) {
      for (const cp of this.pole.checkpointsBetween(prevH, this.h)) {
        const speed = Math.max(this.vy, this.t.STABILITY_V_EPS);
        const stability = this.spin / (cp.severity * speed);
        if (stability < this.t.STABILITY_CRIT) {
          this.alive = false;
          this.failReason = 'thrown';
          this.h = cp.h;
          events.push({ type: 'fail', reason: 'thrown', h: cp.h, severity: cp.severity, stability });
          return events;
        }
        if (stability < this.t.STABILITY_MIN) {
          this.vy *= this.t.WOBBLE_SPEED_KEEP;
          this.spin *= this.t.WOBBLE_SPIN_KEEP;
          events.push({ type: 'wobble', h: cp.h, severity: cp.severity, stability });
        } else {
          const drag = Math.min(this.t.BEND_DRAG_MAX, cp.severity * this.t.BEND_DRAG);
          this.vy *= 1 - drag;
          events.push({ type: 'clean', h: cp.h, severity: cp.severity, stability });
        }
      }
    }

    // Zemin (spec 5.6): tırmanış başladıysa zemine dönüş = fail,
    // başlamadıysa tüp dipte oturur.
    if (this.h <= 0) {
      this.h = 0;
      if (this.maxH > this.t.GROUND_FAIL_MIN_PEAK) {
        this.alive = false;
        this.failReason = 'ground';
        events.push({ type: 'fail', reason: 'ground', h: 0 });
        return events;
      }
      this.vy = Math.max(0, this.vy);
    }

    if (this.h > this.maxH) this.maxH = this.h;
    return events;
  }
}
