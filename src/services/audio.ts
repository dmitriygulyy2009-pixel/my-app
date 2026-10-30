import { bus, GameEvents } from '@/core/EventBus';
import { ARPS, DRUMS, compose, type Arrangement } from '@/data/composer';
import { getTrack, type TrackDef } from '@/data/tracks';

/**
 * Fully procedural audio (WebAudio). A small "composer" turns each TrackDef (data/tracks.ts) into an 8-bar
 * arrangement — drums, bass, arpeggio, pads, lead melody — so every level has its own song and the APK ships no
 * audio files. Public API (playTrack / stopMusic / pause / resume / sfx / setVolumes) hides all of it, so real
 * recorded tracks could replace this later without touching the game code.
 */
export type SfxName =
  | 'click' | 'back' | 'toggle' | 'select' | 'error' | 'unlock' | 'start'
  | 'explode' | 'pad' | 'orb' | 'portal' | 'win' | 'place' | 'erase';

const mtof = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

interface TrackBus { out: GainNode; send: GainNode; nodes: AudioNode[] }

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
  private musicOut: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private noise: AudioBuffer | null = null;

  private tb: TrackBus | null = null;
  private arr: Arrangement | null = null;
  private timer: number | null = null;
  private nextTime = 0;
  private step = 0;

  private trackId = 'menu';
  private wantMusic = false;
  private musicVol = 0.7;
  private sfxVol = 0.8;

  /** id of the track that is (or should be) playing */
  get currentTrack(): string {
    return this.trackId;
  }

  private get stepDur(): number {
    return 60 / (this.arr?.def.bpm ?? 100) / 4;
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
    if (!this.ctx || !this.musicOut || !this.sfxBus) return;
    const t = this.ctx.currentTime;
    this.musicOut.gain.setTargetAtTime(music * 0.55, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(sfx * 0.9, t, 0.05);
  }

  /**
   * Play a track. If it is already playing nothing happens, unless `restart` is true
   * (used when the player respawns: GD restarts the song from the beginning).
   */
  playTrack(id: string, restart = false): void {
    const same = id === this.trackId && this.arr !== null;
    this.wantMusic = true;
    if (same && !restart && this.timer !== null) return;
    this.trackId = id;
    this.killScheduler(0.12);
    this.arr = compose(getTrack(id));
    this.step = 0;
    if (this.ctx && this.ctx.state === 'running') {
      this.createBus();
      this.startScheduler();
    }
  }

  /** Resume the last track (used by menus). */
  startMusic(): void {
    this.playTrack(this.trackId);
  }

  /** Fade out and stop. */
  stopMusic(fade = 0.25): void {
    this.wantMusic = false;
    this.killScheduler(fade);
  }

  /** Freeze the song (pause menu); `resumeMusic` continues where it stopped. */
  pauseMusic(): void {
    this.killScheduler(0.1);
  }

  resumeMusic(): void {
    if (!this.wantMusic || !this.arr || !this.ctx) return;
    this.createBus();
    this.startScheduler();
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

    this.musicOut = ctx.createGain();
    this.musicOut.connect(this.master);
    this.sfxBus = ctx.createGain();
    this.sfxBus.connect(this.master);

    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;

    this.setVolumes(this.musicVol, this.sfxVol);
  }

  /** A fresh bus (+ dotted-eighth delay) per playback, so an old song can be faded out while a new one starts. */
  private createBus(): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicOut || !this.arr) return;
    const out = ctx.createGain();
    out.connect(this.musicOut);
    const delay = ctx.createDelay(1);
    delay.delayTime.value = (60 / this.arr.def.bpm) * 0.75;
    const fb = ctx.createGain();
    fb.gain.value = 0.36;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2200;
    const send = ctx.createGain();
    send.connect(delay);
    delay.connect(lp);
    lp.connect(fb);
    fb.connect(delay);
    lp.connect(out);
    this.tb = { out, send, nodes: [out, delay, fb, lp, send] };
  }

  private killScheduler(fade: number): void {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    const old = this.tb;
    this.tb = null;
    if (old && this.ctx) {
      old.out.gain.cancelScheduledValues(this.ctx.currentTime);
      old.out.gain.setTargetAtTime(0, this.ctx.currentTime, fade / 3);
      window.setTimeout(() => old.nodes.forEach((n) => n.disconnect()), fade * 1000 + 900);
    }
  }

  // ---------------------------------------------------------------- scheduler

  private startScheduler(): void {
    if (!this.ctx || !this.arr || this.timer !== null) return;
    if (!this.tb) this.createBus();
    this.nextTime = this.ctx.currentTime + 0.08;
    this.timer = window.setInterval(() => this.tick(), 25);
  }

  private tick(): void {
    const ctx = this.ctx;
    if (!ctx || !this.arr || ctx.state !== 'running') return;
    if (this.nextTime < ctx.currentTime - 0.5) this.nextTime = ctx.currentTime + 0.05;
    while (this.nextTime < ctx.currentTime + 0.12) {
      this.scheduleStep(this.step, this.nextTime);
      this.nextTime += this.stepDur;
      this.step = (this.step + 1) % 128;
    }
  }

  private scheduleStep(s: number, t: number): void {
    const arr = this.arr;
    const tb = this.tb;
    const ctx = this.ctx;
    if (!arr || !tb || !ctx) return;
    const def = arr.def;
    const barIdx = (s >> 4) & 7;
    const st = s & 15;
    const bar = arr.bars[barIdx];
    const drums = DRUMS[def.drums];
    const sd = this.stepDur;
    const out = tb.out;
    const send = tb.send;
    const e = def.energy;

    // drums
    if (drums.kick.includes(st)) this.kick(t, st === 0 ? 1 : 0.8, out);
    if (drums.snare.includes(st)) this.clap(t, out);
    if (drums.hat.includes(st)) this.hat(t, 0.1 + (st % 4 === 2 ? 0.1 : 0) + e * 0.08, out);
    if (barIdx === 7 && st >= 12) this.hat(t, 0.2, out); // fill

    // bass
    if (drums.bass.includes(st)) {
      const octave = st % 8 === 6 ? 12 : 0;
      const type: OscillatorType = def.bass === 'square' ? 'square' : def.bass === 'sub' ? 'sine' : 'sawtooth';
      this.tone({ type, freq: mtof(bar.bass + octave), time: t, dur: sd * 1.6, vol: def.bass === 'sub' ? 0.4 : 0.24, attack: 0.005, release: 0.08, lowpass: def.bass === 'sub' ? 900 : 460, dests: [out] });
    }

    // arpeggio
    const arpNote = bar.chord[ARPS[def.arp][st] % 4];
    this.tone({ type: 'square', freq: mtof(arpNote + 12), time: t, dur: sd * 0.7, vol: 0.035 + e * 0.025, attack: 0.002, release: 0.09, lowpass: 2600, dests: [out, send] });

    // pad: one soft chord per bar
    if (st === 0) {
      for (const n of bar.chord.slice(0, 3)) {
        for (const d of [-7, 7]) {
          this.tone({ type: def.pad, freq: mtof(n), time: t, dur: sd * 15, vol: 0.02, attack: 0.5, release: 0.9, detune: d, lowpass: 1000, dests: [out] });
        }
      }
    }

    // lead melody (the first bar stays instrumental on calm tracks)
    if (barIdx > 0 || e > 0.5) {
      for (const n of bar.lead) {
        if (n.step !== st) continue;
        this.tone({ type: def.lead, freq: mtof(n.midi), time: t, dur: sd * n.len, vol: def.lead === 'sine' ? 0.1 : 0.045, attack: 0.02, release: 0.3, lowpass: def.lead === 'sine' ? undefined : 3200, dests: [out, send] });
        this.tone({ type: 'triangle', freq: mtof(n.midi + 12), time: t, dur: sd * n.len, vol: 0.02, attack: 0.02, release: 0.3, dests: [out, send] });
      }
    }

    if (st % 4 === 0) {
      const delayMs = Math.max(0, (t - ctx.currentTime) * 1000);
      const payload = { beat: st / 4, bar: barIdx };
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

  private noiseBurst(t: number, dur: number, vol: number, filter: BiquadFilterType, freq: number, q: number, dest: AudioNode, freqEnd?: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.setValueAtTime(freq, t);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(dest);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  private kick(t: number, vel: number, dest: AudioNode): void {
    this.tone({ type: 'sine', freq: 140, freqEnd: 42, time: t, dur: 0.14, vol: 0.85 * vel, attack: 0.001, release: 0.16, dests: [dest] });
  }
  private hat(t: number, vol: number, dest: AudioNode): void {
    this.noiseBurst(t, 0.05, vol, 'highpass', 7500, 0.7, dest);
  }
  private clap(t: number, dest: AudioNode): void {
    this.noiseBurst(t, 0.12, 0.3, 'bandpass', 1800, 0.8, dest);
    this.noiseBurst(t + 0.012, 0.1, 0.18, 'bandpass', 2200, 0.8, dest);
  }

  // ---------------------------------------------------------------- sfx

  sfx(name: SfxName): void {
    const ctx = this.ctx;
    const dest = this.sfxBus;
    if (!ctx || !dest || ctx.state !== 'running' || this.sfxVol <= 0) return;
    const t = ctx.currentTime;
    const blip = (freq: number, end: number, dur: number, vol: number, type: OscillatorType, at = 0): void =>
      this.tone({ type, freq, freqEnd: end, time: t + at, dur, vol, attack: 0.003, release: 0.04, dests: [dest] });

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
      case 'explode':
        this.noiseBurst(t, 0.55, 0.9, 'lowpass', 3200, 0.7, dest, 120);
        this.noiseBurst(t, 0.18, 0.5, 'bandpass', 2400, 0.9, dest);
        blip(150, 38, 0.4, 0.6, 'sine');
        blip(90, 30, 0.5, 0.35, 'sawtooth');
        break;
      case 'pad':
        blip(420, 980, 0.14, 0.2, 'sine');
        blip(840, 1500, 0.1, 0.1, 'triangle', 0.02);
        break;
      case 'orb':
        blip(880, 880, 0.08, 0.2, 'triangle');
        blip(1320, 1320, 0.12, 0.2, 'triangle', 0.06);
        break;
      case 'portal':
        blip(180, 1300, 0.3, 0.2, 'sawtooth');
        this.noiseBurst(t, 0.3, 0.25, 'bandpass', 600, 1.2, dest, 3500);
        break;
      case 'win':
        [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => blip(f, f, 0.18, 0.18, 'triangle', i * 0.09));
        blip(130, 130, 0.9, 0.3, 'sine');
        break;
      case 'place':
        blip(500, 700, 0.05, 0.16, 'square');
        break;
      case 'erase':
        blip(420, 240, 0.07, 0.16, 'square');
        break;
    }
  }
}

export const audio = new AudioService();
