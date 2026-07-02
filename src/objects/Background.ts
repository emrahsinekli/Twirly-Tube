import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, GROUND_Y, PALETTE, TUNING } from '../config/tuning';
import { mulberry32 } from '../systems/Rng';

/**
 * Parallax arka plan (spec 4 + 10):
 * - Gökyüzü: iki gradyan crossfade — yükseldikçe koyulaşır (scrollFactor 0).
 * - Uzak katman (baca, ağaç hattı, elektrik telleri): scrollFactor ~0.35.
 * - Yer katmanı (çimen, tebeşir daire, kalabalık): scrollFactor 1.
 * - Bulutlar: object pool; kamera yükseldikçe üstte doğar, altta geri dönüşür.
 */
export class Background {
  private readonly scene: Phaser.Scene;
  private readonly skyHigh: Phaser.GameObjects.Image;
  private readonly clouds: Phaser.GameObjects.Image[] = [];
  private readonly rng = mulberry32(0xc10d);
  private nextCloudAt: number;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const skyLow = scene.add.image(0, 0, 'sky-low').setOrigin(0);
    skyLow.setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setScrollFactor(0).setDepth(0);
    this.skyHigh = scene.add.image(0, 0, 'sky-high').setOrigin(0);
    this.skyHigh.setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setScrollFactor(0).setDepth(1).setAlpha(0);

    this.drawFarLayer();
    this.drawGroundLayer();

    // bulutlar update() içinde kamera üstünde doğar
    this.nextCloudAt = GROUND_Y - 320;
  }

  /** Baca, ağaç hattı, elektrik telleri — düz silüet. */
  private drawFarLayer(): void {
    const g = this.scene.add.graphics();
    g.setScrollFactor(1, 0.35);
    g.setDepth(2);

    // ağaç hattı
    g.fillStyle(PALETTE.crowd, 0.55);
    for (let x = -20; x < GAME_WIDTH + 20; x += 46) {
      const h = 34 + ((x * 7919) % 23);
      g.fillEllipse(x, GROUND_Y - 20, 64, h);
    }

    // eski tuğla baca (referans sahnenin simgesi)
    const bx = GAME_WIDTH * 0.2;
    const bw = 34;
    const bh = 300;
    g.fillStyle(PALETTE.chimney, 1);
    g.beginPath();
    g.moveTo(bx - bw / 2, GROUND_Y - 8);
    g.lineTo(bx - bw * 0.32, GROUND_Y - bh);
    g.lineTo(bx + bw * 0.32, GROUND_Y - bh);
    g.lineTo(bx + bw / 2, GROUND_Y - 8);
    g.closePath();
    g.fillPath();
    g.fillStyle(PALETTE.chimneyCap, 1);
    g.fillRect(bx - bw * 0.42, GROUND_Y - bh - 10, bw * 0.84, 12);
    g.fillRect(bx - bw * 0.36, GROUND_Y - bh * 0.72, bw * 0.72, 6);

    // elektrik telleri (sağ taraf)
    g.lineStyle(2, 0x4a5560, 0.7);
    for (const [y0, sag] of [
      [GROUND_Y - 210, 26],
      [GROUND_Y - 188, 22]
    ]) {
      g.beginPath();
      g.moveTo(GAME_WIDTH * 0.62, y0);
      for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        const x = GAME_WIDTH * (0.62 + 0.5 * t);
        const y = y0 + Math.sin(t * Math.PI) * sag;
        g.lineTo(x, y);
      }
      g.strokePath();
    }
    g.lineStyle(4, 0x4a5560, 0.8);
    g.beginPath();
    g.moveTo(GAME_WIDTH * 0.62, GROUND_Y - 230);
    g.lineTo(GAME_WIDTH * 0.62, GROUND_Y - 10);
    g.strokePath();
  }

  /** Çimen, tebeşir daire, kalabalık silüeti — yakın katman. */
  private drawGroundLayer(): void {
    const g = this.scene.add.graphics();
    g.setDepth(5);

    g.fillStyle(PALETTE.grass, 1);
    g.fillRect(-40, GROUND_Y, GAME_WIDTH + 80, 400);
    g.fillStyle(PALETTE.grassDark, 1);
    for (let x = -20; x < GAME_WIDTH + 40; x += 34) {
      g.fillEllipse(x, GROUND_Y + 6, 40, 10);
    }

    // tebeşirle çizili daire (direğin dibi)
    g.lineStyle(5, PALETTE.chalk, 0.9);
    g.strokeEllipse(GAME_WIDTH / 2, GROUND_Y + 26, 300, 74);

    // izleyen kalabalık — iki yanda koyu silüet öbekleri
    g.fillStyle(PALETTE.crowd, 1);
    const rng = mulberry32(7);
    for (const side of [-1, 1]) {
      for (let i = 0; i < 9; i++) {
        const x = GAME_WIDTH / 2 + side * (168 + rng() * 92) + (rng() - 0.5) * 30;
        const headY = GROUND_Y - 26 - rng() * 14;
        const w = 17 + rng() * 8;
        g.fillCircle(x, headY, 6.5 + rng() * 2);
        g.fillRoundedRect(x - w / 2, headY + 6, w, 30 + rng() * 10, 6);
      }
    }
  }

  private spawnCloud(worldY: number): void {
    let cloud = this.clouds.find((c) => !c.visible);
    if (!cloud) {
      cloud = this.scene.add.image(0, 0, 'cloud');
      cloud.setDepth(3);
      cloud.setScrollFactor(1, 0.75);
      this.clouds.push(cloud);
    }
    // scrollFactor 0.75 katmanında worldY'nin ekrandaki karşılığına yerleştir
    cloud.setVisible(true);
    cloud.y = worldY;
    cloud.x = 40 + this.rng() * (GAME_WIDTH - 80);
    const s = 0.7 + this.rng() * 0.9;
    cloud.setScale(s).setAlpha(0.5 + this.rng() * 0.4);
  }

  /**
   * Her karede: gökyüzü crossfade + bulut havuzu.
   * h: tüpün yüksekliği (px), scrollY: kamera.
   *
   * scrollFactor 0.75 katmanında ekran konumu: screenY = y - scrollY·0.75.
   */
  update(h: number, scrollY: number): void {
    // ~350 m civarında gökyüzü tamamen "yüksek irtifa" tonuna döner
    const t = Phaser.Math.Clamp((h * TUNING.METERS_PER_PX) / 350, 0, 1);
    this.skyHigh.setAlpha(t);

    const layerTop = scrollY * 0.75; // ekran üst kenarının katman-dünya y'si
    // kamera yükseldikçe üstten yeni bulut doğar; irtifayla seyrekleşir → sahne boşalır
    while (this.nextCloudAt > layerTop - 300) {
      this.spawnCloud(this.nextCloudAt);
      const alt = Math.max(0, GROUND_Y - this.nextCloudAt);
      const gap = 240 + alt * 0.1 + this.rng() * 220;
      this.nextCloudAt -= gap;
    }
    // ekranın altına düşen bulutları havuza geri ver
    for (const c of this.clouds) {
      if (c.visible && c.y - layerTop > GAME_HEIGHT + 100) c.setVisible(false);
    }
  }
}
