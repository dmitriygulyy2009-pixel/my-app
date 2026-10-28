import Phaser from 'phaser';
import { W, H, PLATFORM } from '../config';

// Пул платформ: уходящие вниз переносятся наверх (без создания/удаления объектов).
export class PlatformSystem {
  group: Phaser.Physics.Arcade.StaticGroup;
  private topY = 0;
  constructor(private scene: Phaser.Scene) {
    this.group = scene.physics.add.staticGroup();
    let y = H - 40;
    for (let i = 0; i < PLATFORM.count; i++) {
      const x = i === 0 ? W / 2 : Phaser.Math.Between(PLATFORM.w / 2, W - PLATFORM.w / 2);
      this.group.create(x, y, 'platform');
      this.topY = y; y -= this.gap(0);
    }
  }
  private gap(score: number) {
    const k = Math.min(score / 20000, 1);
    return Phaser.Math.Between(PLATFORM.minGap, PLATFORM.minGap + (PLATFORM.maxGap - PLATFORM.minGap) * (0.4 + 0.6 * k));
  }
  update(camY: number, score: number) {
    this.group.getChildren().forEach(o => {
      const p = o as Phaser.Physics.Arcade.Sprite;
      if (p.y > camY + H + 40) {
        this.topY -= this.gap(score);
        p.setPosition(Phaser.Math.Between(PLATFORM.w / 2, W - PLATFORM.w / 2), this.topY);
        (p.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
      }
    });
  }
}
