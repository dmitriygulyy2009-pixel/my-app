import Phaser from 'phaser';
import { SceneKeys } from '@/config/constants';
import { profile } from '@/services/profile';
import { TEX } from '@/ui/textures';

/** Loads the only external asset (logo) and the save file, then hands over to PreloadScene. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Boot);
  }

  preload(): void {
    this.load.image(TEX.logo, 'logo.png');
  }

  create(): void {
    document.getElementById('boot')?.remove();
    void profile.load().then(() => this.scene.start(SceneKeys.Preload));
  }
}
