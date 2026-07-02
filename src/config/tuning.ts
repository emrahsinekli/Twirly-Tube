/**
 * Twirly Tube — tüm ayarlanabilir sayılar tek yerde.
 *
 * Fizik "yükseklik" ekseninde çalışır: h = 0 zemin, yukarı pozitif (px).
 * Ekrana çizerken worldY = GROUND_Y - h dönüşümü yapılır.
 *
 * Kalibrasyon notları için README "Kalibrasyon" bölümüne bak.
 */
export interface Tuning {
  // --- Fizik ---
  /** Aşağı ivme (px/s²) — "ağırlık" hissi. */
  GRAVITY: number;
  /** Hız damping oranı (1/s). */
  FRICTION: number;
  /** Swipe hızı (px/s) → yukarı impulse çarpanı. */
  IMPULSE_FACTOR: number;
  /** Tek flick maksimum impulse (px/s). */
  IMPULSE_MAX: number;
  /** Tek flick minimum impulse (px/s) — altındaki sürüklemeler yok sayılır. */
  IMPULSE_MIN: number;
  /** Ardışık iki flick arası minimum süre (s). */
  FLICK_COOLDOWN: number;
  /** Impulse → spin çarpanı. */
  SPIN_FACTOR: number;
  /** Spin sönme oranı (1/s). */
  SPIN_DECAY: number;
  /** Spin üst sınırı (görsel/denge taşmasın). */
  SPIN_MAX: number;

  // --- Bambu geometrisi ---
  /** Zemindeki kıvrım genliği (px). */
  BEND_AMP_BASE: number;
  /** Genliğin yükseklikle artışı (px / px yükseklik). */
  BEND_AMP_GROWTH: number;
  /** Zemindeki kıvrım frekansı (rad/px). */
  BEND_FREQ_BASE: number;
  /** Frekansın yükseklikle artışı (rad/px²). */
  BEND_FREQ_GROWTH: number;
  /** Genlik üst sınırı (px) — ekrandan taşmasın. */
  BEND_AMP_MAX: number;
  /** Direk taban genişliği (px). */
  POLE_WIDTH_BASE: number;
  /** Genişliğin yükseklikle incelmesi (px / px). */
  POLE_WIDTH_TAPER: number;
  /** Direk minimum genişliği (px). */
  POLE_WIDTH_MIN: number;

  // --- Kıvrım geçişi / denge ---
  /** stability >= bu → temiz geçiş. */
  STABILITY_MIN: number;
  /** stability < bu → savrulup düşme (fail). */
  STABILITY_CRIT: number;
  /** Temiz geçişte hız kaybı çarpanı (severity ile ölçeklenir). */
  BEND_DRAG: number;
  /** Temiz geçişte maksimum hız kaybı oranı. */
  BEND_DRAG_MAX: number;
  /** Savrulmada (wobble) kalan hız oranı. */
  WOBBLE_SPEED_KEEP: number;
  /** Savrulmada kalan spin oranı — savrulmak dengeyi de bozar. */
  WOBBLE_SPIN_KEEP: number;
  /** Stability paydasındaki minimum hız (px/s) — yavaş geçiş güvenlidir. */
  STABILITY_V_EPS: number;
  /** Aşağı inerken kıvrım kontrolü yok; bu hızın altındaki çıkışlar da serbest. */
  BEND_CHECK_MIN_VY: number;

  // --- Başarısızlık ---
  /** Zemine dönüş failinin aktifleşmesi için gereken min tepe yüksekliği (px). */
  GROUND_FAIL_MIN_PEAK: number;

  // --- Kamera / görünüm ---
  /** Kamera yumuşatma (0-1, frame başına 60fps referanslı). */
  CAM_FOLLOW_LERP: number;
  /** Tüpün ekranda alttan oturduğu oran (0 = alt kenar). */
  CAM_TUBE_FROM_BOTTOM: number;
  /** px → metre dönüşümü. */
  METERS_PER_PX: number;

  // --- Skor / akış ---
  /** Milestone aralığı (metre). */
  MILESTONE_METERS: number;
  /** Fail sonrası slow-mo süresi (ms). */
  FAIL_SLOWMO_MS: number;
  /** Fail slow-mo zaman ölçeği. */
  FAIL_SLOWMO_SCALE: number;
}

/**
 * Değerler spec'in başlangıç tablosundan headless oyna-test (tests/sim.ts +
 * tests/gamefeel.test.ts) ile kalibre edildi — gerekçeler README "Kalibrasyon"
 * bölümünde.
 */
export const TUNING: Tuning = {
  // Fizik
  GRAVITY: 1500,
  FRICTION: 0.9,
  IMPULSE_FACTOR: 0.8,
  IMPULSE_MAX: 640,
  IMPULSE_MIN: 60,
  FLICK_COOLDOWN: 0.2,
  SPIN_FACTOR: 0.5,
  SPIN_DECAY: 0.4,
  SPIN_MAX: 700,

  // Bambu geometrisi
  BEND_AMP_BASE: 12,
  BEND_AMP_GROWTH: 0.02,
  BEND_FREQ_BASE: 0.004,
  BEND_FREQ_GROWTH: 1.2e-7,
  BEND_AMP_MAX: 190,
  POLE_WIDTH_BASE: 26,
  POLE_WIDTH_TAPER: 0.0012,
  POLE_WIDTH_MIN: 10,

  // Kıvrım geçişi
  STABILITY_MIN: 1.1,
  STABILITY_CRIT: 0.5,
  BEND_DRAG: 0.25,
  BEND_DRAG_MAX: 0.35,
  WOBBLE_SPEED_KEEP: 0.45,
  WOBBLE_SPIN_KEEP: 0.35,
  STABILITY_V_EPS: 120,
  BEND_CHECK_MIN_VY: 40,

  // Başarısızlık
  GROUND_FAIL_MIN_PEAK: 160,

  // Kamera
  CAM_FOLLOW_LERP: 0.1,
  CAM_TUBE_FROM_BOTTOM: 0.38,
  METERS_PER_PX: 0.03,

  // Skor / akış
  MILESTONE_METERS: 50,
  FAIL_SLOWMO_MS: 550,
  FAIL_SLOWMO_SCALE: 0.25
};

/** Sanat yönü paleti (spec bölüm 10). */
export const PALETTE = {
  skyTop: 0x5fb4de,
  skyBottom: 0xc4e9f3,
  skyHighTop: 0x2f6ea3,
  skyHighBottom: 0x7fc0e0,
  bamboo: 0x8fb84e,
  bambooNode: 0x5e8a2e,
  bambooHighlight: 0xb4d473,
  tubeBody: 0xffffff,
  tubeSpiral: 0xc7c7b9,
  tubeShade: 0xdcdcd0,
  tubeOutline: 0xa8a89a,
  grass: 0x7fbb48,
  grassDark: 0x6fa83e,
  chimney: 0x8896a6,
  chimneyCap: 0x5e6975,
  crowd: 0x33502a,
  chalk: 0xf5f2e8,
  cloud: 0xffffff,
  hudText: 0xffffff,
  hudShadow: 0x2b5a75
} as const;

/** Mantıksal oyun çözünürlüğü (9:16). */
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 854;
/** Zeminin dünya koordinatı (worldY = GROUND_Y - h). */
export const GROUND_Y = 800;
