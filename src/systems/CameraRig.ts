import Phaser from 'phaser';
import { GAME_HEIGHT, GROUND_Y, TUNING } from '../config/tuning';

/**
 * Kamera SADECE dikey takip eder (spec 4). Tüp ekranın alttan
 * CAM_TUBE_FROM_BOTTOM oranında tutulur; zeminin altına inilmez.
 */
export class CameraRig {
  private readonly cam: Phaser.Cameras.Scene2D.Camera;

  constructor(cam: Phaser.Cameras.Scene2D.Camera) {
    this.cam = cam;
    cam.setScroll(0, this.clampScroll(this.targetFor(0)));
  }

  private targetFor(h: number): number {
    const tubeWorldY = GROUND_Y - h;
    return tubeWorldY - GAME_HEIGHT * (1 - TUNING.CAM_TUBE_FROM_BOTTOM);
  }

  /** Zemin sahnesinin altını göstermeyecek şekilde sınırla. */
  private clampScroll(y: number): number {
    return Math.min(y, 0);
  }

  update(h: number, dt: number): void {
    const target = this.clampScroll(this.targetFor(h));
    // kare hızından bağımsız lerp (60 fps referanslı CAM_FOLLOW_LERP)
    const a = 1 - Math.pow(1 - TUNING.CAM_FOLLOW_LERP, dt * 60);
    this.cam.scrollY += (target - this.cam.scrollY) * a;
  }

  get scrollY(): number {
    return this.cam.scrollY;
  }

  snapTo(h: number): void {
    this.cam.scrollY = this.clampScroll(this.targetFor(h));
  }
}
