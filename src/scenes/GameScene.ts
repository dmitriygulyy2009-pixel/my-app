import Phaser from 'phaser';
import { CX, GAME_WIDTH, GROUND_Y, SceneKeys } from '@/config/constants';
import { DEFAULT_THEME, THEMES } from '@/data/themes';
import { LEVELS, type LevelDef } from '@/data/levels';
import { playConfetti, playExplosion } from '@/game/DeathFx';
import { buildBuiltin } from '@/game/levelDefs';
import type { LevelData, LevelObj } from '@/game/levelData';
import { animateView, createObjectView, type ObjectView } from '@/game/objectViews';
import { PlayerView } from '@/game/PlayerView';
import { buildIndex, createState, DT, step, type LevelIndex, type SimState } from '@/game/sim';
import { audio } from '@/services/audio';
import { haptics } from '@/services/haptics';
import { t } from '@/services/i18n';
import { profile } from '@/services/profile';
import { Button } from '@/ui/Button';
import { makeText } from '@/ui/factory';
import { Modal } from '@/ui/Modal';
import { TEX } from '@/ui/textures';
import { BaseScene } from './BaseScene';

export const TILE = 60;
const PLAYER_X = 440;

export interface GameSceneData {
  /** built-in level id */
  levelId?: string;
  /** custom / test level */
  level?: LevelData;
  /** where the back button / finish screen leads */
  back?: 'levels' | 'maps' | 'editor';
  editorId?: string;
}

type Phase = 'ready' | 'play' | 'dead' | 'won' | 'paused';

const indexCache = new Map<string, LevelIndex>();

/**
 * The actual game: runs the deterministic simulation (game/sim.ts) at a fixed 120 Hz and renders it.
 * Cube, ship, jump pads, jump orbs, gravity and mode portals, saws, spikes, blocks — plus death explosion,
 * attempt counter, progress bar, pause menu and the level-complete screen.
 */
export class GameScene extends BaseScene {
  private level!: LevelData;
  private def?: LevelDef;
  private index!: LevelIndex;
  private sim: SimState = createState();
  private phase: Phase = 'ready';
  private acc = 0;
  private holding = false;
  private pressPending = false;

  private world!: Phaser.GameObjects.Container;
  private sorted: LevelObj[] = [];
  private spawnPtr = 0;
  private active: Array<{ o: LevelObj; v: ObjectView }> = [];
  private player!: PlayerView;
  private ceiling!: Phaser.GameObjects.TileSprite;
  private ceilOn = false;
  private accent = 0x19d4ff;

  private bar!: Phaser.GameObjects.Graphics;
  private pct!: Phaser.GameObjects.Text;
  private attemptText?: Phaser.GameObjects.Text;
  private hintText?: Phaser.GameObjects.Text;
  private attempts = 0; // attempts in this session for custom levels
  private bestThisRun = 0;
  private back: 'levels' | 'maps' | 'editor' = 'levels';
  private editorId?: string;
  private time0 = 0;

  constructor() {
    super(SceneKeys.Game);
  }

  protected musicTrack(): string | null {
    return null; // the scene starts the level's own song
  }

  protected build(data?: GameSceneData): void {
    this.back = data?.back ?? 'levels';
    this.editorId = data?.editorId;
    this.def = data?.levelId ? LEVELS.find((l) => l.id === data.levelId) : undefined;
    this.level = data?.level ?? buildBuiltin(this.def ?? LEVELS[0]);
    if (!data?.level && !this.def) this.def = LEVELS[0];

    const cacheKey = this.def ? this.def.id : '';
    let idx = cacheKey ? indexCache.get(cacheKey) : undefined;
    if (!idx) {
      idx = buildIndex(this.level);
      if (cacheKey) indexCache.set(cacheKey, idx);
    }
    this.index = idx;

    const theme = THEMES[this.level.themeId] ?? THEMES[DEFAULT_THEME];
    this.accent = theme.accent;
    this.createBackground({ theme: theme.id, ground: true, follow: true });

    this.sorted = [...this.level.objects].sort((a, b) => a.x - b.x);
    this.world = this.add.container(0, GROUND_Y).setDepth(5);

    const gate = this.add.image(this.level.endX * TILE, 0, TEX.finish).setOrigin(0.5, 1).setDisplaySize(TILE, 12 * TILE).setTint(this.accent);
    this.world.add(gate);

    this.ceiling = this.add.tileSprite(0, 0, GAME_WIDTH, 56, TEX.ground).setOrigin(0).setFlipY(true).setTint(this.accent).setAlpha(0).setDepth(4);

    const p = profile.player;
    this.player = new PlayerView(this, TILE * 0.9, { skinId: p.skinId, primary: p.primaryColor, secondary: p.secondaryColor, trailId: p.trailId }, 10);

    this.buildHud();
    this.setupInput();

    this.attempts = 0;
    this.bestThisRun = 0;
    this.phase = 'ready';
    this.resetWorld();
    this.renderFrame(0, 0);
    this.time.delayedCall(450, () => this.startAttempt(false));
  }

  protected onBack(): void {
    if (this.phase === 'won') {
      this.leave();
      return;
    }
    this.openPause();
  }

  protected onCleanup(): void {
    this.clearActive();
    this.player?.destroy();
    audio.stopMusic(0.15);
  }

  // ---------------------------------------------------------------- setup

  private buildHud(): void {
    this.bar = this.add.graphics().setDepth(100);
    this.pct = makeText(this, CX + 345, 44, '0%', 30).setDepth(101);
    new Button(this, GAME_WIDTH - 70, 48, { width: 80, height: 70, icon: 'pause', variant: 'ghost', sfx: 'click', onClick: () => this.openPause() }).setDepth(110);
    this.drawBar(0);
  }

  private setupInput(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.x > GAME_WIDTH - 180 && p.y < 120) return; // pause button area
      this.press();
    });
    this.input.on('pointerup', () => this.release());
    const kb = this.input.keyboard;
    if (kb) {
      for (const key of ['SPACE', 'UP', 'W']) {
        kb.on(`keydown-${key}`, () => this.press());
        kb.on(`keyup-${key}`, () => this.release());
      }
    }
  }

  private press(): void {
    if (this.phase !== 'play' || this.activeModal) return;
    if (!this.holding) this.pressPending = true;
    this.holding = true;
  }

  private release(): void {
    this.holding = false;
  }

  // ---------------------------------------------------------------- attempts

  private currentAttempt(): number {
    return this.def ? profile.getProgress(this.def.id).attempts + 1 : this.attempts + 1;
  }

  private startAttempt(isRetry: boolean): void {
    this.resetWorld();
    this.sim = createState();
    this.acc = 0;
    this.holding = false;
    this.pressPending = false;
    this.player.reset();
    this.player.setVisible(true);
    this.phase = 'play';
    this.time0 = this.time.now;
    audio.playTrack(this.level.trackId, true);
    this.attemptText?.setText(t('game.attempt', { n: this.currentAttempt() }));
    if (!isRetry && this.hintText) {
      this.hintText.setAlpha(1);
      this.tweens.add({ targets: this.hintText, alpha: 0, delay: 2200, duration: 600 });
    }
  }

  private resetWorld(): void {
    this.clearActive();
    this.spawnPtr = 0;
    this.sim = createState();
    this.ceilOn = false;
    this.ceiling.setAlpha(0);
    if (!this.attemptText) {
      this.attemptText = makeText(this, 0, 0, '', 46).setPosition(5 * TILE, -6.4 * TILE);
      this.hintText = makeText(this, 0, 0, t('game.hint'), 30, '#9af0ff').setPosition(5 * TILE, -5.3 * TILE).setAlpha(0);
      this.world.add([this.attemptText, this.hintText]);
    }
  }

  private clearActive(): void {
    for (const a of this.active) a.v.destroy();
    this.active = [];
  }

  // ---------------------------------------------------------------- frame loop

  update(time: number, delta: number): void {
    super.update(time, delta);
    const dt = Math.min(delta, 50) / 1000;
    if (this.phase === 'play') {
      this.acc += dt;
      while (this.acc >= DT && this.phase === 'play') {
        this.acc -= DT;
        this.stepOnce();
      }
    }
    if (this.phase === 'play' || this.phase === 'ready') this.renderFrame(dt, time);
  }

  private stepOnce(): void {
    const s = this.sim;
    const press = this.pressPending;
    this.pressPending = false;
    const mode = s.mode;
    const up = s.up;
    const pad = s.lastPad;
    const orb = s.lastOrb;
    step(s, this.index, this.holding || press, press);

    if (s.lastPad !== pad) this.ringFx(0xffe14d, 'pad');
    if (s.lastOrb !== orb) this.ringFx(0xffe14d, 'orb');
    if (s.mode !== mode || s.up !== up) {
      audio.sfx('portal');
      haptics.medium();
      this.cameras.main.flash(140, 255, 255, 255, false);
    }
    if (s.dead) this.die();
    else if (s.won) this.win();
  }

  private renderFrame(dt: number, time: number): void {
    const s = this.sim;
    const px = s.x * TILE;
    this.world.x = PLAYER_X - px;
    const py = GROUND_Y - s.y * TILE;
    if (this.phase !== 'dead') this.player.update(dt, s, PLAYER_X, py);
    this.bg?.setScroll(px);
    this.ceiling.tilePositionX = px;

    // lazy spawning / despawning of level objects
    const spawnLimit = px + (GAME_WIDTH - PLAYER_X) + 2 * TILE;
    while (this.spawnPtr < this.sorted.length && this.sorted[this.spawnPtr].x * TILE <= spawnLimit) {
      const o = this.sorted[this.spawnPtr++];
      const v = createObjectView(this, o, TILE, this.accent);
      this.world.add(v);
      this.active.push({ o, v });
    }
    const dropLimit = px - PLAYER_X - 2 * TILE;
    let drop = 0;
    while (drop < this.active.length && (this.active[drop].o.x + 1) * TILE < dropLimit) {
      this.active[drop].v.destroy();
      drop++;
    }
    if (drop > 0) this.active.splice(0, drop);
    for (const a of this.active) animateView(a.v, dt, time);

    // ceiling strip appears while it matters (ship / flipped gravity)
    const wantCeil = s.mode === 1 || s.up === -1;
    if (wantCeil !== this.ceilOn) {
      this.ceilOn = wantCeil;
      this.tweens.add({ targets: this.ceiling, alpha: wantCeil ? 1 : 0, duration: 250 });
    }

    const pct = Math.min(100, (s.x / this.level.endX) * 100);
    this.drawBar(pct);
  }

  private drawBar(pct: number): void {
    const w = 560;
    const x = CX - w / 2;
    const y = 44;
    const g = this.bar;
    g.clear();
    g.fillStyle(0x000000, 1);
    g.fillRoundedRect(x - 5, y - 17, w + 10, 34, 17);
    g.fillStyle(0x0a1445, 1);
    g.fillRoundedRect(x, y - 12, w, 24, 12);
    const fw = (w * pct) / 100;
    if (fw > 2) {
      g.fillStyle(0x38e07b, 1);
      g.fillRoundedRect(x, y - 12, Math.max(24, fw), 24, 12);
      g.fillStyle(0xffffff, 0.3);
      g.fillRoundedRect(x + 3, y - 10, Math.max(0, Math.max(24, fw) - 6), 8, 4);
    }
    this.pct.setText(`${Math.floor(pct)}%`);
  }

  private ringFx(color: number, kind: 'pad' | 'orb'): void {
    audio.sfx(kind);
    haptics.light();
    const x = PLAYER_X;
    const y = GROUND_Y - this.sim.y * TILE;
    const ring = this.add.graphics({ x, y }).setDepth(50);
    ring.lineStyle(6, color, 1);
    ring.strokeCircle(0, 0, 26);
    this.tweens.add({ targets: ring, scale: 2.6, alpha: 0, duration: 320, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
  }

  // ---------------------------------------------------------------- death

  private die(): void {
    this.phase = 'dead';
    const pct = Math.min(99, Math.floor((this.sim.x / this.level.endX) * 100));
    this.bestThisRun = Math.max(this.bestThisRun, pct);
    if (this.def) {
      const pr = profile.getProgress(this.def.id);
      profile.setLevelProgress(this.def.id, { attempts: pr.attempts + 1, bestPercent: Math.max(pr.bestPercent, pct) });
    } else {
      this.attempts++;
    }
    const p = profile.player;
    playExplosion(this, PLAYER_X, GROUND_Y - this.sim.y * TILE, p.primaryColor, p.secondaryColor);
    this.player.setVisible(false);
    audio.stopMusic(0.12);
    audio.sfx('explode');
    haptics.heavy();
    this.time.delayedCall(850, () => {
      if (this.phase === 'dead') this.startAttempt(true);
    });
  }

  // ---------------------------------------------------------------- win

  private win(): void {
    this.phase = 'won';
    audio.stopMusic(0.3);
    audio.sfx('win');
    haptics.heavy();
    const p = profile.player;
    playConfetti(this, [p.primaryColor, p.secondaryColor, 0xffd21f, 0xffffff, this.accent]);
    this.tweens.add({ targets: this.player.cube, x: GAME_WIDTH + 200, y: this.player.cube.y - 220, angle: 360, duration: 900, ease: 'Cubic.easeIn' });

    let reward = '';
    if (this.def) {
      const pr = profile.getProgress(this.def.id);
      const first = !pr.completed;
      profile.setLevelProgress(this.def.id, { attempts: pr.attempts + 1, bestPercent: 100, completed: true });
      if (first) {
        const orbs = 100 + this.def.stars * 25;
        profile.updatePlayer({ stars: profile.player.stars + this.def.stars, orbs: profile.player.orbs + orbs });
        reward = t('game.reward', { stars: this.def.stars, orbs });
      }
    }
    const attempts = this.def ? profile.getProgress(this.def.id).attempts : this.attempts + 1;
    const title = this.back === 'editor' ? t('game.testDone') : t('game.complete');

    this.time.delayedCall(1000, () => {
      new Modal(this, {
        title,
        width: 860,
        height: 440,
        onDismiss: () => this.leave(),
        buttons: [
          { label: t('pause.exit'), variant: 'secondary', onClick: () => this.leave() },
          { label: t('game.retry'), variant: 'success', onClick: () => this.scene.restart(this.restartData()) },
        ],
        build: (content, area) => {
          const mid = (area.top + area.bottom) / 2;
          content.add(makeText(this, 0, mid - 36, t('game.attempts', { n: attempts }), 34));
          if (reward) content.add(makeText(this, 0, mid + 28, reward, 28, '#ffd21f'));
        },
      });
    });
  }

  // ---------------------------------------------------------------- pause / leave

  private openPause(): void {
    if (this.phase === 'dead' || this.phase === 'paused' || this.phase === 'won' || this.activeModal) return;
    const resumeTo: Phase = this.phase;
    this.phase = 'paused';
    this.holding = false;
    audio.pauseMusic();
    const resume = (): void => {
      this.phase = resumeTo;
      this.acc = 0;
      audio.resumeMusic();
    };
    new Modal(this, {
      title: t('pause.title'),
      width: 900,
      height: 360,
      onDismiss: resume,
      buttons: [
        { label: t('pause.exit'), variant: 'danger', onClick: () => this.leave() },
        { label: t('pause.restart'), variant: 'secondary', onClick: () => this.scene.restart(this.restartData()) },
        { label: t('pause.resume'), variant: 'success', onClick: resume },
      ],
    });
  }

  private restartData(): GameSceneData {
    return { levelId: this.def?.id, level: this.def ? undefined : this.level, back: this.back, editorId: this.editorId };
  }

  private leave(): void {
    audio.stopMusic(0.15);
    if (this.back === 'editor') this.go(SceneKeys.Editor, { id: this.editorId });
    else if (this.back === 'maps') this.go(SceneKeys.Maps);
    else this.go(SceneKeys.LevelSelect, { levelId: this.def?.id });
  }
}


