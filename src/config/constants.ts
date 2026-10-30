/**
 * Global constants. Design resolution is 1560x720 (~19.5:9): all important UI lives in the
 * central 1280x720 "safe area" (centered on CX), backgrounds extend to the full width so
 * modern tall phones show no black bars.
 */
export const GAME_WIDTH = 1560;
export const GAME_HEIGHT = 720;
export const CX = GAME_WIDTH / 2;
export const CY = GAME_HEIGHT / 2;
export const GROUND_Y = 600; // top edge of the ground line

export const APP_VERSION = '1.0';
export const SAVE_KEY = 'dashworld.save';
export const SAVE_VERSION = 1;

/** Fills a fresh save with demo progress (stars, finished levels) — for UI previews only. */
export const DEMO_MODE = false;

export const SceneKeys = {
  Boot: 'Boot',
  Preload: 'Preload',
  Menu: 'Menu',
  LevelSelect: 'LevelSelect',
  Skins: 'Skins',
  Settings: 'Settings',
  Maps: 'Maps',
  Editor: 'Editor',
  Game: 'Game',
} as const;
export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];

export const Palette = {
  navy: 0x050b2e,
  deep: 0x0a1a5c,
  panel: 0x0b1a5c,
  blue: 0x1b4dff,
  cyan: 0x19d4ff,
  ice: 0x9af0ff,
  yellow: 0xffd21f,
  orange: 0xff9d00,
  red: 0xff3b4e,
  green: 0x38e07b,
  white: 0xffffff,
  black: 0x000000,
} as const;

export const FONT_MAIN = '"Arial Black", "Segoe UI", Roboto, Arial, sans-serif';

export const hexStr = (n: number): string => '#' + n.toString(16).padStart(6, '0');
