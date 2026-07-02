import { TUNING, type Tuning } from '../src/config/tuning';
import { PoleGeometry } from '../src/systems/PoleGenerator';
import { TubePhysics, type TubeEvent } from '../src/systems/Physics';

/**
 * Headless oyna-test simülatörü — game feel kalibrasyonunun temeli.
 * Basit bir "oyuncu modeli" belirli ritimde flick atar; fizik 120 Hz koşar.
 */

export interface PlayerModel {
  /** Flick aralığı (s). */
  period: number;
  /** Swipe hızı (px/s) — impulse = min(v * IMPULSE_FACTOR, IMPULSE_MAX). */
  swipeVelocity: number;
  /**
   * Dikkatli oyuncu: bir checkpoint'e bu kadar px kala flick atmayı keser,
   * yavaş geçer (0 = hiç kesmez, pervasız oyuncu).
   */
  cautionDistance?: number;
}

export interface SimResult {
  maxH: number;
  meters: number;
  timeAlive: number;
  alive: boolean;
  failReason: 'thrown' | 'ground' | null;
  events: TubeEvent[];
  cleanCount: number;
  wobbleCount: number;
}

export function simulate(
  player: PlayerModel,
  seconds: number,
  seed = 12345,
  tuning: Tuning = TUNING
): SimResult {
  const pole = new PoleGeometry(seed, tuning);
  const tube = new TubePhysics(pole, tuning);
  const dt = 1 / 120;
  const events: TubeEvent[] = [];
  let clock = 0;
  let nextFlick = 0.05;
  let clean = 0;
  let wobble = 0;

  while (clock < seconds && tube.alive) {
    if (clock >= nextFlick) {
      let hold = false;
      if (player.cautionDistance && player.cautionDistance > 0) {
        const cp = pole.nextCheckpointAfter(tube.h);
        // Kıvrıma yaklaşırken ve hızlıyken flick'i kes → yavaş, güvenli geçiş.
        if (cp.h - tube.h < player.cautionDistance && tube.vy > tuning.BEND_CHECK_MIN_VY) {
          hold = true;
        }
      }
      if (!hold) tube.flick(player.swipeVelocity);
      nextFlick = clock + player.period;
    }
    const evs = tube.update(dt);
    for (const e of evs) {
      events.push(e);
      if (e.type === 'clean') clean++;
      if (e.type === 'wobble') wobble++;
    }
    clock += dt;
  }

  return {
    maxH: tube.maxH,
    meters: Math.floor(tube.maxH * tuning.METERS_PER_PX),
    timeAlive: clock,
    alive: tube.alive,
    failReason: tube.failReason,
    events,
    cleanCount: clean,
    wobbleCount: wobble
  };
}

/** Tek max-güç flick sonrası tepe yüksekliği ve yere dönüş süresi. */
export function singleFlickHop(tuning: Tuning = TUNING): { peak: number; airTime: number } {
  const pole = new PoleGeometry(1, tuning);
  const tube = new TubePhysics(pole, tuning);
  const dt = 1 / 120;
  tube.flick(tuning.IMPULSE_MAX / tuning.IMPULSE_FACTOR + 10000);
  let clock = 0;
  while (clock < 10) {
    tube.update(dt);
    clock += dt;
    if (tube.h <= 0 && clock > 0.1) break;
  }
  return { peak: tube.maxH, airTime: clock };
}
