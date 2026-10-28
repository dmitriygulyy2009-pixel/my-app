import Phaser from 'phaser';
import { W } from '../config';

// Управление: касание левой/правой половины, клавиши, наклон телефона. Возвращает -1..1.
export class InputSystem {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
  private tilt = 0;
  private onTilt = (e: DeviceOrientationEvent) => {
    const g = e.gamma ?? 0; this.tilt = Math.max(-1, Math.min(1, g / 20));
  };
  constructor(private scene: Phaser.Scene) {
    this.cursors = scene.input.keyboard?.createCursorKeys();
    window.addEventListener('deviceorientation', this.onTilt);
    scene.events.once('shutdown', () => window.removeEventListener('deviceorientation', this.onTilt));
  }
  get dir(): number {
    const p = this.scene.input.activePointer;
    if (p.isDown) return p.x < W / 2 ? -1 : 1;
    if (this.cursors?.left.isDown) return -1;
    if (this.cursors?.right.isDown) return 1;
    return Math.abs(this.tilt) > 0.08 ? this.tilt : 0;
  }
}
