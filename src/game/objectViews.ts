import Phaser from 'phaser';
import { TEX } from '@/ui/textures';
import type { LevelObj, ObjKind } from './levelData';

export type ObjectView = Phaser.GameObjects.Image | Phaser.GameObjects.Container;

export const PORTAL_COLORS: Record<string, number> = {
  portalShip: 0xff4fd8,
  portalCube: 0x38e07b,
  portalGravUp: 0x22c8ff,
  portalGravDown: 0xffd21f,
};

export const PAD_COLOR = 0xffe14d;
export const ORB_COLOR = 0xffe14d;

/**
 * Creates the sprite for one level object. The caller adds it to a container whose origin sits on the ground
 * line at world x = 0 (y grows downwards on screen), so a cell (x, y) is centred at ((x+.5)*tile, -(y+.5)*tile).
 * Used by the game AND the level editor, so both always look identical.
 */
export function createObjectView(scene: Phaser.Scene, o: LevelObj, tile: number, accent: number): ObjectView {
  const cx = (o.x + 0.5) * tile;
  const cy = -(o.y + 0.5) * tile;
  switch (o.k) {
    case 'block': {
      return scene.add.image(cx, cy, TEX.block).setDisplaySize(tile, tile).setTint(accent);
    }
    case 'spike': {
      const img = scene.add.image(cx, cy, TEX.spike).setDisplaySize(tile, tile).setTint(accent);
      img.angle = o.r ?? 0;
      return img;
    }
    case 'saw': {
      const img = scene.add.image(cx, cy, TEX.saw).setDisplaySize(tile * 0.98, tile * 0.98).setTint(lighten(accent));
      img.setData('spin', 300);
      return img;
    }
    case 'pad': {
      const w = tile * 0.9;
      const h = w * (48 / 128);
      const flip = (o.r ?? 0) === 180;
      const y = flip ? -(o.y + 1) * tile + h / 2 : -o.y * tile - h / 2;
      const img = scene.add.image(cx, y, TEX.pad).setDisplaySize(w, h).setTint(PAD_COLOR);
      img.setFlipY(flip);
      return img;
    }
    case 'orb': {
      const img = scene.add.image(cx, cy, TEX.orb).setDisplaySize(tile * 0.95, tile * 0.95).setTint(ORB_COLOR);
      img.setData('pulse', img.scaleX);
      return img;
    }
    default:
      return createPortal(scene, o, tile);
  }
}

function lighten(c: number): number {
  const r = Math.min(255, ((c >> 16) & 255) + 70);
  const g = Math.min(255, ((c >> 8) & 255) + 70);
  const b = Math.min(255, (c & 255) + 70);
  return (r << 16) | (g << 8) | b;
}

function createPortal(scene: Phaser.Scene, o: LevelObj, tile: number): Phaser.GameObjects.Container {
  const color = PORTAL_COLORS[o.k as ObjKind] ?? 0xffffff;
  const centerY = -(o.y + 1.5) * tile;
  const c = scene.add.container((o.x + 0.5) * tile, centerY);
  // faint full-height beam shows that the portal works at any height
  const beam = scene.add.image(0, -centerY - 5 * tile, TEX.pixel).setDisplaySize(6, tile * 10).setTint(color).setAlpha(0.18);
  const ring = scene.add.image(0, 0, TEX.portal).setDisplaySize(tile * 1.05, tile * 3.1).setTint(color);
  c.add([beam, ring]);
  // small symbol so portals can be told apart at a glance
  const sym = scene.add.graphics();
  sym.fillStyle(0xffffff, 0.95);
  const u = tile * 0.16;
  if (o.k === 'portalShip') {
    sym.fillTriangle(-u * 1.4, u, -u * 1.4, -u, u * 1.6, 0);
  } else if (o.k === 'portalCube') {
    sym.fillRect(-u, -u, u * 2, u * 2);
  } else if (o.k === 'portalGravUp') {
    sym.fillTriangle(-u * 1.3, u, u * 1.3, u, 0, -u * 1.4);
  } else {
    sym.fillTriangle(-u * 1.3, -u, u * 1.3, -u, 0, u * 1.4);
  }
  c.add(sym);
  c.setData('pulse', 1);
  return c;
}

/** Per-frame cosmetic animation of an object view (saws spin, orbs/portals pulse). */
export function animateView(v: ObjectView, dt: number, time: number): void {
  const spin = v.getData('spin') as number | undefined;
  if (spin) v.angle += spin * dt;
  const base = v.getData('pulse') as number | undefined;
  if (base) v.setScale(base * (1 + 0.07 * Math.sin(time * 0.008 + v.x * 0.01)));
}

export function dispose(v: ObjectView): void {
  v.destroy();
}
