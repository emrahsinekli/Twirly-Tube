import type { Tuning } from '../config/tuning';
import type { TubeEvent } from './Physics';

/**
 * Skor (spec 6): ana skor = ulaşılan maksimum yükseklik (metre, tam sayı).
 * Geri kayınca azalmaz. Combo çarpanı v1'de HUD/juice içindir; ham metre skoru
 * değiştirmez (spec: "önce ham yükseklik çalışsın").
 */

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class ScoreTracker {
  private readonly t: Tuning;
  private maxHPx = 0;
  /** Combo çarpanı: x1'den başlar, temiz kıvrım geçişiyle artar. */
  combo = 1;
  bestCombo = 1;
  private lastMilestone = 0;

  constructor(tuning: Tuning) {
    this.t = tuning;
  }

  get meters(): number {
    return Math.floor(this.maxHPx * this.t.METERS_PER_PX);
  }

  /**
   * Fizik adımından sonra çağrılır. Yeni milestone'a ulaşıldıysa
   * milestone değerini (metre) döner, yoksa null.
   */
  update(maxHPx: number, events: TubeEvent[]): number | null {
    this.maxHPx = Math.max(this.maxHPx, maxHPx);
    for (const e of events) {
      if (e.type === 'clean') {
        this.combo += 1;
        this.bestCombo = Math.max(this.bestCombo, this.combo);
      } else if (e.type === 'wobble' || e.type === 'fail') {
        this.combo = 1;
      }
    }
    const m = Math.floor(this.meters / this.t.MILESTONE_METERS) * this.t.MILESTONE_METERS;
    if (m > this.lastMilestone) {
      this.lastMilestone = m;
      return m;
    }
    return null;
  }
}

/** High score kalıcılığı — localStorage; test için enjekte edilebilir. */
export class HighScores {
  private readonly storage: StorageLike | null;

  constructor(storage?: StorageLike) {
    this.storage = storage ?? safeLocalStorage();
  }

  private key(mode: 'endless' | 'daily', dateKey?: string): string {
    return mode === 'daily' ? `tt:best:daily:${dateKey}` : 'tt:best:endless';
  }

  get(mode: 'endless' | 'daily', dateKey?: string): number {
    try {
      const v = this.storage?.getItem(this.key(mode, dateKey));
      return v ? Math.max(0, parseInt(v, 10) || 0) : 0;
    } catch {
      return 0;
    }
  }

  /** Skoru kaydeder; yeni rekor ise true döner. */
  submit(mode: 'endless' | 'daily', meters: number, dateKey?: string): boolean {
    const best = this.get(mode, dateKey);
    if (meters > best) {
      try {
        this.storage?.setItem(this.key(mode, dateKey), String(meters));
      } catch {
        /* private mode vb. — sessizce geç */
      }
      return true;
    }
    return false;
  }
}

function safeLocalStorage(): StorageLike | null {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('tt:probe', '1');
      localStorage.removeItem('tt:probe');
      return localStorage;
    }
  } catch {
    /* kullanılamıyor */
  }
  return null;
}
