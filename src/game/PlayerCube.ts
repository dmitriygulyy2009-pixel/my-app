import Phaser from 'phaser';
import { getSkin, getTrail } from '@/data/skins';
import { TEX } from '@/ui/textures';

export interface CubeLook {
  skinId: string;
  primary: number;
  secondary: number;
  trailId?: string;
}

/**
 * The player's cube: body (tinted with the primary color) + face (tinted with the secondary color)
 * + optional particle trail. Used in the menu, the garage preview, level cards and — in stage 2 —
 * as the visual part of the real player entity.
 */
export class PlayerCube extends Phaser.GameObjects.Container {
  private bodyImg: Phaser.GameObjects.Image;
  private faceImg: Phaser.GameObjects.Image;
  private emitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  readonly cubeSize: number;

  constructor(scene: Phaser.Scene, x: number, y: number, size: number, look: CubeLook) {
    super(scene, x, y);
    this.cubeSize = size;
    this.bodyImg = scene.add.image(0, 0, TEX.cubeBody).setDisplaySize(size, size);
    this.faceImg = scene.add.image(0, 0, TEX.face(0)).setDisplaySize(size, size);
    this.add([this.bodyImg, this.faceImg]);
    this.setSize(size, size);
    scene.add.existing(this);
    this.setLook(look);
  }

  setLook(look: CubeLook): this {
    this.bodyImg.setTint(look.primary);
    this.faceImg.setTexture(TEX.face(getSkin(look.skinId).face)).setTint(look.secondary);
    if (look.trailId !== undefined) this.setTrail(look.trailId);
    return this;
  }

  setTrail(trailId: string): this {
    this.emitter?.destroy();
    this.emitter = undefined;
    const def = getTrail(trailId);
    if (def.tint.length === 0) return this;

    const s = this.cubeSize / 64;
    this.emitter = this.scene.add.particles(0, 0, TEX.pixel, {
      lifespan: { min: 380, max: 700 },
      speedX: { min: -190, max: -90 },
      speedY: { min: -26, max: 26 },
      scale: { start: 1.7 * s, end: 0 },
      alpha: { start: 0.95, end: 0 },
      frequency: 24,
      quantity: 2,
      tint: def.tint,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.emitter.startFollow(this, -this.cubeSize * 0.45, 0);
    this.emitter.setDepth(this.depth - 0.5);
    return this;
  }

  override setDepth(value: number): this {
    super.setDepth(value);
    this.emitter?.setDepth(value - 0.5);
    return this;
  }

  override setVisible(value: boolean): this {
    super.setVisible(value);
    this.emitter?.setVisible(value);
    return this;
  }

  override destroy(fromScene?: boolean): void {
    this.emitter?.destroy();
    this.emitter = undefined;
    super.destroy(fromScene);
  }
}
