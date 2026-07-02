import { hashString } from './Rng';

/** Yerel takvim gününü YYYY-MM-DD olarak döner (günlük mod anahtarı). */
export function dateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Aynı gün → aynı seed → herkes aynı direği tırmanır (Wordle etkisi). */
export function dailySeed(date: Date = new Date()): number {
  return hashString(`twirly-tube:${dateKey(date)}`);
}
