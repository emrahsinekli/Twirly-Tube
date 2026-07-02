import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/tuning';

const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

/** HUD: yükseklik sayacı, combo, milestone banner'ı, öğretici ipucu. */
export class UIScene extends Phaser.Scene {
  private metersText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private flash!: Phaser.GameObjects.Rectangle;
  private hint!: Phaser.GameObjects.Container;

  constructor() {
    super('UI');
  }

  create(): void {
    this.metersText = this.add
      .text(GAME_WIDTH / 2, 34, '0 m', {
        fontFamily: FONT,
        fontSize: '46px',
        fontStyle: '900',
        color: '#ffffff'
      })
      .setOrigin(0.5, 0)
      .setStroke('#2b5a75', 7)
      .setShadow(0, 3, 'rgba(0,0,0,0.25)', 4);

    this.comboText = this.add
      .text(GAME_WIDTH / 2, 92, '', {
        fontFamily: FONT,
        fontSize: '24px',
        fontStyle: '800',
        color: '#fff6c9'
      })
      .setOrigin(0.5, 0)
      .setStroke('#8a6d1a', 5);

    this.banner = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.3, '', {
        fontFamily: FONT,
        fontSize: '40px',
        fontStyle: '900',
        color: '#ffffff',
        align: 'center'
      })
      .setOrigin(0.5)
      .setStroke('#2b5a75', 8)
      .setAlpha(0);

    this.flash = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xffffff, 1)
      .setOrigin(0)
      .setAlpha(0);

    this.hint = this.buildHint();

    const game = this.scene.get('Game');
    let hintHidden = false;
    const onHud = (m: number, combo: number) => {
      this.metersText.setText(`${m} m`);
      this.comboText.setText(combo > 1 ? `COMBO x${combo}` : '');
      if (!hintHidden && m > 3) {
        hintHidden = true;
        this.hideHint();
      }
    };
    const onMilestone = (m: number) => this.showMilestone(m);
    const onClean = () => this.popCombo();
    const onWobble = () => this.wobbleFeedback();
    const onFirstFlick = () => this.hideHint();

    game.events.on('hud', onHud);
    game.events.on('milestone', onMilestone);
    game.events.on('clean', onClean);
    game.events.on('wobble', onWobble);
    game.events.on('first-flick', onFirstFlick);
    this.events.once('shutdown', () => {
      game.events.off('hud', onHud);
      game.events.off('milestone', onMilestone);
      game.events.off('clean', onClean);
      game.events.off('wobble', onWobble);
      game.events.off('first-flick', onFirstFlick);
    });
  }

  private buildHint(): Phaser.GameObjects.Container {
    const c = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT * 0.68);
    const txt = this.add
      .text(0, 44, 'Yukarı doğru hızla sürükle!', {
        fontFamily: FONT,
        fontSize: '26px',
        fontStyle: '700',
        color: '#ffffff'
      })
      .setOrigin(0.5)
      .setStroke('#2b5a75', 6);
    const arrow = this.add
      .text(0, -12, '↑', {
        fontFamily: FONT,
        fontSize: '64px',
        fontStyle: '900',
        color: '#ffffff'
      })
      .setOrigin(0.5)
      .setStroke('#2b5a75', 8);
    c.add([txt, arrow]);
    this.tweens.add({
      targets: arrow,
      y: -46,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    return c;
  }

  private hideHint(): void {
    this.tweens.add({ targets: this.hint, alpha: 0, duration: 250 });
  }

  private popCombo(): void {
    this.comboText.setScale(1.45);
    this.tweens.add({ targets: this.comboText, scale: 1, duration: 180, ease: 'Back.easeOut' });
  }

  private wobbleFeedback(): void {
    this.comboText.setColor('#ff8484');
    this.time.delayedCall(350, () => this.comboText.setColor('#fff6c9'));
  }

  private showMilestone(m: number): void {
    this.banner.setText(`${m} METRE!`);
    this.banner.setAlpha(1).setScale(0.4);
    this.flash.setAlpha(0.35);
    this.tweens.add({ targets: this.flash, alpha: 0, duration: 320 });
    this.tweens.add({
      targets: this.banner,
      scale: 1,
      duration: 260,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({ targets: this.banner, alpha: 0, duration: 500, delay: 700 });
      }
    });
  }
}
