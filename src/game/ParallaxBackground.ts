import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, GROUND_Y } from '@/config/constants';
import { bus, GameEvents } from '@/core/EventBus';
import { DEFAULT_THEME, THEMES, type ThemeDef } from '@/data/themes';
import { profile } from '@/services/profile';
import { darken, lerpColor } from '@/ui/factory';
import { TEX } from '@/ui/textures';

export interface BackgroundOptions {
  theme?: string;
  /** scrolling ground + obstacles decor */
  ground?: boolean;
  groundSpeed?: number;
  /** gameplay mode: no auto-scroll and no decorative obstacles; the scene drives the scroll via setScroll() */
  follow?: boolean;
}

interface Drifter {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  base: number;
  phase: number;
}

interface Decor {
  img: Phaser.GameObjects.Image;
}

interface Colors {
  top: number;
  bottom: number;
  accent: number;
}

const DEPTH = -100;

/**
 * Living background: gradient sky, parallax castles, drifting pixel blocks, rotating gears, scrolling
 * ground with spikes/blocks, and a soft pulse on every musical beat. Theme can be cross-faded at runtime.
 * Every sprite is white/grey and tinted, so adding a new theme is just a new entry in data/themes.ts.
 */
export class ParallaxBackground {
  private readonly high = profile.settings.quality === 'high';
  private readonly gradient: Phaser.GameObjects.Image;
  private readonly flash: Phaser.GameObjects.Image;
  private readonly castles: Array<{ sprite: Phaser.GameObjects.TileSprite; speed: number }> = [];
  private readonly drifters: Drifter[] = [];
  private readonly gears: Array<{ img: Phaser.GameObjects.Image; speed: number; base: number }> = [];
  private readonly decor: Decor[] = [];
  private ground?: Phaser.GameObjects.TileSprite;
  private readonly groundSpeed: number;
  private readonly follow: boolean;

  private from: Colors;
  private to: Colors;
  private mix = 1;
  private mixDuration = 600;
  private dirty = true;

  constructor(private readonly scene: Phaser.Scene, opts: BackgroundOptions = {}) {
    const theme = THEMES[opts.theme ?? DEFAULT_THEME] ?? THEMES[DEFAULT_THEME];
    this.from = { top: theme.top, bottom: theme.bottom, accent: theme.accent };
    this.to = { ...this.from };
    this.follow = opts.follow ?? false;
    this.groundSpeed = this.follow ? 0 : opts.groundSpeed ?? 230;

    this.gradient = scene.add.image(0, 0, TEX.pixel).setOrigin(0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setDepth(DEPTH);

    // far → near castle silhouettes
    const horizon = opts.ground === false ? GAME_HEIGHT : GROUND_Y + 4;
    [{ scale: 0.7, alpha: 0.22, speed: 7 }, { scale: 1, alpha: 0.38, speed: 16 }].forEach((l, i) => {
      const h = Math.round(360 * l.scale);
      const sprite = scene.add.tileSprite(0, horizon, GAME_WIDTH, h, TEX.castle).setOrigin(0, 1).setAlpha(l.alpha).setDepth(DEPTH + 10 + i);
      sprite.setTileScale(l.scale, l.scale);
      sprite.tilePositionX = i * 300;
      this.castles.push({ sprite, speed: l.speed });
    });

    // big rotating gears
    const gearDefs = [
      { x: 170, y: 170, size: 320, speed: 9 },
      { x: GAME_WIDTH - 150, y: GAME_HEIGHT - 120, size: 380, speed: -7 },
      { x: GAME_WIDTH - 260, y: 120, size: 190, speed: -12 },
    ];
    for (const d of this.high ? gearDefs : gearDefs.slice(0, 2)) {
      const img = scene.add.image(d.x, d.y, TEX.gear).setDisplaySize(d.size, d.size).setAlpha(0.5).setDepth(DEPTH + 20);
      this.gears.push({ img, speed: d.speed, base: d.size });
    }

    // drifting pixel blocks (the "dust" from the logo art)
    const count = this.high ? 28 : 12;
    for (let i = 0; i < count; i++) {
      const size = Phaser.Math.Between(10, 44);
      const img = scene.add.image(Math.random() * GAME_WIDTH, Math.random() * (GROUND_Y - 20), TEX.pixel).setDisplaySize(size, size).setDepth(DEPTH + 30);
      this.drifters.push({
        img,
        vx: -Phaser.Math.Between(6, 26),
        vy: -Phaser.Math.Between(2, 12),
        base: 0.08 + Math.random() * 0.2,
        phase: Math.random() * Math.PI * 2,
      });
    }

    if (opts.ground !== false) {
      this.ground = scene.add
        .tileSprite(0, GROUND_Y, GAME_WIDTH, GAME_HEIGHT - GROUND_Y, TEX.ground)
        .setOrigin(0)
        .setDepth(DEPTH + 50);
      if (!this.follow) {
        let x = GAME_WIDTH * 0.3;
        for (let i = 0; i < 9; i++) {
          const img = scene.add.image(0, GROUND_Y + 3, TEX.spike).setOrigin(0.5, 1).setDepth(DEPTH + 45);
          this.decor.push({ img });
          x = this.respawn(img, x);
        }
      }
    }

    this.flash = scene.add.image(0, 0, TEX.pixel).setOrigin(0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setAlpha(0).setDepth(DEPTH + 60);

    if (this.high) bus.on(GameEvents.Beat, this.onBeat, this);
    this.applyColors(this.resolve());
  }

  /** Smoothly cross-fade to another theme. */
  setTheme(id: string, duration = 600): void {
    const t: ThemeDef | undefined = THEMES[id];
    if (!t) return;
    this.from = this.resolve();
    this.to = { top: t.top, bottom: t.bottom, accent: t.accent };
    this.mix = 0;
    this.mixDuration = duration;
  }

  update(time: number, delta: number): void {
    const dt = delta / 1000;

    if (this.mix < 1) {
      this.mix = Math.min(1, this.mix + delta / this.mixDuration);
      this.dirty = true;
    }
    if (this.dirty) {
      this.applyColors(this.resolve());
      this.dirty = false;
    }

    if (!this.follow) for (const c of this.castles) c.sprite.tilePositionX += c.speed * dt;
    for (const g of this.gears) g.img.angle += g.speed * dt;

    for (const d of this.drifters) {
      d.img.x += d.vx * dt;
      d.img.y += d.vy * dt;
      d.img.alpha = d.base * (0.55 + 0.45 * Math.sin(time * 0.0012 + d.phase));
      if (d.img.x < -60) d.img.x = GAME_WIDTH + 40;
      if (d.img.y < -60) d.img.y = GROUND_Y - 10;
    }

    if (this.ground) {
      this.ground.tilePositionX += this.groundSpeed * dt;
      let maxX = 0;
      for (const d of this.decor) maxX = Math.max(maxX, d.img.x);
      for (const d of this.decor) {
        d.img.x -= this.groundSpeed * dt;
        if (d.img.x < -120) maxX = this.respawn(d.img, Math.max(maxX, GAME_WIDTH));
      }
    }
  }

  /** Gameplay mode: world scroll in pixels (ground moves 1:1, castles slower for depth). */
  setScroll(px: number): void {
    if (this.ground) this.ground.tilePositionX = px;
    this.castles.forEach((c, i) => (c.sprite.tilePositionX = px * (i === 0 ? 0.04 : 0.1) + i * 300));
  }

  /** Decorative obstacles currently on the ground (menu hopper uses them to time its jumps). */
  getObstacles(): Array<{ x: number; w: number; h: number }> {
    return this.decor.map((d) => ({ x: d.img.x, w: d.img.displayWidth, h: d.img.displayHeight }));
  }

  get speed(): number {
    return this.groundSpeed;
  }

  destroy(): void {
    bus.off(GameEvents.Beat, this.onBeat, this);
  }

  // ---------------------------------------------------------------- internals

  private resolve(): Colors {
    const t = Phaser.Math.Easing.Sine.InOut(this.mix);
    return {
      top: lerpColor(this.from.top, this.to.top, t),
      bottom: lerpColor(this.from.bottom, this.to.bottom, t),
      accent: lerpColor(this.from.accent, this.to.accent, t),
    };
  }

  private applyColors(c: Colors): void {
    this.gradient.setTint(c.top, c.top, c.bottom, c.bottom);
    this.flash.setTint(c.accent);
    const castleTint = darken(lerpColor(c.top, c.bottom, 0.55), 0.35);
    for (const k of this.castles) k.sprite.setTint(castleTint);
    for (const g of this.gears) g.img.setTint(c.accent);
    for (const d of this.drifters) d.img.setTint(lerpColor(c.accent, 0xffffff, 0.35));
    this.ground?.setTint(c.accent);
    for (const d of this.decor) d.img.setTint(c.accent);
  }

  /** Re-places an obstacle right of `fromX` with a random gap; returns its new x. */
  private respawn(img: Phaser.GameObjects.Image, fromX: number): number {
    const x = fromX + Phaser.Math.Between(300, 560);
    const roll = Math.random();
    if (roll < 0.62) {
      const s = Phaser.Math.Between(56, 84);
      img.setTexture(TEX.spike).setDisplaySize(s, s);
    } else {
      const s = Phaser.Math.Between(60, 100);
      img.setTexture(TEX.block).setDisplaySize(s, s);
    }
    img.x = x;
    return x;
  }

  private onBeat(payload: { beat: number }): void {
    this.flash.setAlpha(payload.beat === 0 ? 0.09 : 0.04);
    this.scene.tweens.add({ targets: this.flash, alpha: 0, duration: 380, ease: 'Quad.easeOut' });
    if (payload.beat === 0) {
      for (const g of this.gears) {
        this.scene.tweens.add({ targets: g.img, displayWidth: g.base * 1.05, displayHeight: g.base * 1.05, duration: 120, yoyo: true, ease: 'Quad.easeOut' });
      }
    }
  }
}
