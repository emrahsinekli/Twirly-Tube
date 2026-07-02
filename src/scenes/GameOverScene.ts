import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/tuning';
import { audio } from '../systems/Audio';
import { shareScore } from '../systems/Share';
import type { GameMode } from './GameScene';

const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

interface GameOverData {
  meters: number;
  best: number;
  isRecord: boolean;
  mode: GameMode;
  dateKey: string;
  reason: 'thrown' | 'ground';
  bestCombo: number;
}

/** Game over overlay: skor, rekor, anında tekrar dene (<0.5 sn), paylaş. */
export class GameOverScene extends Phaser.Scene {
  private result!: GameOverData;
  private toast: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('GameOver');
  }

  init(data: GameOverData): void {
    this.result = data;
  }

  create(): void {
    this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x11303f, 0.62)
      .setOrigin(0)
      .setInteractive(); // alttaki sahneye dokunuşları kes

    const cy = GAME_HEIGHT * 0.5;

    this.add
      .text(GAME_WIDTH / 2, cy - 220, this.result.reason === 'thrown' ? 'SAVRULDUN!' : 'DÜŞTÜN!', {
        fontFamily: FONT,
        fontSize: '52px',
        fontStyle: '900',
        color: '#ffd9d9'
      })
      .setOrigin(0.5)
      .setStroke('#5e1f1f', 10);

    this.add
      .text(GAME_WIDTH / 2, cy - 120, `${this.result.meters}`, {
        fontFamily: FONT,
        fontSize: '120px',
        fontStyle: '900',
        color: '#ffffff'
      })
      .setOrigin(0.5)
      .setStroke('#2b5a75', 12);
    this.add
      .text(GAME_WIDTH / 2, cy - 38, 'metre', {
        fontFamily: FONT,
        fontSize: '28px',
        fontStyle: '700',
        color: '#ffffff'
      })
      .setOrigin(0.5)
      .setStroke('#2b5a75', 6);

    const recordLine = this.result.isRecord
      ? 'YENİ REKOR! 🎉'
      : `rekor: ${this.result.best} m · en iyi combo x${this.result.bestCombo}`;
    const record = this.add
      .text(GAME_WIDTH / 2, cy + 8, recordLine, {
        fontFamily: FONT,
        fontSize: '22px',
        fontStyle: '800',
        color: this.result.isRecord ? '#ffe066' : '#d9edf7'
      })
      .setOrigin(0.5)
      .setStroke('#2b5a75', 5);
    if (this.result.isRecord) {
      this.tweens.add({
        targets: record,
        scale: 1.15,
        duration: 380,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    this.makeButton(cy + 90, '⟳  TEKRAR DENE', 0x3e8e46, () => this.retry());
    this.makeButton(cy + 176, '⇪  SKORU PAYLAŞ', 0x2e6f9e, () => void this.share());
    this.makeButton(cy + 262, 'MENÜ', 0x5b6b76, () => this.toMenu());
  }

  /** Anında yeniden deneme: aynı mod (günlükte aynı seed → DailySeed date'ten). */
  private retry(): void {
    audio.uiTap();
    const game = this.scene.get('Game');
    this.scene.stop();
    game.scene.restart({ mode: this.result.mode });
  }

  private toMenu(): void {
    audio.uiTap();
    this.scene.stop('Game');
    this.scene.stop('UI');
    this.scene.stop();
    this.scene.start('Menu');
  }

  private async share(): Promise<void> {
    audio.uiTap();
    try {
      const result = await shareScore({
        meters: this.result.meters,
        mode: this.result.mode,
        dateKey: this.result.dateKey,
        best: this.result.best
      });
      if (result === 'copied') this.showToast('Skor panoya kopyalandı!');
      else if (result === 'downloaded') this.showToast('Skor kartı indirildi!');
    } catch {
      this.showToast('Paylaşım kullanılamıyor');
    }
  }

  private showToast(msg: string): void {
    this.toast?.destroy();
    this.toast = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 80, msg, {
        fontFamily: FONT,
        fontSize: '20px',
        fontStyle: '700',
        color: '#ffffff',
        backgroundColor: '#2b5a75',
        padding: { x: 16, y: 10 }
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.tweens.add({ targets: this.toast, alpha: 1, duration: 180 });
    this.time.delayedCall(2200, () => {
      if (this.toast) this.tweens.add({ targets: this.toast, alpha: 0, duration: 300 });
    });
  }

  private makeButton(y: number, label: string, color: number, cb: () => void): void {
    const w = 320;
    const h = 66;
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.25);
    g.fillRoundedRect(GAME_WIDTH / 2 - w / 2 + 3, y - h / 2 + 4, w, h, 18);
    g.fillStyle(color, 1);
    g.fillRoundedRect(GAME_WIDTH / 2 - w / 2, y - h / 2, w, h, 18);
    g.lineStyle(3, 0xffffff, 0.6);
    g.strokeRoundedRect(GAME_WIDTH / 2 - w / 2, y - h / 2, w, h, 18);
    const txt = this.add
      .text(GAME_WIDTH / 2, y, label, {
        fontFamily: FONT,
        fontSize: '26px',
        fontStyle: '900',
        color: '#ffffff'
      })
      .setOrigin(0.5);
    const zone = this.add.zone(GAME_WIDTH / 2, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      this.tweens.add({ targets: txt, scale: 0.93, duration: 60, yoyo: true });
      cb();
    });
  }
}
