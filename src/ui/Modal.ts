import Phaser from 'phaser';
import { CX, CY, GAME_HEIGHT, GAME_WIDTH } from '@/config/constants';
import { t } from '@/services/i18n';
import { Button, type ButtonVariant } from './Button';
import { makeText } from './factory';
import { Panel } from './Panel';

/** Anything that can host a modal (BaseScene implements this). */
export interface ModalHost extends Phaser.Scene {
  activeModal?: { close(viaButton?: boolean): void };
}

export interface ModalButton {
  label: string;
  variant?: ButtonVariant;
  onClick?: () => void;
}

export interface ModalOptions {
  title: string;
  width?: number;
  height?: number;
  buttons?: ModalButton[];
  /** called when the dialog is closed by the system back button / Escape (not by one of its buttons) */
  onDismiss?: () => void;
  /** Fill the content area. Coordinates are relative to the panel center; `top` is the first free y. */
  build?: (content: Phaser.GameObjects.Container, area: { w: number; top: number; bottom: number }) => void;
}

/** Centered dialog with dim overlay. Blocks input underneath; closed by the back button too. */
export class Modal extends Phaser.GameObjects.Container {
  private closing = false;
  private readonly panel: Panel;

  constructor(private readonly host: ModalHost, private readonly opts: ModalOptions) {
    super(host, CX, CY);
    const w = opts.width ?? 720;
    const h = opts.height ?? 420;
    this.setDepth(1000);

    const dim = host.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.68).setInteractive();
    this.panel = new Panel(host, 0, 0, w, h);
    this.add([dim, this.panel]);

    const title = makeText(host, 0, -h / 2 + 52, opts.title, 40, '#ffd21f');
    this.add(title);

    const buttons = opts.buttons ?? [{ label: t('common.ok') }];
    const btnH = 68;
    const bottom = h / 2 - 36 - btnH / 2;
    const gap = 20;
    const btnW = Math.min(240, (w - 80 - gap * (buttons.length - 1)) / buttons.length);
    buttons.forEach((b, i) => {
      const bx = (i - (buttons.length - 1) / 2) * (btnW + gap);
      const btn = new Button(host, bx, bottom, {
        width: btnW,
        height: btnH,
        label: b.label,
        variant: b.variant ?? 'secondary',
        fontSize: 28,
        onClick: () => {
          this.close(true);
          b.onClick?.();
        },
      });
      this.add(btn);
    });

    const content = host.add.container(0, 0);
    this.add(content);
    opts.build?.(content, { w: w - 80, top: -h / 2 + 100, bottom: bottom - btnH / 2 - 16 });

    host.add.existing(this);
    host.activeModal = this;

    this.setAlpha(0);
    this.panel.setScale(0.85);
    host.tweens.add({ targets: this, alpha: 1, duration: 160 });
    host.tweens.add({ targets: this.panel, scale: 1, duration: 260, ease: 'Back.easeOut' });
  }

  close(viaButton = false): void {
    if (this.closing) return;
    this.closing = true;
    if (!viaButton) this.opts.onDismiss?.();
    if (this.host.activeModal === this) this.host.activeModal = undefined;
    this.host.tweens.add({ targets: this, alpha: 0, duration: 120, onComplete: () => this.destroy() });
  }

  static confirm(
    host: ModalHost,
    o: { title: string; message: string; yes: string; danger?: boolean; onYes: () => void },
  ): Modal {
    return new Modal(host, {
      title: o.title,
      width: 760,
      height: 400,
      buttons: [
        { label: t('common.cancel'), variant: 'ghost' },
        { label: o.yes, variant: o.danger ? 'danger' : 'success', onClick: o.onYes },
      ],
      build: (content, area) => {
        const msg = makeText(host, 0, (area.top + area.bottom) / 2, o.message, 28, '#ffffff', {
          wordWrap: { width: area.w - 20 },
          align: 'center',
          strokeThickness: 4,
        });
        content.add(msg);
      },
    });
  }
}
