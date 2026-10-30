import Phaser from 'phaser';
import { FACE_COUNT } from '@/data/skins';

/**
 * All art is generated procedurally at startup (Graphics → texture). Benefits: tiny APK, no asset
 * pipeline in stage 1, and every sprite is white/grey so it can be tinted by theme or skin colors.
 */
export type IconName =
  | 'play' | 'gear' | 'cube' | 'back' | 'next' | 'lock' | 'star' | 'orb' | 'note'
  | 'speaker' | 'speaker-off' | 'close' | 'check' | 'info' | 'pause' | 'restart' | 'home'
  | 'pencil' | 'trash' | 'plus' | 'share' | 'eraser' | 'hand' | 'undo' | 'rotate' | 'save' | 'import' | 'bot' | 'maps';

export const TEX = {
  pixel: 'pixel',
  glow: 'glow',
  gear: 'gear',
  spike: 'spike',
  block: 'block',
  ground: 'ground',
  castle: 'castle',
  cubeBody: 'cube-body',
  saw: 'saw',
  pad: 'pad',
  orb: 'orb',
  portal: 'portal',
  ship: 'ship',
  finish: 'finish',
  logo: 'logo',
  face: (i: number): string => `cube-face-${i}`,
  icon: (n: IconName): string => `icon-${n}`,
} as const;

type Pt = { x: number; y: number };

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function withGraphics(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void): void {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

function polar(cx: number, cy: number, r: number, a: number): Pt {
  return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
}

function starPoints(cx: number, cy: number, outer: number, inner: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < 10; i++) pts.push(polar(cx, cy, i % 2 === 0 ? outer : inner, -Math.PI / 2 + (i * Math.PI) / 5));
  return pts;
}

function gearPoints(cx: number, cy: number, outer: number, inner: number, teeth: number): Pt[] {
  const pts: Pt[] = [];
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    pts.push(polar(cx, cy, inner, a - step * 0.3));
    pts.push(polar(cx, cy, outer, a - step * 0.17));
    pts.push(polar(cx, cy, outer, a + step * 0.17));
    pts.push(polar(cx, cy, inner, a + step * 0.3));
  }
  return pts;
}

// ------------------------------------------------------------------ individual generators

function makePixel(scene: Phaser.Scene): void {
  withGraphics(scene, TEX.pixel, 8, 8, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 8, 8);
  });
}

function makeGlow(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEX.glow)) return;
  const tex = scene.textures.createCanvas(TEX.glow, 256, 256);
  if (!tex) return;
  const ctx = tex.getContext();
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  tex.refresh();
}

function makeGear(scene: Phaser.Scene): void {
  withGraphics(scene, TEX.gear, 256, 256, (g) => {
    const pts = gearPoints(128, 128, 120, 94, 10);
    g.fillStyle(0x1c1c1c, 0.6);
    g.fillPoints(pts, true);
    g.lineStyle(8, 0xffffff, 1);
    g.strokePoints(pts, true);
    g.lineStyle(12, 0xffffff, 1);
    g.strokeCircle(128, 128, 40);
  });
}

function makeSpike(scene: Phaser.Scene): void {
  withGraphics(scene, TEX.spike, 128, 128, (g) => {
    const pts = [{ x: 10, y: 122 }, { x: 118, y: 122 }, { x: 64, y: 10 }];
    g.fillStyle(0x050505, 1);
    g.fillPoints(pts, true);
    g.lineStyle(7, 0xffffff, 1);
    g.strokePoints(pts, true);
  });
}

function makeBlock(scene: Phaser.Scene): void {
  withGraphics(scene, TEX.block, 128, 128, (g) => {
    const rnd = seeded(7);
    g.fillStyle(0x050505, 1);
    g.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        if (rnd() < 0.45) {
          g.fillStyle(0xffffff, 0.05 + rnd() * 0.1);
          g.fillRect(x * 16 + 2, y * 16 + 2, 12, 12);
        }
      }
    }
    g.lineStyle(7, 0xffffff, 1);
    g.strokeRect(4, 4, 120, 120);
  });
}

function makeGround(scene: Phaser.Scene): void {
  withGraphics(scene, TEX.ground, 256, 160, (g) => {
    const rnd = seeded(21);
    g.fillStyle(0x151515, 1);
    g.fillRect(0, 0, 256, 160);
    for (let y = 1; y < 10; y++) {
      for (let x = 0; x < 16; x++) {
        if (rnd() < 0.5) {
          g.fillStyle(0xffffff, 0.03 + rnd() * 0.08);
          g.fillRect(x * 16 + 1, y * 16 + 1, 14, 14);
        }
      }
    }
    g.fillStyle(0xffffff, 0.2);
    g.fillRect(0, 8, 256, 12);
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 256, 8);
  });
}

function makeCastle(scene: Phaser.Scene): void {
  const W = 1024;
  const H = 360;
  withGraphics(scene, TEX.castle, W, H, (g) => {
    const rnd = seeded(99);
    g.fillStyle(0xffffff, 1);
    let x = 0;
    while (x < W) {
      const w = Math.min(Math.round(46 + rnd() * 80), W - x);
      const h = Math.round(90 + rnd() * 200);
      g.fillRect(x, H - h, w, h);
      if (rnd() < 0.5) {
        for (let k = 0; k + 8 <= w; k += 16) g.fillRect(x + k, H - h - 12, 8, 12);
      } else {
        g.fillTriangle(x - 4, H - h, x + w + 4, H - h, x + w / 2, H - h - 50 - rnd() * 40);
      }
      x += w + Math.round(rnd() * 14);
    }
  });
}


function makeSaw(scene: Phaser.Scene): void {
  withGraphics(scene, TEX.saw, 128, 128, (g) => {
    const pts: Pt[] = [];
    const n = 12;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push(polar(64, 64, 46, a));
      pts.push(polar(64, 64, 62, a + (Math.PI / n) * 0.55));
      pts.push(polar(64, 64, 46, a + (Math.PI / n) * 1.0));
    }
    g.fillStyle(0x161616, 1);
    g.fillPoints(pts, true);
    g.lineStyle(6, 0xffffff, 1);
    g.strokePoints(pts, true);
    g.lineStyle(6, 0xffffff, 0.9);
    g.strokeCircle(64, 64, 26);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(64, 64, 9);
    for (let i = 0; i < 4; i++) {
      const p = polar(64, 64, 36, (i / 4) * Math.PI * 2 + 0.4);
      g.fillStyle(0xffffff, 0.35);
      g.fillCircle(p.x, p.y, 5);
    }
  });
}

function makePad(scene: Phaser.Scene): void {
  withGraphics(scene, TEX.pad, 128, 48, (g) => {
    g.fillStyle(0x000000, 1);
    g.fillRoundedRect(4, 14, 120, 32, 14);
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(10, 18, 108, 24, 11);
    g.fillStyle(0xffffff, 0.5);
    g.fillRoundedRect(22, 6, 84, 12, 6);
    g.fillStyle(0x000000, 0.25);
    g.fillRect(10, 34, 108, 8);
  });
}

function makeOrb(scene: Phaser.Scene): void {
  withGraphics(scene, TEX.orb, 128, 128, (g) => {
    g.lineStyle(12, 0x000000, 1);
    g.strokeCircle(64, 64, 52);
    g.lineStyle(7, 0xffffff, 1);
    g.strokeCircle(64, 64, 52);
    g.fillStyle(0x000000, 1);
    g.fillCircle(64, 64, 32);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(64, 64, 27);
    g.fillStyle(0xffffff, 0.55);
    g.fillCircle(54, 54, 9);
  });
}

function makePortal(scene: Phaser.Scene): void {
  withGraphics(scene, TEX.portal, 96, 288, (g) => {
    g.fillStyle(0xffffff, 0.22);
    g.fillEllipse(48, 144, 62, 256);
    g.lineStyle(16, 0x000000, 1);
    g.strokeEllipse(48, 144, 66, 262);
    g.lineStyle(9, 0xffffff, 1);
    g.strokeEllipse(48, 144, 66, 262);
    g.lineStyle(4, 0xffffff, 0.6);
    g.strokeEllipse(48, 144, 30, 200);
  });
}

function makeShip(scene: Phaser.Scene): void {
  withGraphics(scene, TEX.ship, 176, 96, (g) => {
    const body: Pt[] = [{ x: 14, y: 66 }, { x: 36, y: 42 }, { x: 118, y: 38 }, { x: 166, y: 60 }, { x: 132, y: 84 }, { x: 28, y: 84 }];
    const fin: Pt[] = [{ x: 14, y: 66 }, { x: 4, y: 36 }, { x: 40, y: 46 }];
    const wing: Pt[] = [{ x: 52, y: 84 }, { x: 36, y: 94 }, { x: 96, y: 94 }, { x: 112, y: 84 }];
    g.fillStyle(0x000000, 1);
    g.fillPoints(body, true); g.fillPoints(fin, true); g.fillPoints(wing, true);
    g.lineStyle(10, 0x000000, 1);
    g.strokePoints(body, true); g.strokePoints(fin, true); g.strokePoints(wing, true);
    g.fillStyle(0xffffff, 1);
    g.fillPoints(fin, true); g.fillPoints(wing, true); g.fillPoints(body, true);
    g.fillStyle(0xc4c4c4, 1);
    g.fillPoints([{ x: 28, y: 76 }, { x: 128, y: 76 }, { x: 132, y: 84 }, { x: 28, y: 84 }], true);
    g.fillStyle(0xffffff, 0.6);
    g.fillRect(52, 44, 56, 4);
  });
}

function makeFinish(scene: Phaser.Scene): void {
  withGraphics(scene, TEX.finish, 60, 720, (g) => {
    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 2; x++) {
        g.fillStyle((x + y) % 2 === 0 ? 0xffffff : 0x111111, 1);
        g.fillRect(x * 30, y * 30, 30, 30);
      }
    }
    g.lineStyle(4, 0x000000, 1);
    g.strokeRect(2, 2, 56, 716);
  });
}

function makeCube(scene: Phaser.Scene): void {
  withGraphics(scene, TEX.cubeBody, 128, 128, (g) => {
    g.fillStyle(0x000000, 1);
    g.fillRoundedRect(0, 0, 128, 128, 18);
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(7, 7, 114, 114, 12);
    g.fillStyle(0xc4c4c4, 1);
    g.fillRoundedRect(7, 88, 114, 33, { tl: 0, tr: 0, bl: 12, br: 12 });
    g.lineStyle(4, 0x8c8c8c, 0.8);
    g.strokeRoundedRect(18, 18, 92, 92, 8);
  });
}

function eye(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
  g.fillStyle(0x000000, 1);
  g.fillRect(x - 4, y - 4, w + 8, h + 8);
  g.fillStyle(0xffffff, 1);
  g.fillRect(x, y, w, h);
}

function bold(g: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number): void {
  g.lineStyle(14, 0x000000, 1);
  g.lineBetween(x1, y1, x2, y2);
  g.lineStyle(7, 0xffffff, 1);
  g.lineBetween(x1, y1, x2, y2);
}

function drawFace(g: Phaser.GameObjects.Graphics, kind: number): void {
  switch (kind) {
    case 0: // classic
      eye(g, 28, 32, 24, 24); eye(g, 76, 32, 24, 24); eye(g, 34, 76, 60, 16);
      break;
    case 1: // smile
      eye(g, 28, 32, 24, 24); eye(g, 76, 32, 24, 24);
      eye(g, 26, 68, 14, 12); eye(g, 38, 78, 52, 12); eye(g, 88, 68, 14, 12);
      break;
    case 2: // angry
      eye(g, 28, 40, 24, 20); eye(g, 76, 40, 24, 20);
      g.lineStyle(9, 0x000000, 1);
      g.lineBetween(20, 24, 56, 40); g.lineBetween(108, 24, 72, 40);
      eye(g, 38, 84, 52, 12);
      break;
    case 3: // cool
      g.fillStyle(0x000000, 1); g.fillRect(14, 30, 100, 34);
      g.fillStyle(0xffffff, 1); g.fillRect(22, 36, 36, 22); g.fillRect(70, 36, 36, 22);
      eye(g, 46, 84, 36, 10);
      break;
    case 4: // cat
      eye(g, 30, 38, 16, 16); eye(g, 82, 38, 16, 16);
      eye(g, 42, 76, 16, 10); eye(g, 70, 76, 16, 10); eye(g, 56, 86, 16, 10);
      break;
    case 5: // cyclops
      eye(g, 36, 26, 56, 46);
      g.fillStyle(0x000000, 1); g.fillRect(56, 40, 18, 18);
      eye(g, 40, 88, 48, 12);
      break;
    case 6: // knockout (x eyes)
      bold(g, 24, 28, 52, 56); bold(g, 52, 28, 24, 56);
      bold(g, 76, 28, 104, 56); bold(g, 104, 28, 76, 56);
      eye(g, 44, 84, 40, 10);
      break;
    case 7: // sleepy
      eye(g, 24, 46, 30, 8); eye(g, 74, 46, 30, 8);
      eye(g, 54, 78, 20, 18);
      break;
    case 8: // robot
      eye(g, 24, 28, 32, 24); eye(g, 72, 28, 32, 24);
      eye(g, 28, 72, 72, 26);
      g.fillStyle(0x000000, 1);
      g.fillRect(45, 74, 4, 22); g.fillRect(62, 74, 4, 22); g.fillRect(79, 74, 4, 22);
      break;
    case 9: // triplet
      eye(g, 20, 42, 20, 20); eye(g, 54, 28, 20, 20); eye(g, 88, 42, 20, 20);
      eye(g, 40, 84, 48, 10);
      break;
    case 10: // skull
      g.fillStyle(0x000000, 1);
      g.fillCircle(42, 48, 17); g.fillCircle(86, 48, 17);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(42, 48, 6); g.fillCircle(86, 48, 6);
      g.fillStyle(0x000000, 1); g.fillTriangle(64, 62, 56, 76, 72, 76);
      eye(g, 34, 88, 60, 14);
      g.fillStyle(0x000000, 1);
      g.fillRect(48, 88, 3, 14); g.fillRect(63, 88, 3, 14); g.fillRect(78, 88, 3, 14);
      break;
    default: { // stellar
      for (const cx of [40, 88]) {
        const pts = starPoints(cx, 46, 24, 10);
        g.fillStyle(0x000000, 1); g.fillPoints(starPoints(cx, 46, 29, 13), true);
        g.fillStyle(0xffffff, 1); g.fillPoints(pts, true);
      }
      eye(g, 52, 82, 24, 16);
    }
  }
}

function makeFaces(scene: Phaser.Scene): void {
  for (let i = 0; i < FACE_COUNT; i++) withGraphics(scene, TEX.face(i), 128, 128, (g) => drawFace(g, i));
}

function drawIcon(g: Phaser.GameObjects.Graphics, name: IconName): void {
  const W = 0xffffff;
  g.fillStyle(W, 1);
  g.lineStyle(9, W, 1);
  const mirror = (pts: Pt[]): Pt[] => pts.map((p) => ({ x: 96 - p.x, y: p.y }));
  const arrow: Pt[] = [
    { x: 66, y: 14 }, { x: 78, y: 26 }, { x: 56, y: 48 }, { x: 78, y: 70 }, { x: 66, y: 82 }, { x: 32, y: 48 },
  ];
  const speaker: Pt[] = [
    { x: 12, y: 38 }, { x: 30, y: 38 }, { x: 52, y: 20 }, { x: 52, y: 76 }, { x: 30, y: 58 }, { x: 12, y: 58 },
  ];

  switch (name) {
    case 'play':
      g.fillTriangle(28, 14, 28, 82, 82, 48);
      break;
    case 'gear': {
      const pts = gearPoints(48, 48, 42, 32, 8);
      g.lineStyle(8, W, 1);
      g.strokePoints(pts, true);
      g.strokeCircle(48, 48, 13);
      break;
    }
    case 'cube':
      g.lineStyle(8, W, 1);
      g.strokeRoundedRect(14, 14, 68, 68, 10);
      g.fillRect(32, 34, 10, 12); g.fillRect(54, 34, 10, 12); g.fillRect(34, 58, 28, 8);
      break;
    case 'back':
      g.fillPoints(arrow, true);
      break;
    case 'next':
      g.fillPoints(mirror(arrow), true);
      break;
    case 'lock':
      g.fillRoundedRect(22, 42, 52, 42, 8);
      g.lineStyle(9, W, 1);
      g.beginPath();
      g.arc(48, 42, 15, Math.PI, 0, false);
      g.strokePath();
      g.lineBetween(33, 42, 33, 46); g.lineBetween(63, 42, 63, 46);
      break;
    case 'star':
      g.fillPoints(starPoints(48, 51, 42, 18), true);
      break;
    case 'orb':
      g.fillCircle(48, 48, 28);
      g.lineStyle(7, W, 1);
      g.strokeCircle(48, 48, 40);
      break;
    case 'note':
      g.fillEllipse(32, 70, 30, 22);
      g.fillRect(41, 18, 8, 52);
      g.fillPoints([{ x: 49, y: 18 }, { x: 78, y: 34 }, { x: 78, y: 52 }, { x: 49, y: 38 }], true);
      break;
    case 'speaker':
    case 'speaker-off':
      g.fillPoints(speaker, true);
      g.lineStyle(7, W, 1);
      if (name === 'speaker') {
        g.beginPath(); g.arc(52, 48, 17, -0.9, 0.9, false); g.strokePath();
        g.beginPath(); g.arc(52, 48, 30, -0.9, 0.9, false); g.strokePath();
      } else {
        g.lineStyle(8, W, 1);
        g.lineBetween(64, 36, 86, 60); g.lineBetween(86, 36, 64, 60);
      }
      break;
    case 'close':
      g.lineStyle(13, W, 1);
      g.lineBetween(22, 22, 74, 74); g.lineBetween(74, 22, 22, 74);
      break;
    case 'check':
      g.lineStyle(14, W, 1);
      g.beginPath(); g.moveTo(20, 50); g.lineTo(40, 70); g.lineTo(76, 26); g.strokePath();
      break;
    case 'info':
      g.lineStyle(7, W, 1);
      g.strokeCircle(48, 48, 38);
      g.fillCircle(48, 28, 6); g.fillRect(43, 40, 10, 32);
      break;
    case 'pause':
      g.fillRoundedRect(24, 18, 17, 60, 4); g.fillRoundedRect(55, 18, 17, 60, 4);
      break;
    case 'restart':
      g.lineStyle(10, W, 1);
      g.beginPath(); g.arc(48, 52, 28, Phaser.Math.DegToRad(-50), Phaser.Math.DegToRad(230), false); g.strokePath();
      g.fillTriangle(58, 8, 58, 42, 84, 26);
      break;
    case 'pencil':
      g.fillPoints([{ x: 62, y: 14 }, { x: 82, y: 34 }, { x: 36, y: 80 }, { x: 14, y: 84 }, { x: 18, y: 62 }], true);
      break;
    case 'trash':
      g.fillRoundedRect(22, 30, 52, 52, 6);
      g.fillRect(16, 20, 64, 8);
      g.fillRect(38, 10, 20, 10);
      break;
    case 'plus':
      g.lineStyle(14, W, 1);
      g.lineBetween(48, 16, 48, 80); g.lineBetween(16, 48, 80, 48);
      break;
    case 'share':
      g.fillCircle(72, 20, 12); g.fillCircle(24, 48, 12); g.fillCircle(72, 76, 12);
      g.lineStyle(7, W, 1);
      g.lineBetween(72, 20, 24, 48); g.lineBetween(24, 48, 72, 76);
      break;
    case 'eraser':
      g.fillPoints([{ x: 14, y: 56 }, { x: 52, y: 18 }, { x: 84, y: 50 }, { x: 52, y: 82 }, { x: 40, y: 82 }], true);
      g.fillRect(36, 84, 52, 6);
      break;
    case 'hand':
      g.fillRoundedRect(26, 40, 46, 42, 12);
      for (let i = 0; i < 4; i++) g.fillRoundedRect(26 + i * 12, 14 + (i % 3 === 1 ? -4 : 2), 10, 40, 5);
      g.fillRoundedRect(10, 46, 16, 10, 5);
      break;
    case 'undo':
      g.lineStyle(10, W, 1);
      g.beginPath(); g.arc(54, 58, 26, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(30), false); g.strokePath();
      g.fillTriangle(10, 40, 40, 20, 40, 60);
      break;
    case 'rotate':
      g.lineStyle(10, W, 1);
      g.beginPath(); g.arc(48, 50, 28, Phaser.Math.DegToRad(-40), Phaser.Math.DegToRad(250), false); g.strokePath();
      g.fillTriangle(60, 4, 60, 38, 88, 20);
      break;
    case 'save':
      g.fillRoundedRect(14, 14, 68, 68, 8);
      g.fillStyle(0x000000, 0.55);
      g.fillRect(28, 14, 40, 22); g.fillRect(26, 52, 44, 30);
      break;
    case 'import':
      g.fillRoundedRect(14, 54, 68, 28, 6);
      g.fillRect(40, 10, 16, 34);
      g.fillTriangle(24, 38, 72, 38, 48, 62);
      break;
    case 'bot':
      g.fillRoundedRect(18, 28, 60, 50, 10);
      g.fillRect(44, 12, 8, 16); g.fillCircle(48, 12, 7);
      g.fillStyle(0x000000, 0.7);
      g.fillCircle(36, 50, 8); g.fillCircle(60, 50, 8); g.fillRect(34, 64, 28, 6);
      break;
    case 'maps':
      g.fillPoints([{ x: 12, y: 24 }, { x: 36, y: 14 }, { x: 60, y: 24 }, { x: 84, y: 14 }, { x: 84, y: 72 }, { x: 60, y: 82 }, { x: 36, y: 72 }, { x: 12, y: 82 }], true);
      g.lineStyle(5, 0x000000, 0.5);
      g.lineBetween(36, 14, 36, 72); g.lineBetween(60, 24, 60, 82);
      break;
    case 'home':
      g.fillPoints([
        { x: 48, y: 12 }, { x: 88, y: 48 }, { x: 76, y: 48 }, { x: 76, y: 84 },
        { x: 20, y: 84 }, { x: 20, y: 48 }, { x: 8, y: 48 },
      ], true);
      break;
  }
}

const ICONS: IconName[] = [
  'play', 'gear', 'cube', 'back', 'next', 'lock', 'star', 'orb', 'note',
  'speaker', 'speaker-off', 'close', 'check', 'info', 'pause', 'restart', 'home',
  'pencil', 'trash', 'plus', 'share', 'eraser', 'hand', 'undo', 'rotate', 'save', 'import', 'bot', 'maps',
];

/** Ordered list of independent generation steps — PreloadScene runs them one per frame for a smooth loader. */
export function textureTasks(scene: Phaser.Scene): Array<() => void> {
  return [
    () => makePixel(scene),
    () => makeGlow(scene),
    () => makeGear(scene),
    () => makeSpike(scene),
    () => makeBlock(scene),
    () => makeGround(scene),
    () => makeCastle(scene),
    () => makeCube(scene),
    () => makeSaw(scene),
    () => makePad(scene),
    () => makeOrb(scene),
    () => makePortal(scene),
    () => makeShip(scene),
    () => makeFinish(scene),
    () => makeFaces(scene),
    ...ICONS.map((n) => () => withGraphics(scene, TEX.icon(n), 96, 96, (g) => drawIcon(g, n))),
  ];
}
