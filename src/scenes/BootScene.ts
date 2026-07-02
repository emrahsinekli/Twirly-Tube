import Phaser from 'phaser';
import { GAME_HEIGHT, PALETTE } from '../config/tuning';

/**
 * Asset yok — tüm dokular kodla üretilir (küçük paket, anında yükleme).
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.makeSky('sky-low', PALETTE.skyTop, PALETTE.skyBottom);
    this.makeSky('sky-high', PALETTE.skyHighTop, PALETTE.skyHighBottom);
    this.makeTubeBody();
    this.makeTubeStripes();
    this.makeCloud();
    this.makeParticle();
    this.scene.start('Menu');
  }

  private makeSky(key: string, top: number, bottom: number): void {
    const tex = this.textures.createCanvas(key, 8, GAME_HEIGHT);
    if (!tex) return;
    const ctx = tex.getContext();
    const grad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    grad.addColorStop(0, hex(top));
    grad.addColorStop(1, hex(bottom));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 8, GAME_HEIGHT);
    tex.refresh();
  }

  /** Beyaz kapsül tüp: gövde + alt gölge + dış hat (spec 10). */
  private makeTubeBody(): void {
    const w = 64;
    const h = 36;
    const g = this.add.graphics();
    g.fillStyle(PALETTE.tubeBody, 1);
    g.fillRoundedRect(0, 0, w, h, h / 2);
    // silindir gölgesi (alt kenar)
    g.fillStyle(PALETTE.tubeShade, 1);
    g.fillRoundedRect(4, h - 13, w - 8, 9, 4.5);
    // dış hat — gökyüzüne karşı okunabilirlik
    g.lineStyle(2.5, PALETTE.tubeOutline, 1);
    g.strokeRoundedRect(1.25, 1.25, w - 2.5, h - 2.5, (h - 2.5) / 2);
    g.generateTexture('tube-body', w, h);
    g.destroy();
  }

  /** Yatayda döşenebilir diagonal spiral şerit deseni (spin görseli). */
  private makeTubeStripes(): void {
    const w = 26;
    const h = 26;
    const tex = this.textures.createCanvas('tube-stripes', w, h);
    if (!tex) return;
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = hex(PALETTE.tubeSpiral);
    ctx.lineWidth = 7;
    ctx.lineCap = 'butt';
    // sarma sürekliliği için tekrar eden diagonal (x-w ve x+w kopyaları)
    for (const off of [-w, 0, w]) {
      ctx.beginPath();
      ctx.moveTo(off - 6, h + 4);
      ctx.lineTo(off + w * 0.55, -4);
      ctx.stroke();
    }
    tex.refresh();
  }

  private makeCloud(): void {
    const g = this.add.graphics();
    g.fillStyle(PALETTE.cloud, 0.9);
    g.fillEllipse(38, 26, 62, 26);
    g.fillEllipse(66, 20, 52, 22);
    g.fillEllipse(88, 28, 46, 18);
    g.generateTexture('cloud', 120, 44);
    g.destroy();
  }

  private makeParticle(): void {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('particle', 8, 8);
    g.destroy();
  }
}

function hex(c: number): string {
  return `#${c.toString(16).padStart(6, '0')}`;
}
