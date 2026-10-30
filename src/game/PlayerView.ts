import Phaser from 'phaser';
import { TEX } from '@/ui/textures';
import { PlayerCube, type CubeLook } from './PlayerCube';
import type { SimState } from './sim';

/**
 * Visual representation of the player in the game scene: cube or ship (the cube rides in the cockpit),
 * rotation like Geometry Dash (cube spins in the air and snaps to 90° on landing, ship tilts with its speed),
 * landing dust and ship exhaust. Purely cosmetic — all gameplay lives in sim.ts.
 */
export class PlayerView {
  readonly cube: PlayerCube;
  private readonly ship: Phaser.GameObjects.Image;
  private readonly dust: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly exhaust: Phaser.GameObjects.Particles.ParticleEmitter;
  private mode: 0 | 1 = 0;
  private wasGround = true;
  private angle = 0;
  private readonly size: number;

  constructor(private readonly scene: Phaser.Scene, size: number, look: CubeLook, depth: number) {
    this.size = size;
    this.cube = new PlayerCube(scene, 0, 0, size, look).setDepth(depth);
    this.ship = scene.add.image(0, 0, TEX.ship).setDisplaySize(size * 1.5, size * 0.82).setTint(look.primary).setDepth(depth - 0.2).setVisible(false);
    this.dust = scene.add.particles(0, 0, TEX.pixel, {
      speed: { min: 40, max: 160 },
      angle: { min: 180, max: 300 },
      lifespan: 360,
      scale: { start: 1.6, end: 0 },
      alpha: { start: 0.8, end: 0 },
      emitting: false,
    }).setDepth(depth - 0.3);
    this.exhaust = scene.add.particles(0, 0, TEX.pixel, {
      speedX: { min: -320, max: -160 },
      speedY: { min: -40, max: 40 },
      lifespan: { min: 180, max: 320 },
      scale: { start: 2.2, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: [0xfff3a0, 0xff9d00, 0xff4a00],
      blendMode: Phaser.BlendModes.ADD,
      frequency: 28,
      emitting: false,
    }).setDepth(depth - 0.4);
  }

  setMode(mode: 0 | 1): void {
    if (mode === this.mode) return;
    this.mode = mode;
    this.ship.setVisible(mode === 1);
    this.cube.setScale(mode === 1 ? 0.5 : 1);
    this.angle = 0;
    this.cube.angle = 0;
    if (mode === 1) this.exhaust.start();
    else this.exhaust.stop();
  }

  /** Reset to the start-of-level look. */
  reset(): void {
    this.mode = 0;
    this.ship.setVisible(false);
    this.cube.setScale(1).setVisible(true).setAlpha(1);
    this.cube.angle = 0;
    this.angle = 0;
    this.wasGround = true;
    this.exhaust.stop();
    this.ship.setFlipY(false);
  }

  setVisible(v: boolean): void {
    this.cube.setVisible(v);
    this.ship.setVisible(v && this.mode === 1);
    if (!v || this.mode !== 1) this.exhaust.stop();
    else this.exhaust.start();
  }

  setPosition(x: number, y: number): void {
    this.cube.setPosition(x, y);
    this.ship.setPosition(x, y);
  }

  get x(): number {
    return this.cube.x;
  }
  get y(): number {
    return this.cube.y;
  }

  /** `px, py` = screen position of the hitbox centre. */
  update(dt: number, s: SimState, px: number, py: number): void {
    this.setMode(s.mode);
    const lift = this.size * 0.05 * s.up; // visual body is a bit bigger than the hitbox
    if (s.mode === 0) {
      this.cube.setPosition(px, py - lift);
      if (s.onGround) {
        // snap to the nearest 90° quickly
        const target = Math.round(this.angle / 90) * 90;
        this.angle += (target - this.angle) * Math.min(1, dt * 28);
        if (!this.wasGround) this.dust.emitParticleAt(px - this.size * 0.3, py + (this.size * 0.45) * s.up, 6);
      } else {
        this.angle += 420 * dt * s.up;
      }
      this.cube.angle = this.angle;
    } else {
      this.ship.setPosition(px, py);
      this.ship.angle = Phaser.Math.Linear(this.ship.angle, -Phaser.Math.RadToDeg(Math.atan2(s.vy, 10.4)), Math.min(1, dt * 18));
      this.ship.setFlipY(s.up === -1);
      this.cube.setPosition(px + this.size * 0.12, py - this.size * 0.2 * s.up);
      this.cube.angle = this.ship.angle;
      this.exhaust.setPosition(px - this.size * 0.75, py + this.size * 0.12);
    }
    this.wasGround = s.onGround;
  }

  destroy(): void {
    this.cube.destroy();
    this.ship.destroy();
    this.dust.destroy();
    this.exhaust.destroy();
  }
}
