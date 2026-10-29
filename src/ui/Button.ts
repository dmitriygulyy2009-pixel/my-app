import Phaser from 'phaser';
import { audio, type SfxName } from '@/services/audio';
import { haptics } from '@/services/haptics';
import { makeText } from './factory';
import { TEX, type IconName } from './textures';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';

const VARIANTS: Record<ButtonVariant, { main: number; dark: number; icon: number }> = {
  primary: { main: 0xffc61a, dark: 0xd9780a, icon: 0x5a2a00 },
  secondary: { main: 0x22c8ff, dark: 0x0a6fd6, icon: 0xffffff },
  danger: { main: 0xff4a5a, dark: 0xb3122a, icon: 0xffffff },
  success: { main: 0x38e07b, dark: 0x0e8a45, icon: 0xffffff },
  ghost: { main: 0x1f3190, dark: 0x0e1a52, icon: 0xffffff },
};

export interface ButtonOptions {
  width: number;
  height: number;
  label?: string;
  icon?: IconName;
  variant?: ButtonVariant;
  fontSize?: number;
  radius?: number;
  /** sound effect, `null` for silent */
  sfx?: SfxName | null;
  onClick: () => void;
}

/**
 * Chunky GD-style button: black outline, bevelled body, shine, press animation, sfx + haptics.
 * Root container handles input + press scale; `view` holds the visuals so other effects
 * (pulse, shake) can animate it without fighting the press tween.
 */
export class Button extends Phaser.GameObjects.Container {
  readonly view: Phaser.GameObjects.Container;
  private gfx: Phaser.GameObjects.Graphics;
  private labelText?: Phaser.GameObjects.Text;
  private iconImg?: Phaser.GameObjects.Image;
  private iconShadow?: Phaser.GameObjects.Image;
  private variant: ButtonVariant;
  private isPressed = false;
  private isEnabled = true;

  constructor(scene: Phaser.Scene, x: number, y: number, private readonly opts: ButtonOptions) {
    super(scene, x, y);
    this.variant = opts.variant ?? 'secondary';

    this.view = scene.add.container(0, 0);
    this.gfx = scene.add.graphics();
    this.view.add(this.gfx);
    this.add(this.view);

    const { width: w, height: h } = opts;
    const hasBoth = !!opts.icon && !!opts.label;
    const iconSize = hasBoth ? h * 0.55 : Math.min(w, h) * 0.58;

    if (opts.icon) {
      const ix = hasBoth ? -w / 2 + h * 0.55 : 0;
      this.iconShadow = scene.add.image(ix, 4, TEX.icon(opts.icon)).setDisplaySize(iconSize, iconSize).setTint(0x000000).setAlpha(0.45);
      this.iconImg = scene.add.image(ix, 0, TEX.icon(opts.icon)).setDisplaySize(iconSize, iconSize);
      this.view.add([this.iconShadow, this.iconImg]);
    }
    if (opts.label) {
      const size = opts.fontSize ?? Math.round(Math.min(h * 0.4, 40));
      this.labelText = makeText(scene, hasBoth ? h * 0.22 : 0, -2, opts.label, size);
      this.view.add(this.labelText);
    }

    this.setSize(w, h);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerdown', this.onDown, this);
    this.on('pointerup', this.onUp, this);
    this.on('pointerout', this.onOut, this);
    this.on('pointerupoutside', this.onOut, this);

    scene.add.existing(this);
    this.redraw();
  }

  setVariant(variant: ButtonVariant): this {
    if (variant === this.variant) return this;
    this.variant = variant;
    this.redraw();
    return this;
  }

  setLabel(text: string): this {
    this.labelText?.setText(text);
    return this;
  }

  setEnabled(enabled: boolean): this {
    this.isEnabled = enabled;
    this.setAlpha(enabled ? 1 : 0.5);
    return this;
  }

  /** Gentle "breathing" scale on the visual layer — used for the main Play button. */
  pulse(amount = 0.05, duration = 700): this {
    this.scene.tweens.add({ targets: this.view, scale: 1 + amount, duration, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return this;
  }

  shake(): void {
    this.scene.tweens.add({ targets: this.view, x: { from: -8, to: 8 }, duration: 55, yoyo: true, repeat: 3, onComplete: () => { this.view.x = 0; } });
  }

  private redraw(): void {
    const { width: w, height: h } = this.opts;
    const r = this.opts.radius ?? Math.min(26, h * 0.28);
    const v = VARIANTS[this.variant];
    const inner = Math.max(2, r - 3);
    const shineR = Math.max(2, r - 7);
    const g = this.gfx;
    g.clear();
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(-w / 2 + 2, -h / 2 + 8, w, h, r);
    g.fillStyle(0x000000, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    g.fillStyle(v.dark, 1);
    g.fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, inner);
    g.fillStyle(v.main, 1);
    g.fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8 - Math.min(10, h * 0.1), inner);
    g.fillStyle(0xffffff, 0.26);
    g.fillRoundedRect(-w / 2 + 10, -h / 2 + 9, w - 20, (h - 8) * 0.3, { tl: shineR, tr: shineR, bl: 6, br: 6 });
    this.iconImg?.setTint(v.icon);
  }

  private onDown(): void {
    if (!this.isEnabled) return;
    this.isPressed = true;
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({ targets: this, scale: 0.92, duration: 70, ease: 'Quad.easeOut' });
  }

  private onUp(): void {
    if (!this.isPressed) return;
    this.isPressed = false;
    this.release();
    if (this.opts.sfx !== null) {
      audio.sfx(this.opts.sfx ?? 'click');
      haptics.light();
    }
    this.opts.onClick();
  }

  private onOut(): void {
    if (!this.isPressed) return;
    this.isPressed = false;
    this.release();
  }

  private release(): void {
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({ targets: this, scale: 1, duration: 140, ease: 'Back.easeOut' });
  }
}
