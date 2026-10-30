import Phaser from 'phaser';
import { CX } from '@/config/constants';
import { bus, GameEvents } from '@/core/EventBus';
import { profile } from '@/services/profile';
import { Button } from './Button';
import { makeText } from './factory';
import { TEX, type IconName } from './textures';

/** Pill with an icon and a live value (stars / orbs). Updates itself when the profile changes. */
export class CurrencyChip extends Phaser.GameObjects.Container {
  private valueText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, private readonly icon: IconName, private readonly read: () => number, tint: number) {
    super(scene, x, y);
    const w = 190;
    const h = 56;
    const bg = scene.add.graphics();
    bg.fillStyle(0x000000, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    bg.fillStyle(0x0b1a5c, 0.95);
    bg.fillRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, (h - 6) / 2);
    const img = scene.add.image(-w / 2 + 34, 0, TEX.icon(icon)).setDisplaySize(40, 40).setTint(tint);
    this.valueText = makeText(scene, 18, -1, String(read()), 28);
    this.add([bg, img, this.valueText]);
    scene.add.existing(this);

    bus.on(GameEvents.ProfileChanged, this.refresh, this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => bus.off(GameEvents.ProfileChanged, this.refresh, this));
  }

  private refresh(): void {
    this.valueText.setText(String(this.read()));
  }
}

export function addCurrencies(scene: Phaser.Scene, rightX: number, y = 52): void {
  new CurrencyChip(scene, rightX - 105, y, 'star', () => profile.player.stars, 0xffd21f);
  new CurrencyChip(scene, rightX - 315, y, 'orb', () => profile.player.orbs, 0x4de1ff);
}

/** Standard header: back button on the left, title in the middle, currencies on the right. */
export function addTopBar(scene: Phaser.Scene, title: string, onBack: () => void, currencies = true): void {
  const left = CX - 640;
  const right = CX + 640;
  new Button(scene, left + 56, 56, { width: 84, height: 72, icon: 'back', variant: 'secondary', sfx: 'back', onClick: onBack }).setDepth(50);
  makeText(scene, CX, 54, title, 52, '#ffd21f').setDepth(50);
  if (currencies) addCurrencies(scene, right);
}
