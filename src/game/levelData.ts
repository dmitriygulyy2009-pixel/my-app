/**
 * Level file format + (de)serialisation. PURE module: no Phaser / DOM imports, so it also runs in Node
 * (verify.mjs). Coordinates are in tiles: x = column, y = row counted from the ground (0 = on the ground).
 */
export type ObjKind =
  | 'block'
  | 'spike'
  | 'saw'
  | 'pad'
  | 'orb'
  | 'portalShip'
  | 'portalCube'
  | 'portalGravUp'
  | 'portalGravDown';

export const OBJ_KINDS: ObjKind[] = [
  'block', 'spike', 'saw', 'pad', 'orb', 'portalShip', 'portalCube', 'portalGravUp', 'portalGravDown',
];

export interface LevelObj {
  k: ObjKind;
  x: number;
  y: number;
  /** rotation in degrees: 0 | 90 | 180 | 270 (spikes), 0 | 180 (pads) */
  r?: number;
}

export interface LevelData {
  id: string;
  name: string;
  bpm: number;
  themeId: string;
  trackId: string;
  /** x where the finish line stands */
  endX: number;
  objects: LevelObj[];
}

/** Number of visible rows above the ground. */
export const ROWS = 10;

export function computeEndX(objects: LevelObj[]): number {
  let max = 0;
  for (const o of objects) max = Math.max(max, o.x);
  return Math.max(40, max + 16);
}

// ---------------------------------------------------------------- file / share format

export const FILE_MAGIC = 'DASHWORLD-LEVEL';
export const FILE_EXT = 'dwl';

interface FileShape {
  magic: string;
  v: 1;
  name: string;
  bpm: number;
  theme: string;
  track: string;
  /** compact objects: [kindIndex, x, y, rotation] */
  o: Array<[number, number, number, number]>;
}

export function serializeLevel(level: LevelData): string {
  const shape: FileShape = {
    magic: FILE_MAGIC,
    v: 1,
    name: level.name,
    bpm: level.bpm,
    theme: level.themeId,
    track: level.trackId,
    o: level.objects.map((o) => [OBJ_KINDS.indexOf(o.k), o.x, o.y, o.r ?? 0]),
  };
  return JSON.stringify(shape);
}

/** Returns null when the text is not a valid DashWorld level. Never throws. */
export function parseLevel(text: string, newId: string): LevelData | null {
  try {
    const raw = JSON.parse(text.trim()) as Partial<FileShape>;
    if (raw.magic !== FILE_MAGIC || !Array.isArray(raw.o)) return null;
    const objects: LevelObj[] = [];
    for (const row of raw.o) {
      if (!Array.isArray(row) || row.length < 3) continue;
      const kind = OBJ_KINDS[Number(row[0])];
      const x = Math.floor(Number(row[1]));
      const y = Math.floor(Number(row[2]));
      if (!kind || !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 5000 || y < 0 || y >= ROWS) continue;
      const r = Number(row[3] ?? 0);
      const o: LevelObj = { k: kind, x, y };
      if (r) o.r = ((Math.round(r / 90) * 90) % 360 + 360) % 360;
      objects.push(o);
      if (objects.length > 20000) break;
    }
    return {
      id: newId,
      name: String(raw.name ?? 'Level').slice(0, 24) || 'Level',
      bpm: Number(raw.bpm) || 120,
      themeId: String(raw.theme ?? 'neon'),
      trackId: String(raw.track ?? 'menu'),
      endX: computeEndX(objects),
      objects,
    };
  } catch {
    return null;
  }
}
