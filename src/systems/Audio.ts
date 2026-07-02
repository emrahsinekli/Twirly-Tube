/**
 * Asset'siz ses: tüm efektler WebAudio ile sentezlenir.
 * İlk kullanıcı dokunuşunda init edilir (mobil autoplay kısıtı).
 */
export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

  /** Kullanıcı jestiyle çağrılmalı. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  private env(duration: number, peak = 1): GainNode | null {
    if (!this.ctx || !this.master || this.muted) return null;
    const g = this.ctx.createGain();
    const t = this.ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    g.connect(this.master);
    return g;
  }

  /** Flick: kısa gürültü "svuş". */
  flick(strength = 1): void {
    if (!this.ctx) return;
    const g = this.env(0.18, 0.35 * strength);
    if (!g) return;
    const n = this.noise(0.2);
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(700, this.ctx.currentTime);
    f.frequency.exponentialRampToValueAtTime(2400, this.ctx.currentTime + 0.15);
    f.Q.value = 1.2;
    n.connect(f).connect(g);
    n.start();
  }

  /** Temiz kıvrım geçişi: tatmin edici "tık". */
  tick(combo = 1): void {
    if (!this.ctx) return;
    const g = this.env(0.12, 0.5);
    if (!g) return;
    const o = this.ctx.createOscillator();
    o.type = 'triangle';
    const base = 880 * Math.pow(1.06, Math.min(combo, 12));
    o.frequency.setValueAtTime(base, this.ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(base * 1.5, this.ctx.currentTime + 0.06);
    o.connect(g);
    o.start();
    o.stop(this.ctx.currentTime + 0.12);
  }

  /** Savrulma: boğuk vurgu. */
  wobble(): void {
    if (!this.ctx) return;
    const g = this.env(0.25, 0.45);
    if (!g) return;
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(300, this.ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(90, this.ctx.currentTime + 0.22);
    o.connect(g);
    o.start();
    o.stop(this.ctx.currentTime + 0.25);
  }

  /** Fail: düşüş glissandosu. */
  fail(): void {
    if (!this.ctx) return;
    const g = this.env(0.7, 0.5);
    if (!g) return;
    const o = this.ctx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(520, this.ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.65);
    o.connect(g);
    o.start();
    o.stop(this.ctx.currentTime + 0.7);
  }

  /** Milestone: kısa fanfare (üç nota). */
  milestone(): void {
    if (!this.ctx) return;
    const notes = [660, 880, 1320];
    notes.forEach((f, i) => {
      const ctx = this.ctx!;
      const g = this.env(0.55, 0.35);
      if (!g) return;
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      o.connect(g);
      o.start(ctx.currentTime + i * 0.09);
      o.stop(ctx.currentTime + i * 0.09 + 0.4);
    });
  }

  uiTap(): void {
    if (!this.ctx) return;
    const g = this.env(0.08, 0.3);
    if (!g) return;
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = 700;
    o.connect(g);
    o.start();
    o.stop(this.ctx.currentTime + 0.08);
  }

  private noise(duration: number): AudioBufferSourceNode {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }
}

/** Sahneler arası paylaşılan tek instance. */
export const audio = new GameAudio();
