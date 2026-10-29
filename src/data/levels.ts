import { profile } from '@/services/profile';

export type Difficulty = 'easy' | 'normal' | 'hard' | 'harder' | 'insane' | 'demon';

/**
 * Static level metadata. In stage 2 this is extended with the actual level layout
 * (obstacle data / file path) — keep the shape backward compatible.
 */
export interface LevelDef {
  id: string;
  name: string;
  difficulty: Difficulty;
  stars: number;
  bpm: number;
  themeId: string;
  /** length in seconds, used for progress display */
  length: number;
}

export const LEVELS: LevelDef[] = [
  { id: 'neon-start', name: 'Neon Start', difficulty: 'easy', stars: 2, bpm: 100, themeId: 'neon', length: 60 },
  { id: 'pixel-rush', name: 'Pixel Rush', difficulty: 'normal', stars: 3, bpm: 110, themeId: 'violet', length: 70 },
  { id: 'gear-storm', name: 'Gear Storm', difficulty: 'hard', stars: 4, bpm: 120, themeId: 'gold', length: 80 },
  { id: 'sky-fortress', name: 'Sky Fortress', difficulty: 'hard', stars: 5, bpm: 125, themeId: 'ice', length: 85 },
  { id: 'toxic-pulse', name: 'Toxic Pulse', difficulty: 'harder', stars: 6, bpm: 130, themeId: 'toxic', length: 90 },
  { id: 'crimson-fang', name: 'Crimson Fang', difficulty: 'harder', stars: 7, bpm: 135, themeId: 'crimson', length: 95 },
  { id: 'sunset-chaos', name: 'Sunset Chaos', difficulty: 'insane', stars: 9, bpm: 140, themeId: 'sunset', length: 100 },
  { id: 'abyss-gate', name: 'Abyss Gate', difficulty: 'demon', stars: 10, bpm: 150, themeId: 'abyss', length: 120 },
];

export const DIFFICULTY_COLOR: Record<Difficulty, number> = {
  easy: 0x7dff4a,
  normal: 0x22c8ff,
  hard: 0xffc61a,
  harder: 0xff7a00,
  insane: 0xff3b4e,
  demon: 0xb44bff,
};

export const getLevel = (id: string): LevelDef => LEVELS.find((l) => l.id === id) ?? LEVELS[0];

/** A level is open when it is the first one or the previous level has been completed. */
export function isLevelUnlocked(index: number): boolean {
  if (index <= 0) return true;
  return profile.getProgress(LEVELS[index - 1].id).completed;
}
