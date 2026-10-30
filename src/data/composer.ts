/**
 * Procedural composer: turns a TrackDef into an 8-bar arrangement (chords, bass notes, lead melody).
 * PURE module (no Web Audio / Phaser) so it can be unit-tested in Node.
 */
import { SCALES, type ArpShape, type DrumStyle, type TrackDef } from './tracks.ts';

export interface LeadNote { step: number; midi: number; len: number }
export interface Bar { chord: number[]; bass: number; lead: LeadNote[] }
export interface Arrangement { bars: Bar[]; def: TrackDef }

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const degreeToMidi = (def: TrackDef, deg: number): number => {
  const sc = SCALES[def.mode];
  const oct = Math.floor(deg / 7);
  return def.root + sc[((deg % 7) + 7) % 7] + 12 * oct;
};

export const ARPS: Record<ArpShape, number[]> = {
  up: [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3],
  zigzag: [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 1, 3, 2],
  pingpong: [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0, 1, 2, 1],
  skip: [0, 2, 1, 3, 0, 2, 1, 3, 0, 2, 3, 1, 0, 3, 2, 1],
};

interface DrumPattern { kick: number[]; snare: number[]; hat: number[]; bass: number[] }
export const DRUMS: Record<DrumStyle, DrumPattern> = {
  chill: { kick: [0, 6, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], bass: [0, 3, 6, 8, 11, 14] },
  four: { kick: [0, 4, 8, 12], snare: [4, 12], hat: [2, 6, 10, 14], bass: [2, 6, 10, 14] },
  half: { kick: [0, 10], snare: [8], hat: [0, 2, 4, 6, 8, 10, 12, 14], bass: [0, 6, 10, 14] },
  dnb: { kick: [0, 10], snare: [4, 12], hat: [0, 2, 3, 4, 6, 8, 10, 11, 12, 14], bass: [0, 3, 6, 8, 10, 11, 14] },
  break: { kick: [0, 3, 10], snare: [4, 12, 15], hat: [0, 2, 4, 6, 8, 10, 12, 14], bass: [0, 3, 6, 10, 12] },
  march: { kick: [0, 4, 8, 12, 14], snare: [4, 12, 14, 15], hat: [2, 6, 10, 14], bass: [0, 4, 8, 12, 14] },
};

export function compose(def: TrackDef): Arrangement {
  const rng = mulberry32(def.seed);
  const melodyA: LeadNote[][] = [];
  const melodyB: LeadNote[][] = [];
  const makeMelody = (target: LeadNote[][], hi: boolean): void => {
    let deg = hi ? 11 : 9;
    for (let b = 0; b < 4; b++) {
      const notes: LeadNote[] = [];
      let step = 0;
      while (step < 16) {
        const strong = step % 4 === 0;
        if (!strong && rng() > 0.35 + def.energy * 0.45) {
          step += 2;
          continue;
        }
        const move = Math.floor(rng() * 5) - 2;
        deg = Math.max(7, Math.min(15, deg + move));
        if (strong && rng() < 0.6) deg = Math.round(deg / 2) * 2; // lean on chord-ish degrees
        const len = [2, 2, 3, 4][Math.floor(rng() * 4)];
        notes.push({ step, midi: degreeToMidi(def, deg) + 12, len: Math.min(len, 16 - step) });
        step += len + (rng() < 0.3 ? 2 : 0);
      }
      target.push(notes);
    }
  };
  makeMelody(melodyA, false);
  makeMelody(melodyB, true);

  const bars: Bar[] = def.prog.map((d, i) => ({
    chord: [degreeToMidi(def, d + 7), degreeToMidi(def, d + 9), degreeToMidi(def, d + 11), degreeToMidi(def, d + 14)],
    bass: degreeToMidi(def, d),
    lead: i < 4 ? melodyA[i] : melodyB[i - 4],
  }));
  return { bars, def };
}

