import Phaser from 'phaser';
import { CX } from '@/config/constants';
import { makeText } from './factory';

/** Small notification pill that slides in from the top and fades out. */
export function showToast(scene: Phaser.Scene, message: string, color = 0xffd21f): void {
  const text = makeText(scene, 0, 0, message, 26);
  const w = text.width + 64;
  const h = 62;
  const bg = scene.add.graphics();
  bg.fillStyle(0x000000, 1);
  bg.fillRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 20);
  bg.fillStyle(0x0b1a5c, 0.97);
  bg.fillRoundedRect(-w / 2, -h / 2, w, h, 17);
  bg.lineStyle(3, color, 1);
  bg.strokeRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, 14);

  const c = scene.add.container(CX, -60, [bg, text]).setDepth(2000);
  scene.tweens.add({
    targets: c,
    y: 56,
    duration: 280,
    ease: 'Back.easeOut',
    hold: 1600,
    yoyo: true,
    onComplete: () => c.destroy(),
  });
}
