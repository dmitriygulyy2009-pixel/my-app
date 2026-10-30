/**
 * Music catalogue. Every track is a compact recipe (key, mode, chord progression, drum style, timbres, seed)
 * that the procedural composer in services/audio.ts turns into a full arrangement — so each level has its
 * own song while the APK ships zero audio files. Level files just reference a track id.
 */
export type Mode = 'minor' | 'major' | 'dorian' | 'phrygian' | 'lydian';
export type DrumStyle = 'chill' | 'four' | 'half' | 'dnb' | 'break' | 'march';
export type ArpShape = 'up' | 'zigzag' | 'pingpong' | 'skip';
export type Wave = 'sine' | 'square' | 'sawtooth' | 'triangle';

export interface TrackDef {
  id: string;
  nameKey: string;
  bpm: number;
  /** MIDI note of the tonic (bass octave), e.g. 45 = A2 */
  root: number;
  mode: Mode;
  /** 8 chord roots as scale degrees (0 = tonic) */
  prog: number[];
  drums: DrumStyle;
  arp: ArpShape;
  lead: Wave;
  pad: Wave;
  bass: 'saw' | 'square' | 'sub';
  seed: number;
  /** 0..1, how busy the lead / hats are */
  energy: number;
}

export const SCALES: Record<Mode, number[]> = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
};

export const TRACKS: TrackDef[] = [
  { id: 'menu', nameKey: 'track.menu', bpm: 100, root: 45, mode: 'minor', prog: [0, 5, 2, 6, 0, 5, 3, 6], drums: 'chill', arp: 'zigzag', lead: 'sine', pad: 'sawtooth', bass: 'saw', seed: 11, energy: 0.35 },
  { id: 'neon-start', nameKey: 'track.neon-start', bpm: 100, root: 48, mode: 'major', prog: [0, 4, 5, 3, 0, 4, 5, 4], drums: 'four', arp: 'up', lead: 'square', pad: 'triangle', bass: 'saw', seed: 21, energy: 0.45 },
  { id: 'pixel-rush', nameKey: 'track.pixel-rush', bpm: 110, root: 43, mode: 'dorian', prog: [0, 0, 3, 4, 0, 0, 3, 6], drums: 'four', arp: 'pingpong', lead: 'square', pad: 'sawtooth', bass: 'square', seed: 33, energy: 0.55 },
  { id: 'gear-storm', nameKey: 'track.gear-storm', bpm: 120, root: 40, mode: 'phrygian', prog: [0, 1, 0, 6, 0, 1, 4, 3], drums: 'break', arp: 'skip', lead: 'sawtooth', pad: 'sawtooth', bass: 'saw', seed: 47, energy: 0.6 },
  { id: 'sky-fortress', nameKey: 'track.sky-fortress', bpm: 125, root: 47, mode: 'lydian', prog: [0, 1, 4, 5, 0, 1, 3, 4], drums: 'half', arp: 'up', lead: 'triangle', pad: 'sawtooth', bass: 'sub', seed: 58, energy: 0.6 },
  { id: 'toxic-pulse', nameKey: 'track.toxic-pulse', bpm: 130, root: 41, mode: 'minor', prog: [0, 0, 5, 6, 0, 0, 3, 4], drums: 'dnb', arp: 'zigzag', lead: 'sawtooth', pad: 'square', bass: 'square', seed: 69, energy: 0.7 },
  { id: 'crimson-fang', nameKey: 'track.crimson-fang', bpm: 135, root: 38, mode: 'phrygian', prog: [0, 5, 6, 5, 0, 5, 1, 6], drums: 'march', arp: 'pingpong', lead: 'square', pad: 'sawtooth', bass: 'saw', seed: 72, energy: 0.75 },
  { id: 'sunset-chaos', nameKey: 'track.sunset-chaos', bpm: 140, root: 46, mode: 'dorian', prog: [0, 3, 6, 4, 0, 3, 1, 4], drums: 'dnb', arp: 'skip', lead: 'sawtooth', pad: 'triangle', bass: 'saw', seed: 85, energy: 0.8 },
  { id: 'abyss-gate', nameKey: 'track.abyss-gate', bpm: 150, root: 36, mode: 'minor', prog: [0, 0, 5, 5, 6, 6, 4, 4], drums: 'dnb', arp: 'pingpong', lead: 'sawtooth', pad: 'sawtooth', bass: 'saw', seed: 99, energy: 0.95 },
  // for player-made levels
  { id: 'custom-chill', nameKey: 'track.custom-chill', bpm: 105, root: 45, mode: 'minor', prog: [0, 3, 4, 3, 0, 5, 6, 4], drums: 'half', arp: 'zigzag', lead: 'triangle', pad: 'triangle', bass: 'sub', seed: 111, energy: 0.4 },
  { id: 'custom-drive', nameKey: 'track.custom-drive', bpm: 128, root: 43, mode: 'major', prog: [0, 5, 3, 4, 0, 5, 3, 6], drums: 'four', arp: 'up', lead: 'square', pad: 'sawtooth', bass: 'saw', seed: 122, energy: 0.65 },
  { id: 'custom-rage', nameKey: 'track.custom-rage', bpm: 145, root: 40, mode: 'phrygian', prog: [0, 1, 0, 6, 0, 1, 3, 4], drums: 'dnb', arp: 'skip', lead: 'sawtooth', pad: 'sawtooth', bass: 'saw', seed: 133, energy: 0.9 },
];

export const getTrack = (id: string): TrackDef => TRACKS.find((t) => t.id === id) ?? TRACKS[0];
export const CUSTOM_TRACK_IDS = ['custom-chill', 'custom-drive', 'custom-rage', 'neon-start', 'pixel-rush', 'gear-storm', 'sky-fortress', 'toxic-pulse', 'crimson-fang', 'sunset-chaos', 'abyss-gate'];
