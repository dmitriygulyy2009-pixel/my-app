export type Language = 'ru' | 'en';
export type Quality = 'low' | 'high';

export interface Settings {
  musicVolume: number; // 0..1
  sfxVolume: number; // 0..1
  vibration: boolean;
  quality: Quality;
  showFps: boolean;
  language: Language;
}

export interface PlayerProfile {
  skinId: string;
  primaryColor: number;
  secondaryColor: number;
  trailId: string;
  stars: number;
  orbs: number;
}

export interface LevelProgress {
  bestPercent: number; // 0..100
  attempts: number;
  completed: boolean;
}

export interface SaveData {
  version: number;
  settings: Settings;
  player: PlayerProfile;
  progress: Record<string, LevelProgress>;
}
