import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, type SceneKey } from '@/config/constants';
import { bus, GameEvents } from '@/core/EventBus';
import { ParallaxBackground, type BackgroundOptions } from '@/game/ParallaxBackground';
import { profile } from '@/services/profile';
import { makeText } from '@/ui/factory';
import type { ModalHost } from '@/ui/Modal';

const FADE = { r: 5, g: 11, b: 46 };

/**
 * Base class for every UI/game scene. Gives you for free:
 *  - fade-in / fade-out transitions (`go`)
 *  - animated parallax background (`createBackground`)
 *  - hardware back button routing (`onBack`), modal-aware
 *  - optional FPS counter (settings)
 *  - safe cleanup of global event-bus listeners
 * Subclasses implement `build()` instead of `create()`.
 */
export abstract class BaseScene extends Phaser.Scene implements ModalHost {
  activeModal?: { close(): void };
  protected bg?: ParallaxBackground;
  private leaving = false;
  private fpsText?: Phaser.GameObjects.Text;
  private fpsTimer = 0;

  create(data?: object): void {
    this.leaving = false;
    this.activeModal = undefined;
    this.cameras.main.fadeIn(260, FADE.r, FADE.g, FADE.b);

    bus.on(GameEvents.Back, this.handleBack, this);
    bus.on(GameEvents.SettingsChanged, this.onSettings, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);

    this.build(data);
    this.setupFps();
  }

  /** Build the scene content. */
  protected abstract build(data?: object): void;

  /** Called when the user presses the system back button (and no modal is open). */
  protected onBack(): void {
    /* default: nothing */
  }

  /** Optional hook for subclasses to release resources. */
  protected onCleanup(): void {
    /* default: nothing */
  }

  protected createBackground(opts: BackgroundOptions = {}): ParallaxBackground {
    this.bg = new ParallaxBackground(this, opts);
    return this.bg;
  }

  /** Fade out and switch to another scene. Ignores repeated calls while the transition runs. */
  protected go(key: SceneKey, data?: object): void {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(200, FADE.r, FADE.g, FADE.b);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(key, data));
  }

  update(time: number, delta: number): void {
    this.bg?.update(time, delta);
    if (this.fpsText?.visible) {
      this.fpsTimer += delta;
      if (this.fpsTimer > 500) {
        this.fpsTimer = 0;
        this.fpsText.setText(`${Math.round(this.game.loop.actualFps)} FPS`);
      }
    }
  }

  // ---------------------------------------------------------------- internals

  private handleBack(): void {
    if (this.leaving) return;
    if (this.activeModal) {
      this.activeModal.close();
      return;
    }
    this.onBack();
  }

  private setupFps(): void {
    this.fpsText = makeText(this, GAME_WIDTH - 70, GAME_HEIGHT - 22, '', 20, '#9af0ff').setDepth(3000);
    this.fpsText.setVisible(profile.settings.showFps);
  }

  private onSettings(): void {
    this.fpsText?.setVisible(profile.settings.showFps);
  }

  private cleanup(): void {
    bus.off(GameEvents.Back, this.handleBack, this);
    bus.off(GameEvents.SettingsChanged, this.onSettings, this);
    this.bg?.destroy();
    this.bg = undefined;
    this.onCleanup();
  }
}
