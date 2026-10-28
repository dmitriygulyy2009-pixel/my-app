import Phaser from 'phaser';
import { W, H } from '../config';
import { Storage } from '../services/Storage';

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }
  create() {
    const t = (y: number, s: string, size: number, c = '#fff') =>
      this.add.text(W / 2, y, s, { fontFamily: 'sans-serif', fontSize: `${size}px`, color: c, fontStyle: 'bold' }).setOrigin(0.5);
    t(H * 0.3, 'NeuroJump', 56, '#4cf2c4');
    t(H * 0.42, `Рекорд: ${Storage.best}`, 28);
    t(H * 0.6, 'Нажми, чтобы начать', 28, '#7a8cff');
    this.input.once('pointerdown', () => this.scene.start('Game'));
  }
}
