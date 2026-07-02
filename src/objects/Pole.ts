import Phaser from 'phaser';
import { GAME_WIDTH, GROUND_Y, PALETTE } from '../config/tuning';
import type { PoleGeometry } from '../systems/PoleGenerator';

const SEG = 8; // px dikey örnekleme adımı
const NODE_SPACING = 96; // bambu boğum aralığı (px)

/**
 * Prosedürel sonsuz direk çizimi: her karede yalnızca kameranın gördüğü dilim
 * yeniden çizilir (tek Graphics — ekran dışı geometri hiç üretilmez,
 * aşağıda kalan kısım kendiliğinden "temizlenir").
 */
export class PoleRenderer {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly geo: PoleGeometry;

  constructor(scene: Phaser.Scene, geo: PoleGeometry) {
    this.geo = geo;
    this.g = scene.add.graphics();
    this.g.setDepth(10);
  }

  /** h yüksekliğindeki direk merkezinin dünya-x'i. */
  centerX(h: number): number {
    return GAME_WIDTH / 2 + this.geo.offsetAt(h);
  }

  draw(scrollY: number, viewH: number): void {
    const g = this.g;
    g.clear();
    const topWorldY = scrollY - SEG * 2;
    const bottomWorldY = Math.min(scrollY + viewH + SEG * 2, GROUND_Y);

    // gövde: kısa kalın segmentler
    let prevX = this.centerX(GROUND_Y - bottomWorldY);
    let prevY = bottomWorldY;
    for (let wy = bottomWorldY - SEG; wy >= topWorldY; wy -= SEG) {
      const h = GROUND_Y - wy;
      const x = this.centerX(h);
      const w = this.geo.widthAt(h);
      g.lineStyle(w, PALETTE.bamboo, 1);
      g.beginPath();
      g.moveTo(prevX, prevY + 1);
      g.lineTo(x, wy);
      g.strokePath();
      // highlight şeridi (tek, sol tarafta)
      g.lineStyle(Math.max(2, w * 0.22), PALETTE.bambooHighlight, 0.9);
      g.beginPath();
      g.moveTo(prevX - w * 0.26, prevY + 1);
      g.lineTo(x - w * 0.26, wy);
      g.strokePath();
      prevX = x;
      prevY = wy;
    }

    // boğumlar
    const hTop = GROUND_Y - topWorldY;
    const hBottom = Math.max(0, GROUND_Y - bottomWorldY);
    const firstNode = Math.ceil(hBottom / NODE_SPACING) * NODE_SPACING;
    for (let h = firstNode; h <= hTop; h += NODE_SPACING) {
      const wy = GROUND_Y - h;
      const x = this.centerX(h);
      const w = this.geo.widthAt(h);
      g.lineStyle(3, PALETTE.bambooNode, 1);
      g.beginPath();
      g.moveTo(x - w / 2, wy);
      g.lineTo(x + w / 2, wy);
      g.strokePath();
      // boğumda hafif şişkinlik
      g.fillStyle(PALETTE.bambooNode, 0.35);
      g.fillEllipse(x, wy, w + 4, 5);
    }
  }

  destroy(): void {
    this.g.destroy();
  }
}
