import Phaser from 'phaser';
import { TEX } from '@/ui/textures';
import type { PlayerCube } from './PlayerCube';

export interface Obstacle {
  /** centre x on screen */
  x: number;
  w: number;
  h: number;
}

export interface HopOptions {
  groundY: number;
  jumpHeight?: number;
  /** timed mode: full jump duration (ms) and pause between jumps (ms) */
  duration?: number;
  pause?: number;
  /**
   * Smart mode: when provided, the cube watches the obstacles scrolling towards it and jumps over each one
   * (jump length and height are computed from the obstacle size and the scroll speed) — so it never lands on a
   * spike. Call `update()` every frame.
   */
  obstacles?: () => Obstacle[];
  /** scroll speed in px/s (smart mode) */
  speed?: () => number;
}

/** Decorative auto-jumping cube (rotates 90° per hop, squashes on landing, puffs dust). */
export class CubeHopper {
  private stopped = false;
  private airborne = false;
  private timer?: Phaser.Time.TimerEvent;
  private readonly dust: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly baseY: number;
  private readonly baseScale: number;

  constructor(private readonly scene: Phaser.Scene, private readonly cube: PlayerCube, private readonly o: HopOptions) {
    this.baseY = o.groundY - (cube.cubeSize / 2) * cube.scaleY;
    this.baseScale = cube.scaleX;
    this.dust = scene.add.particles(0, 0, TEX.pixel, {
      speed: { min: 50, max: 140 },
      angle: { min: 200, max: 340 },
      lifespan: 380,
      scale: { start: 1.3, end: 0 },
      alpha: { start: 0.8, end: 0 },
      emitting: false,
    });
    this.dust.setDepth(cube.depth + 1);
    cube.y = this.baseY;
  }

  start(delay = 0): void {
    this.stopped = false;
    if (!this.o.obstacles) this.timer = this.scene.time.delayedCall(delay, () => this.hopTimed(), [], this);
  }

  stop(): void {
    this.stopped = true;
    this.timer?.remove();
    this.scene.tweens.killTweensOf(this.cube);
  }

  destroy(): void {
    this.stop();
    this.dust.destroy();
  }

  /** Smart mode: decide whether to jump. Call from the scene's update(). */
  update(): void {
    if (this.stopped || this.airborne || !this.o.obstacles || !this.o.speed) return;
    const speed = this.o.speed();
    if (speed <= 0) return;
    const margin = 30;
    const cubeRight = this.cube.x + this.cube.cubeSize / 2;
    for (const ob of this.o.obstacles()) {
      const gap = ob.x - ob.w / 2 - cubeRight;
      if (gap > -6 && gap <= margin) {
        const duration = Math.max(520, ((ob.w + this.cube.cubeSize + margin * 2.2) / speed) * 1000);
        const height = Math.max(this.o.jumpHeight ?? 120, ob.h + 70);
        this.hop(duration, height);
        return;
      }
    }
  }

  // ---------------------------------------------------------------- internals

  private hopTimed(): void {
    if (this.stopped) return;
    this.hop(this.o.duration ?? 640, this.o.jumpHeight ?? 130);
  }

  private hop(duration: number, height: number): void {
    const c = this.cube;
    this.airborne = true;
    this.scene.tweens.add({
      targets: c,
      y: this.baseY - height,
      duration: duration / 2,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.scene.tweens.add({ targets: c, y: this.baseY, duration: duration / 2, ease: 'Sine.easeIn', onComplete: () => this.land() });
      },
    });
    const turns = Math.max(1, Math.round(duration / 480));
    this.scene.tweens.add({ targets: c, angle: c.angle + 90 * turns, duration, ease: 'Linear' });
  }

  private land(): void {
    this.airborne = false;
    if (this.stopped) return;
    const c = this.cube;
    c.angle = Math.round(c.angle / 90) * 90;
    c.y = this.baseY;
    this.dust.explode(7, c.x - c.cubeSize * 0.2, this.o.groundY);
    this.scene.tweens.add({
      targets: c,
      scaleX: this.baseScale * 1.14,
      scaleY: this.baseScale * 0.86,
      duration: 80,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
    if (!this.o.obstacles) this.timer = this.scene.time.delayedCall(this.o.pause ?? 560, () => this.hopTimed(), [], this);
  }
}
