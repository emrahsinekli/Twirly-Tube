import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, TUNING } from '../config/tuning';
import { Background } from '../objects/Background';
import { PoleRenderer } from '../objects/Pole';
import { TubeSprite } from '../objects/Tube';
import { audio } from '../systems/Audio';
import { dailySeed, dateKey } from '../systems/DailySeed';
import { PoleGeometry } from '../systems/PoleGenerator';
import { HighScores } from '../systems/Score';
import type { GameMode } from './GameScene';

const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    // dekor: bugünün direği + dipte tüp
    const bg = new Background(this);
    const geo = new PoleGeometry(dailySeed(), TUNING);
    const pole = new PoleRenderer(this, geo);
    pole.draw(0, GAME_HEIGHT);
    const tube = new TubeSprite(this);
    tube.x = pole.centerX(0);
    tube.y = 800 - 14;
    bg.update(0, 0);
    this.tweens.add({
      targets: tube,
      y: tube.y - 26,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.add
      .text(GAME_WIDTH / 2, 130, 'TWIRLY\nTUBE', {
        fontFamily: FONT,
        fontSize: '84px',
        fontStyle: '900',
        color: '#ffffff',
        align: 'center',
        lineSpacing: -18
      })
      .setOrigin(0.5)
      .setStroke('#2b5a75', 12)
      .setShadow(0, 5, 'rgba(0,0,0,0.25)', 6)
      .setDepth(30);

    this.add
      .text(GAME_WIDTH / 2, 246, 'Tüpü bambunun tepesine fırlat!', {
        fontFamily: FONT,
        fontSize: '22px',
        fontStyle: '600',
        color: '#ffffff'
      })
      .setOrigin(0.5)
      .setStroke('#2b5a75', 5)
      .setDepth(30);

    const hs = new HighScores();
    const bestEndless = hs.get('endless');
    const today = dateKey();
    const bestDaily = hs.get('daily', today);

    this.makeButton(
      GAME_HEIGHT * 0.42,
      '▶  SONSUZ MOD',
      bestEndless > 0 ? `rekor: ${bestEndless} m` : 'rastgele direk · sınırsız tırmanış',
      0x3e8e46,
      'endless'
    );
    this.makeButton(
      GAME_HEIGHT * 0.55,
      '◆  GÜNLÜK DİREK',
      bestDaily > 0 ? `${today} · bugünkü rekorun: ${bestDaily} m` : `${today} · herkes aynı direği tırmanır`,
      0x2e6f9e,
      'daily'
    );

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 26, 'tek parmak · yukarı sürükle · ritmi bul', {
        fontFamily: FONT,
        fontSize: '16px',
        color: '#ffffff'
      })
      .setOrigin(0.5)
      .setAlpha(0.85)
      .setStroke('#2b5a75', 4)
      .setDepth(30);
  }

  private makeButton(
    y: number,
    label: string,
    sub: string,
    color: number,
    mode: GameMode
  ): void {
    const w = 330;
    const h = 74;
    const r = this.add.graphics().setDepth(30);
    r.fillStyle(0x000000, 0.18);
    r.fillRoundedRect(GAME_WIDTH / 2 - w / 2 + 3, y - h / 2 + 5, w, h, 20);
    r.fillStyle(color, 1);
    r.fillRoundedRect(GAME_WIDTH / 2 - w / 2, y - h / 2, w, h, 20);
    r.lineStyle(3, 0xffffff, 0.65);
    r.strokeRoundedRect(GAME_WIDTH / 2 - w / 2, y - h / 2, w, h, 20);

    const txt = this.add
      .text(GAME_WIDTH / 2, y - 10, label, {
        fontFamily: FONT,
        fontSize: '28px',
        fontStyle: '900',
        color: '#ffffff'
      })
      .setOrigin(0.5)
      .setDepth(31);
    const subTxt = this.add
      .text(GAME_WIDTH / 2, y + 20, sub, {
        fontFamily: FONT,
        fontSize: '15px',
        fontStyle: '600',
        color: '#eaf6ff'
      })
      .setOrigin(0.5)
      .setDepth(31);

    const zone = this.add
      .zone(GAME_WIDTH / 2, y, w, h)
      .setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      audio.unlock();
      audio.uiTap();
      this.tweens.add({
        targets: [txt, subTxt],
        scale: 0.94,
        duration: 70,
        yoyo: true,
        onComplete: () => this.scene.start('Game', { mode })
      });
    });
  }
}
