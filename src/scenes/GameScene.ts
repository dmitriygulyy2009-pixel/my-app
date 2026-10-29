import { CX, GROUND_Y, SceneKeys } from '@/config/constants';
import { getLevel, type LevelDef } from '@/data/levels';
import { CubeHopper } from '@/game/CubeHopper';
import { PlayerCube } from '@/game/PlayerCube';
import { t } from '@/services/i18n';
import { profile } from '@/services/profile';
import { Button } from '@/ui/Button';
import { makeText } from '@/ui/factory';
import { Modal } from '@/ui/Modal';
import { BaseScene } from './BaseScene';

/**
 * STAGE 1 PLACEHOLDER. Shows the in-game HUD (progress bar, attempt counter, pause button + pause menu)
 * over a decorative scrolling world, so the UI contract is ready. In stage 2 this scene gets the real
 * level runner: input, physics, obstacles, death/respawn, win screen. Keep `init data` ({ levelId }) as is.
 */
export class GameScene extends BaseScene {
  private level!: LevelDef;
  private hopper?: CubeHopper;
  private bar!: Phaser.GameObjects.Graphics;
  private pct!: Phaser.GameObjects.Text;
  private progress = 0;
  private paused = false;
  private attempt = 1;

  constructor() {
    super(SceneKeys.Game);
  }

  protected build(data?: { levelId?: string }): void {
    this.level = getLevel(data?.levelId ?? '');
    this.progress = 0;
    this.paused = false;
    this.attempt = profile.getProgress(this.level.id).attempts + 1;

    this.createBackground({ theme: this.level.themeId, ground: true, groundSpeed: 360 });

    const p = profile.player;
    const cube = new PlayerCube(this, CX - 360, GROUND_Y - 48, 96, { skinId: p.skinId, primary: p.primaryColor, secondary: p.secondaryColor, trailId: p.trailId });
    cube.setDepth(10);
    this.hopper = new CubeHopper(this, cube, { groundY: GROUND_Y, jumpHeight: 170, duration: 620, pause: 380 });
    this.hopper.start(300);

    this.buildHud();
    makeText(this, CX, 330, t('game.stub'), 40, '#ffd21f').setAlpha(0.95);
    makeText(this, CX, 390, this.level.name, 30, '#9af0ff');
  }

  protected onBack(): void {
    this.openPause();
  }

  protected onCleanup(): void {
    this.hopper?.destroy();
    this.hopper = undefined;
  }

  update(time: number, delta: number): void {
    if (this.paused) return;
    super.update(time, delta);
    this.progress = Math.min(100, this.progress + (delta / 1000 / this.level.length) * 100 * 6); // demo speed ×6
    if (this.progress >= 100) this.progress = 0;
    this.drawBar();
  }

  // ---------------------------------------------------------------- HUD

  private buildHud(): void {
    this.bar = this.add.graphics().setDepth(100);
    this.pct = makeText(this, CX + 330, 44, '0%', 28).setDepth(101);
    makeText(this, CX - 640 + 120, 44, t('game.attempt', { n: this.attempt }), 28, '#ffffff').setDepth(101);
    new Button(this, CX + 640 - 40, 46, { width: 76, height: 68, icon: 'pause', variant: 'ghost', onClick: () => this.openPause() }).setDepth(110);
    this.drawBar();
  }

  private drawBar(): void {
    const w = 560;
    const x = CX - w / 2;
    const y = 44;
    const g = this.bar;
    g.clear();
    g.fillStyle(0x000000, 1);
    g.fillRoundedRect(x - 5, y - 17, w + 10, 34, 17);
    g.fillStyle(0x0a1445, 1);
    g.fillRoundedRect(x, y - 12, w, 24, 12);
    const fw = Math.max(0, (w * this.progress) / 100);
    if (fw > 2) {
      g.fillStyle(0x38e07b, 1);
      g.fillRoundedRect(x, y - 12, fw, 24, 12);
      g.fillStyle(0xffffff, 0.3);
      g.fillRoundedRect(x + 3, y - 10, Math.max(0, fw - 6), 8, 4);
    }
    this.pct.setText(`${Math.floor(this.progress)}%`);
  }

  private openPause(): void {
    if (this.paused || this.activeModal) return;
    this.paused = true;
    new Modal(this, {
      title: t('pause.title'),
      width: 860,
      height: 360,
      buttons: [
        { label: t('pause.exit'), variant: 'danger', onClick: () => this.leave() },
        { label: t('pause.restart'), variant: 'secondary', onClick: () => this.restart() },
        { label: t('pause.resume'), variant: 'success', onClick: () => this.resume() },
      ],
    });
    this.hopper?.stop();
  }

  private resume(): void {
    this.paused = false;
    this.hopper?.start(0);
  }

  private restart(): void {
    this.scene.restart({ levelId: this.level.id });
  }

  private leave(): void {
    this.paused = false;
    this.go(SceneKeys.LevelSelect, { levelId: this.level.id });
  }
}
