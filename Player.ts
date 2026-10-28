import Phaser from 'phaser';
import { PHYS, W } from '../config';

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');
    scene.add.existing(this); scene.physics.add.existing(this);
    this.setGravityY(PHYS.gravity).setDepth(10);
    (this.body as Phaser.Physics.Arcade.Body).setSize(30, 40).setOffset(5, 0);
  }
  jump() { this.setVelocityY(PHYS.jumpV); }
  move(dir: number) { this.setVelocityX(dir * PHYS.moveSpeed); }
  wrap() { if (this.x < -20) this.x = W + 20; else if (this.x > W + 20) this.x = -20; }
}
