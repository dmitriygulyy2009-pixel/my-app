import Phaser from 'phaser';
import { Palette } from '@/config/constants';
import { audio } from '@/services/audio';
import { haptics } from '@/services/haptics';

/** On/off pill switch with an animated knob. */
export class Toggle extends Phaser.GameObjects.Container {
  private gfx: Phaser.GameObjects.Graphics;
  private knob: Phaser.GameObjects.Graphics;
  private isOn: boolean;
  private readonly W = 112;
  private readonly H = 52;

  constructor(scene: Phaser.Scene, x: number, y: number, value: boolean, private readonly onChange: (v: boolean) => void) {
    super(scene, x, y);
    this.isOn = value;
    this.gfx = scene.add.graphics();
    this.knob = scene.add.graphics();
    this.knob.fillStyle(0x000000, 1);
    this.knob.fillCircle(0, 0, 24);
    this.knob.fillStyle(0xffffff, 1);
    this.knob.fillCircle(0, 0, 20);
    this.knob.fillStyle(0xc4c4c4, 1);
    this.knob.fillCircle(0, 4, 14);
    this.knob.fillStyle(0xffffff, 1);
    this.knob.fillCircle(0, 0, 14);
    this.add([this.gfx, this.knob]);

    this.setSize(this.W + 20, this.H + 20);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerup', () => this.set(!this.isOn, true));

    scene.add.existing(this);
    this.draw();
    this.knob.x = this.knobX();
  }

  get value(): boolean {
    return this.isOn;
  }

  set(v: boolean, notify: boolean): void {
    if (v === this.isOn) return;
    this.isOn = v;
    this.draw();
    this.scene.tweens.add({ targets: this.knob, x: this.knobX(), duration: 140, ease: 'Back.easeOut' });
    if (notify) {
      audio.sfx('toggle');
      haptics.light();
      this.onChange(v);
    }
  }

  private knobX(): number {
    return this.isOn ? this.W / 2 - 28 : -this.W / 2 + 28;
  }

  private draw(): void {
    const { W, H } = this;
    const g = this.gfx;
    g.clear();
    g.fillStyle(0x000000, 1);
    g.fillRoundedRect(-W / 2 - 4, -H / 2 - 4, W + 8, H + 8, (H + 8) / 2);
    g.fillStyle(this.isOn ? Palette.green : 0x2a3260, 1);
    g.fillRoundedRect(-W / 2, -H / 2, W, H, H / 2);
    g.fillStyle(0xffffff, 0.22);
    g.fillRoundedRect(-W / 2 + 6, -H / 2 + 5, W - 12, H * 0.3, 8);
  }
}
