export interface SkinDef {
  id: string;
  nameKey: string;
  /** index of the procedurally generated face texture (see ui/textures.ts) */
  face: number;
  requiredStars: number;
}

export const SKINS: SkinDef[] = [
  { id: 'classic', nameKey: 'skin.classic', face: 0, requiredStars: 0 },
  { id: 'smile', nameKey: 'skin.smile', face: 1, requiredStars: 0 },
  { id: 'angry', nameKey: 'skin.angry', face: 2, requiredStars: 3 },
  { id: 'cool', nameKey: 'skin.cool', face: 3, requiredStars: 6 },
  { id: 'cat', nameKey: 'skin.cat', face: 4, requiredStars: 9 },
  { id: 'cyclops', nameKey: 'skin.cyclops', face: 5, requiredStars: 12 },
  { id: 'knockout', nameKey: 'skin.knockout', face: 6, requiredStars: 16 },
  { id: 'sleepy', nameKey: 'skin.sleepy', face: 7, requiredStars: 20 },
  { id: 'robot', nameKey: 'skin.robot', face: 8, requiredStars: 25 },
  { id: 'triplet', nameKey: 'skin.triplet', face: 9, requiredStars: 30 },
  { id: 'skull', nameKey: 'skin.skull', face: 10, requiredStars: 36 },
  { id: 'stellar', nameKey: 'skin.stellar', face: 11, requiredStars: 44 },
];

export const FACE_COUNT = SKINS.length;

export const COLOR_PALETTE: number[] = [
  0xffc61a, 0xff7a00, 0xff3b4e, 0xff4fd8, 0xa855ff, 0x5b6cff,
  0x22c8ff, 0x19e6c4, 0x38e07b, 0xc6ff3d, 0xffffff, 0x3a3f66,
];

export interface TrailDef {
  id: string;
  nameKey: string;
  requiredStars: number;
  tint: number[];
}

export const TRAILS: TrailDef[] = [
  { id: 'none', nameKey: 'trail.none', requiredStars: 0, tint: [] },
  { id: 'fire', nameKey: 'trail.fire', requiredStars: 0, tint: [0xfff3a0, 0xffc61a, 0xff7a00, 0xff3b00] },
  { id: 'ice', nameKey: 'trail.ice', requiredStars: 5, tint: [0xffffff, 0x9af0ff, 0x19d4ff, 0x1b6dff] },
  { id: 'pixel', nameKey: 'trail.pixel', requiredStars: 10, tint: [0xffffff, 0xffffff, 0xcfd8ff] },
  { id: 'toxic', nameKey: 'trail.toxic', requiredStars: 18, tint: [0xe6ff7a, 0x7dff3d, 0x19c46a] },
  { id: 'rainbow', nameKey: 'trail.rainbow', requiredStars: 34, tint: [0xff3b4e, 0xffa500, 0xffe600, 0x38e07b, 0x22c8ff, 0xa855ff] },
];

export const getSkin = (id: string): SkinDef => SKINS.find((s) => s.id === id) ?? SKINS[0];
export const getTrail = (id: string): TrailDef => TRAILS.find((t) => t.id === id) ?? TRAILS[0];
