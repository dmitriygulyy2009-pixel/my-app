import Phaser from 'phaser';
import { COLORS, PLATFORM } from '../config';

// Текстуры генерируются кодом — ассеты не нужны. Заменить на this.load.image(...) позже.
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    const g = this.add.graphics();
    g.fillStyle(COLORS.player).fillRoundedRect(0, 0, 40, 40, 12);
    g.fillStyle(0x0b1020).fillCircle(13, 15, 4).fillCircle(27, 15, 4);
    g.generateTexture('player', 40, 40); g.clear();
    g.fillStyle(COLORS.platform).fillRoundedRect(0, 0, PLATFORM.w, PLATFORM.h, 8);
    g.generateTexture('platform', PLATFORM.w, PLATFORM.h); g.destroy();
    this.scene.start('Menu');
  }
}
