import Phaser from 'phaser';
import { FONT_MAIN, hexStr } from '@/config/constants';
import { profile } from '@/services/profile';

/** Game-style outlined text (white fill, thick black stroke, hard drop shadow). */
export function makeText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  str: string,
  size = 32,
  color: string | number = '#ffffff',
  style: Phaser.Types.GameObjects.Text.TextStyle = {},
): Phaser.GameObjects.Text {
  const t = scene.add.text(x, y, str, {
    fontFamily: FONT_MAIN,
    fontSize: `${size}px`,
    fontStyle: 'bold',
    color: typeof color === 'number' ? hexStr(color) : color,
    stroke: '#000000',
    strokeThickness: Math.max(3, Math.round(size / 6)),
    ...style,
  });
  t.setOrigin(0.5);
  t.setShadow(0, Math.max(2, Math.round(size / 12)), '#000000', 0, true, true);
  return t;
}

/** WebGL neon glow (no-op on Canvas renderer or when quality is "low"). */
export function addGlow(obj: Phaser.GameObjects.GameObject, color: number, strength = 4): void {
  if (profile.settings.quality === 'low') return;
  const fx = (obj as unknown as { preFX?: Phaser.GameObjects.FX.Controller | null }).preFX;
  if (!fx) return;
  fx.addGlow(color, strength, 0, false, 0.1, 14);
}

export const isHighQuality = (): boolean => profile.settings.quality === 'high';

export function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

export const darken = (c: number, amount: number): number => lerpColor(c, 0x000000, amount);
export const lighten = (c: number, amount: number): number => lerpColor(c, 0xffffff, amount);
