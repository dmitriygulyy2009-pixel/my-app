/** Built-in level catalogue (metadata + generator settings). PURE module — shared by the game and verify.mjs. */
import { generateLevel, type GenConfig } from './generator.ts';
import type { LevelData } from './levelData.ts';

export type Difficulty = 'easy' | 'normal' | 'hard' | 'harder' | 'insane' | 'demon';

export interface LevelDef {
  id: string;
  name: string;
  difficulty: Difficulty;
  stars: number;
  bpm: number;
  themeId: string;
  trackId: string;
  /** length in seconds */
  length: number;
  gen: Omit<GenConfig, 'id' | 'name' | 'bpm' | 'themeId' | 'trackId' | 'seconds'>;
}

export const LEVELS: LevelDef[] = [
  { id: 'neon-start', name: 'Neon Start', difficulty: 'easy', stars: 2, bpm: 100, themeId: 'neon', trackId: 'neon-start', length: 60, gen: { seed: 101, diff: 1 } },
  { id: 'pixel-rush', name: 'Pixel Rush', difficulty: 'normal', stars: 3, bpm: 110, themeId: 'violet', trackId: 'pixel-rush', length: 70, gen: { seed: 202, diff: 2, pads: true } },
  { id: 'gear-storm', name: 'Gear Storm', difficulty: 'hard', stars: 4, bpm: 120, themeId: 'gold', trackId: 'gear-storm', length: 80, gen: { seed: 303, diff: 3, pads: true, saws: true } },
  { id: 'sky-fortress', name: 'Sky Fortress', difficulty: 'hard', stars: 5, bpm: 125, themeId: 'ice', trackId: 'sky-fortress', length: 85, gen: { seed: 404, diff: 3, pads: true, ship: true } },
  { id: 'toxic-pulse', name: 'Toxic Pulse', difficulty: 'harder', stars: 6, bpm: 130, themeId: 'toxic', trackId: 'toxic-pulse', length: 90, gen: { seed: 505, diff: 4, pads: true, orbs: true, saws: true, ship: true } },
  { id: 'crimson-fang', name: 'Crimson Fang', difficulty: 'harder', stars: 7, bpm: 135, themeId: 'crimson', trackId: 'crimson-fang', length: 95, gen: { seed: 606, diff: 4, pads: true, orbs: true, grav: true } },
  { id: 'sunset-chaos', name: 'Sunset Chaos', difficulty: 'insane', stars: 9, bpm: 140, themeId: 'sunset', trackId: 'sunset-chaos', length: 100, gen: { seed: 707, diff: 5, pads: true, orbs: true, saws: true, ship: true, grav: true } },
  { id: 'abyss-gate', name: 'Abyss Gate', difficulty: 'demon', stars: 10, bpm: 150, themeId: 'abyss', trackId: 'abyss-gate', length: 120, gen: { seed: 808, diff: 6, pads: true, orbs: true, saws: true, ship: true, grav: true } },
];

const cache = new Map<string, LevelData>();

/** Build (and cache) the playable data of a built-in level. */
export function buildBuiltin(def: LevelDef): LevelData {
  let data = cache.get(def.id);
  if (!data) {
    data = generateLevel({ ...def.gen, id: def.id, name: def.name, bpm: def.bpm, themeId: def.themeId, trackId: def.trackId, seconds: def.length });
    cache.set(def.id, data);
  }
  return data;
}
