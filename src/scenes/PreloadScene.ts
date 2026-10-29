import Phaser from 'phaser';
import { CX, CY, GAME_HEIGHT, GAME_WIDTH, Palette, SceneKeys } from '@/config/constants';
import { audio } from '@/services/audio';
import { t } from '@/services/i18n';
import { profile } from '@/services/profile';
import { makeText } from '@/ui/factory';
import { textureTasks, TEX } from '@/ui/textures';

/**
 * Generates every procedural texture (one task per frame so the bar animates), then waits for a tap.
 * The tap is also the user gesture required to unlock WebAudio and start the music.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Preload);
  }

  create(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, Palette.navy).setOrigin(0);
    const logo = this.add.image(CX, CY - 60, TEX.logo).setDisplaySize(330, 330);
    this.tweens.add({ targets: logo, scale: logo.scale * 1.04, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const barW = 520;
    const barY = CY + 190;
    const track = this.add.graphics();
    track.fillStyle(0x000000, 1);
    track.fillRoundedRect(CX - barW / 2 - 5, barY - 17, barW + 10, 34, 17);
    track.fillStyle(0x0a1445, 1);
    track.fillRoundedRect(CX - barW / 2, barY - 12, barW, 24, 12);
    const fill = this.add.graphics();
    const label = makeText(this, CX, barY + 52, t('preload.loading'), 24, '#9af0ff');

    const tasks = textureTasks(this);
    let done = 0;
    const draw = (): void => {
      fill.clear();
      const w = Math.max(14, (barW * done) / tasks.length);
      fill.fillStyle(Palette.yellow, 1);
      fill.fillRoundedRect(CX - barW / 2, barY - 12, w, 24, 12);
      fill.fillStyle(0xffffff, 0.3);
      fill.fillRoundedRect(CX - barW / 2 + 3, barY - 10, Math.max(0, w - 6), 8, 4);
    };
    draw();

    this.time.addEvent({
      delay: 16,
      repeat: tasks.length - 1,
      callback: () => {
        tasks[done]();
        done++;
        draw();
        if (done === tasks.length) this.time.delayedCall(250, () => this.ready(label));
      },
    });
  }

  private ready(label: Phaser.GameObjects.Text): void {
    label.setText(t('preload.tap')).setColor('#ffffff').setFontSize(34);
    this.tweens.add({ targets: label, alpha: 0.35, duration: 600, yoyo: true, repeat: -1 });
    this.input.once('pointerdown', () => {
      audio.unlock();
      audio.setVolumes(profile.settings.musicVolume, profile.settings.sfxVolume);
      audio.startMusic();
      audio.sfx('start');
      this.cameras.main.fadeOut(220, 5, 11, 46);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(SceneKeys.Menu));
    });
  }
}
