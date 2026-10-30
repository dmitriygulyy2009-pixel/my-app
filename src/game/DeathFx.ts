import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '@/config/constants';
import { TEX } from '@/ui/textures';

/**
 * Death animation: the cube bursts into square shards that fly outwards and fall, plus a glowing shockwave ring,
 * sparks, a quick white flash and a camera shake — like Geometry Dash.
 */
export function playExplosion(scene: Phaser.Scene, x: number, y: number, primary: number, secondary: number): void {
  const depth = 400;

  // chunky shards (the cube's "pieces")
  const shards = scene.add.particles(x, y, TEX.pixel, {
    speed: { min: 260, max: 820 },
    angle: { min: 0, max: 360 },
    gravityY: 1500,
    lifespan: { min: 650, max: 1050 },
    scale: { start: 3.4, end: 0.5 },
    rotate: { start: 0, end: 540 },
    alpha: { start: 1, end: 0 },
    tint: [primary, primary, secondary, 0xffffff],
    emitting: false,
  }).setDepth(depth);
  shards.explode(20);

  // fine glowing sparks
  const sparks = scene.add.particles(x, y, TEX.pixel, {
    speed: { min: 120, max: 520 },
    angle: { min: 0, max: 360 },
    lifespan: { min: 300, max: 650 },
    scale: { start: 1.6, end: 0 },
    alpha: { start: 1, end: 0 },
    tint: [0xffffff, primary, secondary],
    blendMode: Phaser.BlendModes.ADD,
    emitting: false,
  }).setDepth(depth + 1);
  sparks.explode(36);

  // shockwave ring
  const ring = scene.add.graphics({ x, y }).setDepth(depth + 2);
  ring.lineStyle(10, primary, 1);
  ring.strokeCircle(0, 0, 40);
  ring.lineStyle(4, 0xffffff, 1);
  ring.strokeCircle(0, 0, 40);
  scene.tweens.add({ targets: ring, scale: 4.2, alpha: 0, duration: 420, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });

  // flash
  const flash = scene.add.image(0, 0, TEX.pixel).setOrigin(0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setTint(0xffffff).setAlpha(0.55).setDepth(depth + 3);
  scene.tweens.add({ targets: flash, alpha: 0, duration: 260, onComplete: () => flash.destroy() });

  scene.cameras.main.shake(280, 0.014);
  scene.time.delayedCall(1300, () => {
    shards.destroy();
    sparks.destroy();
  });
}

/** Confetti burst for the level-complete screen. */
export function playConfetti(scene: Phaser.Scene, colors: number[]): void {
  const left = scene.add.particles(0, GAME_HEIGHT, TEX.pixel, {
    speed: { min: 500, max: 1100 },
    angle: { min: -80, max: -35 },
    gravityY: 900,
    lifespan: 2600,
    scale: { start: 2.6, end: 1.4 },
    rotate: { start: 0, end: 720 },
    tint: colors,
    emitting: false,
  }).setDepth(1400);
  const right = scene.add.particles(GAME_WIDTH, GAME_HEIGHT, TEX.pixel, {
    speed: { min: 500, max: 1100 },
    angle: { min: -145, max: -100 },
    gravityY: 900,
    lifespan: 2600,
    scale: { start: 2.6, end: 1.4 },
    rotate: { start: 0, end: -720 },
    tint: colors,
    emitting: false,
  }).setDepth(1400);
  left.explode(60);
  right.explode(60);
  scene.time.delayedCall(2800, () => {
    left.destroy();
    right.destroy();
  });
}
