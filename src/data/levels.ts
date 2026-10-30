import { LEVELS, type Difficulty, type LevelDef } from '@/game/levelDefs';
import { profile } from '@/services/profile';

export { LEVELS };
export type { Difficulty, LevelDef };

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
