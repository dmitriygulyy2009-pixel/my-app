import Phaser from 'phaser';
import { Palette } from '@/config/constants';

export interface PanelOptions {
  fill?: number;
  fillAlpha?: number;
  border?: number;
  radius?: number;
}

/** Dark translucent card with a neon inner border. Origin is the center. */
export class Panel extends Phaser.GameObjects.Container {
  private gfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number, readonly w: number, readonly h: number, private readonly style: PanelOptions = {}) {
    super(scene, x, y);
    this.gfx = scene.add.graphics();
    this.add(this.gfx);
    this.setSize(w, h);
    this.draw();
    scene.add.existing(this);
  }

  setBorderColor(color: number): this {
    (this.style as PanelOptions).border = color;
    this.draw();
    return this;
  }

  private draw(): void {
    const { w, h } = this;
    const r = this.style.radius ?? 28;
    const g = this.gfx;
    g.clear();
    g.fillStyle(0x000000, 0.4);
    g.fillRoundedRect(-w / 2 + 4, -h / 2 + 10, w, h, r);
    g.fillStyle(0x000000, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    g.fillStyle(this.style.fill ?? Palette.panel, this.style.fillAlpha ?? 0.94);
    g.fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, Math.max(2, r - 3));
    g.lineStyle(3, this.style.border ?? Palette.cyan, 0.85);
    g.strokeRoundedRect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 16, Math.max(2, r - 6));
  }
}
