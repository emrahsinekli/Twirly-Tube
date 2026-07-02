import Phaser from 'phaser';
import { GAME_HEIGHT, GROUND_Y, TUNING } from '../config/tuning';
import { Background } from '../objects/Background';
import { PoleRenderer } from '../objects/Pole';
import { TubeSprite } from '../objects/Tube';
import { audio } from '../systems/Audio';
import { CameraRig } from '../systems/CameraRig';
import { dailySeed, dateKey } from '../systems/DailySeed';
import { haptics } from '../systems/Haptics';
import { TubePhysics } from '../systems/Physics';
import { PoleGeometry } from '../systems/PoleGenerator';
import { randomSeed } from '../systems/Rng';
import { HighScores, ScoreTracker } from '../systems/Score';

export type GameMode = 'endless' | 'daily';

interface FlickSample {
  t: number;
  y: number;
}

/**
 * Oyun döngüsü: flick girdisi → TubePhysics → olaylar → juice + skor.
 * Fizik tamamen src/systems'te yaşar; bu sahne yalnızca giriş/çıkış katmanıdır.
 */
export class GameScene extends Phaser.Scene {
  private mode: GameMode = 'endless';
  private tube!: TubePhysics;
  private geo!: PoleGeometry;
  private score!: ScoreTracker;
  private highScores!: HighScores;
  private poleR!: PoleRenderer;
  private tubeSprite!: TubeSprite;
  private bg!: Background;
  private camRig!: CameraRig;
  private particles!: Phaser.GameObjects.Particles.ParticleEmitter;

  private state: 'playing' | 'dying' = 'playing';
  private timeScaleCustom = 1;
  private samples: FlickSample[] = [];
  private dragging = false;
  private firstFlickDone = false;

  constructor() {
    super('Game');
  }

  init(data: { mode?: GameMode }): void {
    this.mode = data.mode ?? 'endless';
    this.state = 'playing';
    this.timeScaleCustom = 1;
    this.samples = [];
    this.dragging = false;
    this.firstFlickDone = false;
  }

  create(): void {
    const seed = this.mode === 'daily' ? dailySeed() : randomSeed();
    this.geo = new PoleGeometry(seed, TUNING);
    this.tube = new TubePhysics(this.geo, TUNING);
    this.score = new ScoreTracker(TUNING);
    this.highScores = new HighScores();

    this.bg = new Background(this);
    this.poleR = new PoleRenderer(this, this.geo);
    this.tubeSprite = new TubeSprite(this);
    this.particles = this.add.particles(0, 0, 'particle', {
      speed: { min: 60, max: 220 },
      scale: { start: 1, end: 0 },
      lifespan: 450,
      emitting: false
    });
    this.particles.setDepth(25);

    this.camRig = new CameraRig(this.cameras.main);
    this.positionTube();
    this.camRig.snapTo(this.tube.h);

    this.setupInput();

    if (this.scene.isActive('UI') || this.scene.isPaused('UI')) this.scene.stop('UI');
    this.scene.launch('UI', { mode: this.mode });
  }

  private setupInput(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      audio.unlock();
      this.dragging = true;
      this.samples = [{ t: this.time.now, y: p.y }];
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.dragging) return;
      this.samples.push({ t: this.time.now, y: p.y });
      if (this.samples.length > 40) this.samples.shift();
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!this.dragging) return;
      this.dragging = false;
      this.samples.push({ t: this.time.now, y: p.y });
      this.applyFlick();
    });
  }

  /**
   * Sürüklemeden dikey hız çıkar (spec 5.3): son ~150 ms'lik pencere ile
   * tüm sürüklemenin ortalamasından büyük olanı alınır — seyrek pointer
   * örneklemesinde de (düşük Hz ekranlar) flick kaybolmaz.
   */
  private applyFlick(): void {
    if (this.state !== 'playing') return;
    const last = this.samples[this.samples.length - 1];
    let windowFirst = this.samples[0];
    for (const s of this.samples) {
      if (last.t - s.t <= 150) {
        windowFirst = s;
        break;
      }
    }
    const velocityFrom = (a: FlickSample, b: FlickSample): number =>
      b.t - a.t < 8 ? 0 : ((a.y - b.y) / (b.t - a.t)) * 1000; // yukarı sürükleme = -y → pozitif
    const swipeVelocity = Math.max(
      velocityFrom(windowFirst, last),
      velocityFrom(this.samples[0], last)
    );
    const impulse = this.tube.flick(swipeVelocity);
    if (impulse > 0) {
      audio.flick(impulse / TUNING.IMPULSE_MAX);
      haptics.light();
      if (!this.firstFlickDone) {
        this.firstFlickDone = true;
        this.events.emit('first-flick');
      }
    }
  }

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs, 50) / 1000;
    const simDt = dt * this.timeScaleCustom;

    if (this.state === 'playing') {
      const events = this.tube.update(simDt);
      const milestone = this.score.update(this.tube.maxH, events);

      for (const e of events) {
        if (e.type === 'clean') {
          audio.tick(this.score.combo);
          haptics.light();
          this.particles.emitParticleAt(this.tubeSprite.x, this.tubeSprite.y, 10);
          this.events.emit('clean', this.score.combo);
        } else if (e.type === 'wobble') {
          audio.wobble();
          haptics.medium();
          this.tubeSprite.wobble();
          this.cameras.main.shake(140, 0.006);
          this.events.emit('wobble');
        } else if (e.type === 'fail') {
          this.die(e.reason, e.type === 'fail' && 'severity' in e ? Math.sign(this.geo.offsetAt(e.h + 30) - this.geo.offsetAt(e.h)) || 1 : 1);
        }
      }
      if (milestone !== null) {
        audio.milestone();
        this.events.emit('milestone', milestone);
      }
      this.events.emit('hud', this.score.meters, this.score.combo, this.tube.spin / TUNING.SPIN_MAX);
    }

    // görsel katman her durumda güncellenir (slow-mo düşüş dahil)
    if (this.state === 'playing') this.positionTube();
    this.tubeSprite.updateVisual(this.tube.spin, this.slopeAtTube(), simDt);
    this.camRig.update(this.tube.h, dt);
    this.poleR.draw(this.camRig.scrollY, GAME_HEIGHT);
    this.bg.update(this.tube.h, this.camRig.scrollY);
  }

  private positionTube(): void {
    this.tubeSprite.x = this.poleR.centerX(this.tube.h);
    this.tubeSprite.y = GROUND_Y - this.tube.h - 14;
  }

  private slopeAtTube(): number {
    const h = this.tube.h;
    return (this.geo.offsetAt(h + 4) - this.geo.offsetAt(h - 4)) / 8;
  }

  private die(reason: 'thrown' | 'ground', direction: number): void {
    if (this.state !== 'playing') return;
    this.state = 'dying';
    this.timeScaleCustom = TUNING.FAIL_SLOWMO_SCALE;

    audio.fail();
    haptics.fail();
    this.cameras.main.shake(260, 0.012);
    if (reason === 'thrown') {
      this.positionTube();
      this.tubeSprite.flyOff(direction);
      this.particles.emitParticleAt(this.tubeSprite.x, this.tubeSprite.y, 16);
    }

    const meters = this.score.meters;
    const today = dateKey();
    const isRecord = this.highScores.submit(this.mode, meters, today);
    const best = this.highScores.get(this.mode, today);

    this.time.delayedCall(TUNING.FAIL_SLOWMO_MS, () => {
      this.timeScaleCustom = 1;
      this.scene.launch('GameOver', {
        meters,
        best,
        isRecord,
        mode: this.mode,
        dateKey: today,
        reason,
        bestCombo: this.score.bestCombo
      });
      this.scene.pause();
    });
  }
}
