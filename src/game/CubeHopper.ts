import Phaser from 'phaser';
import { TEX } from '@/ui/textures';
import type { PlayerCube } from './PlayerCube';

export interface HopOptions {
  groundY: number;
  jumpHeight?: number;
  /** full jump duration, ms */
  duration?: number;
  /** pause between jumps, ms */
  pause?: number;
}

/** Decorative auto-jumping behaviour (rotate 90° per hop, squash on landing, dust puff). */
export class CubeHopper {
  private stopped = false;
  private timer?: Phaser.Time.TimerEvent;
  private dust: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly baseY: number;
  private readonly baseScale: number;

  constructor(private readonly scene: Phaser.Scene, private readonly cube: PlayerCube, private readonly o: HopOptions) {
    this.baseY = o.groundY - cube.cubeSize / 2 * cube.scaleY;
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
    this.timer = this.scene.time.delayedCall(delay, this.hop, [], this);
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

  private hop(): void {
    if (this.stopped) return;
    const dur = this.o.duration ?? 640;
    const height = this.o.jumpHeight ?? 130;
    const c = this.cube;
    this.scene.tweens.add({
      targets: c,
      y: this.baseY - height,
      duration: dur / 2,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.scene.tweens.add({ targets: c, y: this.baseY, duration: dur / 2, ease: 'Sine.easeIn', onComplete: () => this.land() });
      },
    });
    this.scene.tweens.add({ targets: c, angle: c.angle + 90, duration: dur, ease: 'Linear' });
  }

  private land(): void {
    if (this.stopped) return;
    const c = this.cube;
    c.angle = Math.round(c.angle / 90) * 90 % 360;
    this.dust.explode(7, c.x - c.cubeSize * 0.2, this.o.groundY);
    this.scene.tweens.add({
      targets: c,
      scaleX: this.baseScale * 1.14,
      scaleY: this.baseScale * 0.86,
      duration: 80,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
    this.timer = this.scene.time.delayedCall(this.o.pause ?? 560, this.hop, [], this);
  }
}
