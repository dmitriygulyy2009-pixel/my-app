import { DEMO_MODE, SAVE_KEY, SAVE_VERSION } from '@/config/constants';
import { bus, GameEvents } from '@/core/EventBus';
import type { LevelProgress, PlayerProfile, SaveData, Settings } from '@/types/save';
import { detectLanguage, setLanguage } from './i18n';
import { storage } from './storage';

function createDefaultSave(): SaveData {
  const save: SaveData = {
    version: SAVE_VERSION,
    settings: {
      musicVolume: 0.7,
      sfxVolume: 0.8,
      vibration: true,
      quality: 'high',
      showFps: false,
      language: detectLanguage(),
    },
    player: {
      skinId: 'classic',
      primaryColor: 0xffc61a,
      secondaryColor: 0x22c8ff,
      trailId: 'fire',
      stars: 0,
      orbs: 0,
    },
    progress: {},
  };

  if (DEMO_MODE) {
    save.player.stars = 40;
    save.player.orbs = 1250;
    save.progress = {
      'neon-start': { bestPercent: 100, attempts: 14, completed: true },
      'pixel-rush': { bestPercent: 100, attempts: 32, completed: true },
      'gear-storm': { bestPercent: 100, attempts: 57, completed: true },
      'sky-fortress': { bestPercent: 63, attempts: 21, completed: false },
    };
  }
  return save;
}

/** Forward-compatible merge: unknown/missing fields fall back to defaults. */
function migrate(raw: Partial<SaveData>): SaveData {
  const def = createDefaultSave();
  return {
    version: SAVE_VERSION,
    settings: { ...def.settings, ...(raw.settings ?? {}) },
    player: { ...def.player, ...(raw.player ?? {}) },
    progress: { ...(raw.progress ?? {}) },
  };
}

/**
 * Single source of truth for persistent player data. Mutations go through the update* methods,
 * which emit events (UI reacts) and schedule a debounced save.
 */
class ProfileStore {
  private data: SaveData = createDefaultSave();
  private saveTimer: number | undefined;

  async load(): Promise<void> {
    const raw = await storage.get(SAVE_KEY);
    if (raw) {
      try {
        this.data = migrate(JSON.parse(raw) as Partial<SaveData>);
      } catch {
        this.data = createDefaultSave(); // corrupted save → start fresh
      }
    }
    setLanguage(this.data.settings.language);
  }

  get settings(): Readonly<Settings> {
    return this.data.settings;
  }
  get player(): Readonly<PlayerProfile> {
    return this.data.player;
  }

  getProgress(levelId: string): LevelProgress {
    return this.data.progress[levelId] ?? { bestPercent: 0, attempts: 0, completed: false };
  }

  updateSettings(patch: Partial<Settings>): void {
    this.data.settings = { ...this.data.settings, ...patch };
    if (patch.language) setLanguage(patch.language);
    bus.emit(GameEvents.SettingsChanged, this.data.settings, patch);
    if (patch.language) bus.emit(GameEvents.LanguageChanged, patch.language);
    this.scheduleSave();
  }

  updatePlayer(patch: Partial<PlayerProfile>): void {
    this.data.player = { ...this.data.player, ...patch };
    bus.emit(GameEvents.ProfileChanged, this.data.player);
    this.scheduleSave();
  }

  setLevelProgress(levelId: string, patch: Partial<LevelProgress>): void {
    this.data.progress[levelId] = { ...this.getProgress(levelId), ...patch };
    bus.emit(GameEvents.ProfileChanged, this.data.player);
    this.scheduleSave();
  }

  async reset(): Promise<void> {
    const language = this.data.settings.language;
    this.data = createDefaultSave();
    this.data.settings.language = language;
    setLanguage(language);
    bus.emit(GameEvents.SettingsChanged, this.data.settings, {});
    bus.emit(GameEvents.ProfileChanged, this.data.player);
    await this.flush();
  }

  private scheduleSave(): void {
    window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => void this.flush(), 300);
  }

  async flush(): Promise<void> {
    window.clearTimeout(this.saveTimer);
    await storage.set(SAVE_KEY, JSON.stringify(this.data));
  }
}

export const profile = new ProfileStore();
