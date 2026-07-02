import Phaser from 'phaser';

/**
 * Kahraman öğe: beyaz spiral tüp. Spin görseli, spiral şeritlerin
 * TileSprite üzerinde kaydırılmasıyla verilir (spec 11).
 */
export class TubeSprite extends Phaser.GameObjects.Container {
  private readonly stripes: Phaser.GameObjects.TileSprite;
  private wobbleTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    const body = scene.add.image(0, 0, 'tube-body');
    // şeritler kapsülün düz orta bölgesinde kalır → maske gerekmez
    this.stripes = scene.add.tileSprite(0, -1, 38, 26, 'tube-stripes');
    this.add([body, this.stripes]);
    this.setDepth(20);
    scene.add.existing(this);
  }

  /** Her karede: spin → şerit kayması + hafif eğim. */
  updateVisual(spin: number, slope: number, dt: number): void {
    this.stripes.tilePositionX -= spin * dt * 0.12;
    // direğin yerel eğimine yasla (savruluyormuş hissi)
    this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, Math.atan(slope) * 0.45, dt * 6);
  }

  wobble(): void {
    this.wobbleTween?.remove();
    this.wobbleTween = this.scene.tweens.add({
      targets: this,
      angle: { from: -14, to: 14 },
      duration: 60,
      yoyo: true,
      repeat: 4,
      onComplete: () => {
        this.angle = 0;
      }
    });
  }

  /** Savrulup düşme animasyonu (thrown fail). */
  flyOff(direction: number): void {
    this.wobbleTween?.remove();
    this.scene.tweens.add({
      targets: this,
      x: this.x + 260 * direction,
      y: this.y + 480,
      angle: 720 * direction,
      alpha: 0.4,
      duration: 900,
      ease: 'Cubic.easeIn'
    });
  }
}
