import Phaser from 'phaser';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { CX, GAME_HEIGHT, GROUND_Y, SceneKeys } from '@/config/constants';
import { CubeHopper } from '@/game/CubeHopper';
import { PlayerCube } from '@/game/PlayerCube';
import { audio } from '@/services/audio';
import { t } from '@/services/i18n';
import { profile } from '@/services/profile';
import { Button } from '@/ui/Button';
import { TEX } from '@/ui/textures';
import { addGlow, makeText } from '@/ui/factory';
import { showToast } from '@/ui/Toast';
import { addCurrencies } from '@/ui/TopBar';
import { BaseScene } from './BaseScene';

export class MenuScene extends BaseScene {
  private hopper?: CubeHopper;
  private lastBackPress = 0;
  private soundBtn?: Button;
  private lastMusicVolume = 0.7;

  constructor() {
    super(SceneKeys.Menu);
  }

  protected build(): void {
    this.createBackground({ theme: 'neon', ground: true });
    audio.playTrack('menu');

    this.buildTitle();
    this.buildButtons();
    this.buildCube();
    this.buildHud();
  }

  protected onBack(): void {
    // Android: double-press to exit
    const now = this.time.now;
    if (now - this.lastBackPress < 2000) {
      if (Capacitor.isNativePlatform()) void App.exitApp();
      return;
    }
    this.lastBackPress = now;
    showToast(this, t('toast.exit'));
  }

  protected onCleanup(): void {
    this.hopper?.destroy();
    this.hopper = undefined;
  }

  // ---------------------------------------------------------------- pieces

  private buildTitle(): void {
    const dash = makeText(this, 0, 0, 'Dash', 128, '#ffd21f', { strokeThickness: 18 });
    const world = makeText(this, 0, 0, 'World', 128, '#19d4ff', { strokeThickness: 18 });
    const gap = 6;
    const total = dash.width + world.width + gap;
    dash.setX(CX - total / 2 + dash.width / 2);
    world.setX(CX + total / 2 - world.width / 2);
    dash.setY(130);
    world.setY(130);
    addGlow(dash, 0xffa500, 3);
    addGlow(world, 0x19d4ff, 3);

    for (const [i, txt] of [dash, world].entries()) {
      txt.setScale(0).setAngle(i === 0 ? -8 : 8);
      this.tweens.add({ targets: txt, scale: 1, angle: 0, duration: 650, delay: 150 + i * 120, ease: 'Back.easeOut' });
      this.tweens.add({ targets: txt, y: txt.y - 8, duration: 1500 + i * 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 900 });
    }
  }

  private buildButtons(): void {
    const y = 360;

    const play = new Button(this, CX, y, { width: 230, height: 230, icon: 'play', variant: 'primary', radius: 48, sfx: 'start', onClick: () => this.go(SceneKeys.LevelSelect) });
    play.pulse(0.045, 650);
    const halo = this.add.image(CX, y, TEX.glow).setDisplaySize(520, 520).setTint(0xffc61a).setAlpha(0.45).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: halo, alpha: 0.2, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const skins = new Button(this, CX - 300, y, { width: 150, height: 150, icon: 'cube', variant: 'secondary', radius: 36, onClick: () => this.go(SceneKeys.Skins) });
    const maps = new Button(this, CX + 300, y, { width: 150, height: 150, icon: 'maps', variant: 'success', radius: 36, onClick: () => this.go(SceneKeys.Maps) });

    const labels = [
      makeText(this, CX - 300, y + 108, t('menu.skins'), 28),
      makeText(this, CX, y + 150, t('menu.play'), 40, '#ffd21f'),
      makeText(this, CX + 300, y + 108, t('menu.maps'), 28),
    ];

    [skins, play, maps].forEach((b, i) => {
      b.setScale(0);
      this.tweens.add({ targets: b, scale: 1, duration: 480, delay: 500 + i * 110, ease: 'Back.easeOut' });
    });
    labels.forEach((l, i) => {
      l.setAlpha(0);
      this.tweens.add({ targets: l, alpha: 1, duration: 300, delay: 800 + i * 100 });
    });
  }

  private buildCube(): void {
    const p = profile.player;
    const cube = new PlayerCube(this, CX - 520, GROUND_Y - 48, 96, { skinId: p.skinId, primary: p.primaryColor, secondary: p.secondaryColor, trailId: p.trailId });
    cube.setDepth(10);
    // the cube watches the obstacles scrolling in from the right and jumps over each of them
    this.hopper = new CubeHopper(this, cube, {
      groundY: GROUND_Y,
      jumpHeight: 130,
      obstacles: () => this.bg?.getObstacles() ?? [],
      speed: () => this.bg?.speed ?? 0,
    });
    this.hopper.start();
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    this.hopper?.update();
  }

  private buildHud(): void {
    addCurrencies(this, CX + 640, 52);

    new Button(this, CX - 640 + 130, 52, { width: 76, height: 68, icon: 'gear', variant: 'ghost', onClick: () => this.go(SceneKeys.Settings) });

    this.lastMusicVolume = profile.settings.musicVolume || 0.7;
    this.soundBtn = new Button(this, CX - 640 + 40, 52, {
      width: 76,
      height: 68,
      icon: profile.settings.musicVolume > 0 ? 'speaker' : 'speaker-off',
      variant: 'ghost',
      onClick: () => this.toggleMusic(),
    });

    makeText(this, CX, GAME_HEIGHT - 24, t('menu.credits'), 24, '#ffffff').setAlpha(0.85).setDepth(20);
  }

  private toggleMusic(): void {
    const on = profile.settings.musicVolume > 0;
    if (on) this.lastMusicVolume = profile.settings.musicVolume;
    const next = on ? 0 : this.lastMusicVolume;
    profile.updateSettings({ musicVolume: next });
    audio.setVolumes(next, profile.settings.sfxVolume);
    this.soundBtn?.destroy();
    this.soundBtn = new Button(this, CX - 640 + 40, 52, {
      width: 76,
      height: 68,
      icon: next > 0 ? 'speaker' : 'speaker-off',
      variant: 'ghost',
      onClick: () => this.toggleMusic(),
    });
  }
}
