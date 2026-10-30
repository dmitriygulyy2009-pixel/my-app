import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { computeEndX, FILE_EXT, parseLevel, serializeLevel, type LevelData } from '@/game/levelData';
import { getTrack } from '@/data/tracks';
import { storage } from './storage';

const KEY = 'dashworld.custom';

interface Stored {
  id: string;
  file: string;
}

const newId = (): string => `c${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;

/** Player-made levels: persistence, import / export (share as a .dwl file or as a text code). */
class CustomLevelStore {
  private list: LevelData[] = [];

  async load(): Promise<void> {
    try {
      const raw = await storage.get(KEY);
      if (!raw) return;
      const rows = JSON.parse(raw) as Stored[];
      this.list = rows
        .map((r) => parseLevel(r.file, r.id))
        .filter((l): l is LevelData => l !== null);
    } catch {
      this.list = [];
    }
  }

  all(): LevelData[] {
    return this.list;
  }

  get(id: string): LevelData | undefined {
    return this.list.find((l) => l.id === id);
  }

  create(): LevelData {
    const level: LevelData = {
      id: newId(),
      name: `Map ${this.list.length + 1}`,
      bpm: getTrack('custom-drive').bpm,
      themeId: 'neon',
      trackId: 'custom-drive',
      endX: 40,
      objects: [],
    };
    this.list.push(level);
    void this.persist();
    return level;
  }

  /** Insert or replace, then write to disk. */
  save(level: LevelData): void {
    level.endX = computeEndX(level.objects);
    level.bpm = getTrack(level.trackId).bpm;
    const i = this.list.findIndex((l) => l.id === level.id);
    if (i >= 0) this.list[i] = level;
    else this.list.push(level);
    void this.persist();
  }

  remove(id: string): void {
    this.list = this.list.filter((l) => l.id !== id);
    void this.persist();
  }

  /** Imports level text (file contents or pasted code). Returns the new level or null when invalid. */
  importText(text: string): LevelData | null {
    const level = parseLevel(text, newId());
    if (!level) return null;
    this.list.push(level);
    void this.persist();
    return level;
  }

  private async persist(): Promise<void> {
    const rows: Stored[] = this.list.map((l) => ({ id: l.id, file: serializeLevel(l) }));
    await storage.set(KEY, JSON.stringify(rows));
  }
}

export const customLevels = new CustomLevelStore();

// ---------------------------------------------------------------- files

const safeName = (name: string): string => name.replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 30) || 'level';

export type ShareResult = 'shared' | 'downloaded' | 'failed';

/** Writes the level to a .dwl file and opens the system share sheet (Android) or downloads it (browser). */
export async function shareLevelFile(level: LevelData): Promise<ShareResult> {
  const fileName = `${safeName(level.name)}.${FILE_EXT}`;
  const data = serializeLevel(level);
  try {
    if (Capacitor.isNativePlatform()) {
      await Filesystem.writeFile({ path: fileName, data, directory: Directory.Cache, encoding: Encoding.UTF8 });
      const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
      await Share.share({ title: level.name, text: `DashWorld — ${level.name}`, url: uri, dialogTitle: level.name });
      return 'shared';
    }
    const blob = new Blob([data], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    return 'downloaded';
  } catch {
    return 'failed';
  }
}

/** Opens the system file picker and resolves with the file text (null when cancelled). */
export function pickLevelFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '*/*';
    input.style.display = 'none';
    let settled = false;
    const done = (v: string | null): void => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(v);
    };
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return done(null);
      const reader = new FileReader();
      reader.onload = () => done(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => done(null);
      reader.readAsText(file);
    });
    input.addEventListener('cancel', () => done(null));
    document.body.appendChild(input);
    input.click();
  });
}
