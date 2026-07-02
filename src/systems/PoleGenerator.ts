import type { Tuning } from '../config/tuning';
import { mulberry32 } from './Rng';

/**
 * Prosedürel bambu direği (spec 5.4).
 *
 * Yatay sapma: offset(h) = amp(h) * sin(θ(h)), θ(h) = FG·h² + FB·h + faz.
 * amp ve frekans yükseklikle artar → yukarısı daha kıvrımlı.
 * h: zeminden yükseklik (px, yukarı pozitif). Sonsuzdur; tepe noktası yoktur.
 *
 * "Kıvrım checkpoint'leri": eğimin maksimum olduğu noktalar (sin(θ)=0, |cos(θ)|=1),
 * yani θ = kπ. Tüp bir checkpoint'i yukarı doğru geçerken denge kontrolü yapılır.
 * Checkpoint'ler kapalı formda (ikinci derece denklem) çözülür → deterministik
 * ve frame hızından bağımsız.
 */

export interface BendCheckpoint {
  /** Checkpoint yüksekliği (px). */
  h: number;
  /** Kıvrım şiddeti = |amp(h) · θ'(h)| (px yatay / px dikey eğim). */
  severity: number;
  /** sin dalgasının kaçıncı sıfır geçişi (debug/test için). */
  k: number;
}

export class PoleGeometry {
  readonly seed: number;
  private readonly t: Tuning;
  private readonly phase: number;
  private readonly fb: number; // taban frekans (jitter'lı)
  private readonly fg: number; // frekans büyümesi (jitter'lı)
  private readonly ampScale: number;
  private readonly cps: BendCheckpoint[] = [];
  private nextK: number;

  constructor(seed: number, tuning: Tuning) {
    this.seed = seed >>> 0;
    this.t = tuning;
    const rng = mulberry32(this.seed);
    this.phase = rng() * Math.PI * 2;
    this.fb = tuning.BEND_FREQ_BASE * (0.9 + 0.2 * rng());
    this.fg = tuning.BEND_FREQ_GROWTH * (0.8 + 0.4 * rng());
    this.ampScale = 0.9 + 0.2 * rng();
    // θ(0) = phase → ilk checkpoint θ = kπ ≥ phase olan ilk k.
    this.nextK = Math.ceil(this.phase / Math.PI);
    // Zemine çok yakın checkpoint istemiyoruz (öğrenme alanı) — 400px altındakileri atla.
    while (this.solveK(this.nextK) < 400) this.nextK++;
  }

  private theta(h: number): number {
    return this.fg * h * h + this.fb * h + this.phase;
  }

  private thetaPrime(h: number): number {
    return 2 * this.fg * h + this.fb;
  }

  /** Kıvrım genliği (px), yükseklikle artar, üstten sınırlı. */
  ampAt(h: number): number {
    const a = (this.t.BEND_AMP_BASE + this.t.BEND_AMP_GROWTH * Math.max(0, h)) * this.ampScale;
    return Math.min(a, this.t.BEND_AMP_MAX);
  }

  /** Direğin merkez çizgisinin yatay sapması (px). */
  offsetAt(h: number): number {
    return this.ampAt(h) * Math.sin(this.theta(h));
  }

  /** Direk genişliği (px) — yukarı incelir. */
  widthAt(h: number): number {
    return Math.max(
      this.t.POLE_WIDTH_MIN,
      this.t.POLE_WIDTH_BASE - this.t.POLE_WIDTH_TAPER * Math.max(0, h)
    );
  }

  /** Yerel eğim |d offset / dh| (sayısal türev, görsel/debug için). */
  slopeAt(h: number): number {
    const e = 0.5;
    return Math.abs((this.offsetAt(h + e) - this.offsetAt(h - e)) / (2 * e));
  }

  /** θ(h) = kπ denkleminin pozitif kökü. */
  private solveK(k: number): number {
    const c = this.phase - k * Math.PI; // fg·h² + fb·h + c = 0
    if (this.fg <= 1e-16) return -c / this.fb;
    const disc = this.fb * this.fb - 4 * this.fg * c;
    if (disc <= 0) return -c / this.fb;
    return (-this.fb + Math.sqrt(disc)) / (2 * this.fg);
  }

  private ensureCheckpointsUpTo(h: number): void {
    while (this.cps.length === 0 || this.cps[this.cps.length - 1].h < h) {
      const k = this.nextK++;
      const ch = this.solveK(k);
      this.cps.push({
        h: ch,
        severity: this.ampAt(ch) * this.thetaPrime(ch),
        k
      });
    }
  }

  /** (fromH, toH] aralığında yukarı geçilen checkpoint'ler (artan sırada). */
  checkpointsBetween(fromH: number, toH: number): BendCheckpoint[] {
    if (toH <= fromH) return [];
    this.ensureCheckpointsUpTo(toH);
    return this.cps.filter((c) => c.h > fromH && c.h <= toH);
  }

  /** hFrom üstündeki ilk checkpoint (HUD/önizleme için). */
  nextCheckpointAfter(h: number): BendCheckpoint {
    this.ensureCheckpointsUpTo(h + 1);
    let i = this.cps.findIndex((c) => c.h > h);
    while (i < 0) {
      this.ensureCheckpointsUpTo(this.cps[this.cps.length - 1].h * 2 + 1000);
      i = this.cps.findIndex((c) => c.h > h);
    }
    return this.cps[i];
  }
}
