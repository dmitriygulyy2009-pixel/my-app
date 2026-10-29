import Phaser from 'phaser';
import { Palette } from '@/config/constants';

/** Horizontal slider, value 0..1. `onChange` fires while dragging, `onRelease` once on release. */
export class Slider extends Phaser.GameObjects.Container {
  private gfx: Phaser.GameObjects.Graphics;
  private current: number;
  private dragging = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly trackWidth: number,
    value: number,
    private readonly onChange: (v: number) => void,
    private readonly onRelease?: (v: number) => void,
  ) {
    super(scene, x, y);
    this.current = Phaser.Math.Clamp(value, 0, 1);
    this.gfx = scene.add.graphics();
    this.add(this.gfx);

    this.setSize(trackWidth + 60, 64);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerdown', (p: Phaser.Input.Pointer) => { this.dragging = true; this.setFromPointer(p); });
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      scene.input.off('pointermove', this.onMove, this);
      scene.input.off('pointerup', this.onUp, this);
    });

    scene.add.existing(this);
    this.draw();
  }

  get value(): number {
    return this.current;
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (this.dragging) this.setFromPointer(p);
  }

  private onUp(): void {
    if (!this.dragging) return;
    this.dragging = false;
    this.onRelease?.(this.current);
  }

  private setFromPointer(p: Phaser.Input.Pointer): void {
    const left = this.getWorldTransformMatrix().tx - this.trackWidth / 2;
    const v = Phaser.Math.Clamp((p.x - left) / this.trackWidth, 0, 1);
    if (Math.abs(v - this.current) < 0.001) return;
    this.current = v;
    this.draw();
    this.onChange(v);
  }

  private draw(): void {
    const w = this.trackWidth;
    const g = this.gfx;
    const fillW = Math.max(0, w * this.current);
    g.clear();
    g.fillStyle(0x000000, 1);
    g.fillRoundedRect(-w / 2 - 5, -15, w + 10, 30, 15);
    g.fillStyle(0x0a1445, 1);
    g.fillRoundedRect(-w / 2, -10, w, 20, 10);
    if (fillW > 2) {
      g.fillStyle(Palette.cyan, 1);
      g.fillRoundedRect(-w / 2, -10, fillW, 20, 10);
      g.fillStyle(0xffffff, 0.3);
      g.fillRoundedRect(-w / 2 + 3, -8, Math.max(0, fillW - 6), 7, 4);
    }
    const kx = -w / 2 + fillW;
    g.fillStyle(0x000000, 1);
    g.fillCircle(kx, 0, 22);
    g.fillStyle(Palette.yellow, 1);
    g.fillCircle(kx, 0, 18);
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(kx - 5, -6, 6);
  }
}
