export interface ThemeDef {
  id: string;
  top: number; // sky gradient, top
  bottom: number; // sky gradient, bottom
  accent: number; // neon outline color for gears, blocks, ground
}

export const THEMES: Record<string, ThemeDef> = {
  neon: { id: 'neon', top: 0x0b2fa8, bottom: 0x030824, accent: 0x19d4ff },
  sunset: { id: 'sunset', top: 0x7a1fa2, bottom: 0x1a0638, accent: 0xff7a45 },
  toxic: { id: 'toxic', top: 0x0a5a3a, bottom: 0x02140e, accent: 0x3dff8a },
  violet: { id: 'violet', top: 0x4b1fb8, bottom: 0x0b0530, accent: 0xb46bff },
  ice: { id: 'ice', top: 0x1e6fc2, bottom: 0x06173a, accent: 0xb8f4ff },
  crimson: { id: 'crimson', top: 0x9a1230, bottom: 0x24030f, accent: 0xff4a5a },
  gold: { id: 'gold', top: 0x9a5a00, bottom: 0x230f00, accent: 0xffd21f },
  abyss: { id: 'abyss', top: 0x0a3a66, bottom: 0x01080f, accent: 0x34e1d0 },
};

export const DEFAULT_THEME = 'neon';
