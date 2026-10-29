import { bus, GameEvents } from '@/core/EventBus';

/**
 * Fully procedural audio (WebAudio): a chill synthwave loop + UI sound effects.
 * No audio files are shipped, so the APK stays tiny. To use real tracks later, keep this
 * public API (startMusic/stopMusic/sfx/setVolumes) and swap the internals.
 */
export type SfxName = 'click' | 'back' | 'toggle' | 'select' | 'error' | 'unlock' | 'start';

const mtof = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

// A minor loop: Am - F - C - G (4 bars, 16 sixteenth-steps per bar)
const CHORDS = [
  { root: 45, tones: [57, 60, 64, 69] },
  { root: 41, tones: [53, 57, 60, 65] },
  { root: 48, tones: [55, 60, 64, 67] },
  { root: 43, tones: [55, 59, 62, 67] },
];
const ARP = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 1, 3, 2];
const BASS_STEPS = [0, 3, 6, 8, 11, 14];
// [step, midi, lengthInSteps]
const LEAD: Array<Array<[number, number, number]>> = [
  [[0, 76, 3], [4, 72, 2], [6, 74, 2], [8, 76, 6]],
  [[0, 77, 3], [4, 76, 2], [6, 72, 2], [8, 69, 6]],
  [[0, 72, 2], [2, 76, 2], [4, 79, 4], [10, 76, 2], [12, 74, 4]],
  [[0, 74, 3], [4, 71, 2], [6, 74, 2], [8, 67, 8]],
];

interface ToneOpts {
  type: OscillatorType;
  freq: number;
  freqEnd?: number;
  time: number;
  dur: number;
  vol: number;
  attack?: number;
  release?: number;
  detune?: number;
  lowpass?: number;
  dests: AudioNode[];
}

class AudioService {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private delayIn: GainNode | null = null;
  private noise: AudioBuffer | null = null;

  private timer: number | null = null;
  private nextTime = 0;
  private step = 0;
  private readonly bpm = 100;

  private wantMusic = false;
  private musicVol = 0.7;
  private sfxVol = 0.8;

  private get stepDur(): number {
    return 60 / this.bpm / 4;
  }

  /** Must be called from a user gesture (browsers/WebView block audio before that). */
  unlock(): void {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
    if (this.wantMusic) this.startScheduler();
  }

  setVolumes(music: number, sfx: number): void {
    this.musicVol = music;
    this.sfxVol = sfx;
    if (!this.ctx || !this.musicBus || !this.sfxBus) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(music * 0.55, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(sfx * 0.9, t, 0.05);
  }

  startMusic(): void {
    this.wantMusic = true;
    if (this.ctx && this.ctx.state === 'running') this.startScheduler();
  }

  stopMusic(): void {
    this.wantMusic = false;
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** App went to background. */
  suspend(): void {
    void this.ctx?.suspend();
  }

  /** App returned to foreground. */
  resume(): void {
    if (this.ctx) void this.ctx.resume();
  }

  // ---------------------------------------------------------------- init

  private init(): void {
    const Ctor: typeof AudioContext =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    comp.connect(ctx.destination);

    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(comp);

    this.musicBus = ctx.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus = ctx.createGain();
    this.sfxBus.connect(this.master);

    // ping-pong-ish dotted-eighth delay for plucks and lead
    const delay = ctx.createDelay(1);
    delay.delayTime.value = (60 / this.bpm) * 0.75;
    const fb = ctx.createGain();
    fb.gain.value = 0.38;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2200;
    this.delayIn = ctx.createGain();
    this.delayIn.connect(delay);
    delay.connect(lp);
    lp.connect(fb);
    fb.connect(delay);
    lp.connect(this.musicBus);

    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;

    this.setVolumes(this.musicVol, this.sfxVol);
  }

  // ---------------------------------------------------------------- scheduler

  private startScheduler(): void {
    if (!this.ctx || this.timer !== null) return;
    this.nextTime = this.ctx.currentTime + 0.08;
    this.step = 0;
    this.timer = window.setInterval(() => this.tick(), 25);
  }

  private tick(): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    if (this.nextTime < ctx.currentTime - 0.5) this.nextTime = ctx.currentTime + 0.05; // recover after suspension
    while (this.nextTime < ctx.currentTime + 0.12) {
      this.scheduleStep(this.step, this.nextTime);
      this.nextTime += this.stepDur;
      this.step = (this.step + 1) % 64;
    }
  }

  private scheduleStep(s: number, t: number): void {
    const bar = (s >> 4) & 3;
    const st = s & 15;
    const chord = CHORDS[bar];
    const music = this.musicBus;
    const send = this.delayIn;
    if (!music || !send || !this.ctx) return;
    const sd = this.stepDur;

    if (st % 4 === 0) this.kick(t, st === 0 ? 1 : 0.8);
    if (st === 4 || st === 12) this.clap(t);
    if (st % 2 === 0) this.hat(t, st % 4 === 2 ? 0.28 : 0.14);
    if (BASS_STEPS.includes(st)) {
      this.tone({ type: 'sawtooth', freq: mtof(chord.root + (st === 6 || st === 14 ? 12 : 0)), time: t, dur: sd * 1.6, vol: 0.26, attack: 0.005, release: 0.08, lowpass: 420, dests: [music] });
    }
    this.tone({ type: 'square', freq: mtof(chord.tones[ARP[st]] + 12), time: t, dur: sd * 0.7, vol: 0.05, attack: 0.002, release: 0.09, lowpass: 2600, dests: [music, send] });

    if (st === 0) {
      for (const n of chord.tones.slice(0, 3)) {
        for (const d of [-7, 7]) {
          this.tone({ type: 'sawtooth', freq: mtof(n), time: t, dur: sd * 15, vol: 0.022, attack: 0.5, release: 0.9, detune: d, lowpass: 1000, dests: [music] });
        }
      }
    }
    for (const [ls, note, len] of LEAD[bar]) {
      if (ls === st) {
        this.tone({ type: 'sine', freq: mtof(note), time: t, dur: sd * len, vol: 0.1, attack: 0.02, release: 0.3, dests: [music, send] });
        this.tone({ type: 'triangle', freq: mtof(note + 12), time: t, dur: sd * len, vol: 0.025, attack: 0.02, release: 0.3, dests: [music, send] });
      }
    }

    if (st % 4 === 0) {
      const delayMs = Math.max(0, (t - this.ctx.currentTime) * 1000);
      const payload = { beat: st / 4, bar };
      window.setTimeout(() => bus.emit(GameEvents.Beat, payload), delayMs);
    }
  }

  // ---------------------------------------------------------------- primitives

  private tone(o: ToneOpts): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type;
    osc.frequency.setValueAtTime(o.freq, o.time);
    if (o.freqEnd) osc.frequency.exponentialRampToValueAtTime(o.freqEnd, o.time + o.dur);
    if (o.detune) osc.detune.value = o.detune;

    const attack = o.attack ?? 0.005;
    const release = o.release ?? 0.05;
    g.gain.setValueAtTime(0.0001, o.time);
    g.gain.linearRampToValueAtTime(o.vol, o.time + attack);
    g.gain.setValueAtTime(o.vol, o.time + Math.max(attack, o.dur));
    g.gain.exponentialRampToValueAtTime(0.0001, o.time + o.dur + release);

    let out: AudioNode = osc;
    if (o.lowpass) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = o.lowpass;
      osc.connect(f);
      out = f;
    }
    out.connect(g);
    for (const d of o.dests) g.connect(d);
    osc.start(o.time);
    osc.stop(o.time + o.dur + release + 0.05);
  }

  private noiseBurst(t: number, dur: number, vol: number, filter: BiquadFilterType, freq: number, q = 0.7): void {
    const ctx = this.ctx;
    if (!ctx || !this.noise || !this.musicBus) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.musicBus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  private kick(t: number, vel: number): void {
    if (!this.musicBus) return;
    this.tone({ type: 'sine', freq: 140, freqEnd: 42, time: t, dur: 0.14, vol: 0.85 * vel, attack: 0.001, release: 0.16, dests: [this.musicBus] });
  }
  private hat(t: number, vol: number): void {
    this.noiseBurst(t, 0.05, vol, 'highpass', 7500);
  }
  private clap(t: number): void {
    this.noiseBurst(t, 0.12, 0.3, 'bandpass', 1800, 0.8);
    this.noiseBurst(t + 0.012, 0.1, 0.18, 'bandpass', 2200, 0.8);
  }

  // ---------------------------------------------------------------- sfx

  sfx(name: SfxName): void {
    const ctx = this.ctx;
    const bus_ = this.sfxBus;
    if (!ctx || !bus_ || ctx.state !== 'running' || this.sfxVol <= 0) return;
    const t = ctx.currentTime;
    const blip = (freq: number, end: number, dur: number, vol: number, type: OscillatorType, at = 0): void =>
      this.tone({ type, freq, freqEnd: end, time: t + at, dur, vol, attack: 0.003, release: 0.04, dests: [bus_] });

    switch (name) {
      case 'click':
        blip(900, 1400, 0.06, 0.2, 'square');
        break;
      case 'back':
        blip(720, 420, 0.09, 0.2, 'square');
        break;
      case 'toggle':
        blip(620, 620, 0.05, 0.18, 'square');
        blip(930, 930, 0.06, 0.18, 'square', 0.06);
        break;
      case 'select':
        [660, 880, 1320].forEach((f, i) => blip(f, f, 0.06, 0.16, 'triangle', i * 0.055));
        break;
      case 'error':
        blip(190, 120, 0.2, 0.26, 'sawtooth');
        break;
      case 'unlock':
        [523, 659, 784, 1047].forEach((f, i) => blip(f, f, 0.09, 0.16, 'triangle', i * 0.07));
        break;
      case 'start':
        blip(260, 1100, 0.35, 0.2, 'sawtooth');
        [523, 659, 784].forEach((f) => blip(f, f, 0.3, 0.1, 'triangle', 0.1));
        break;
    }
  }
}

export const audio = new AudioService();
