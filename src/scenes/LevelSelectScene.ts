import Phaser from 'phaser';
import { CX, CY, SceneKeys } from '@/config/constants';
import { DIFFICULTY_COLOR, isLevelUnlocked, LEVELS, type LevelDef } from '@/data/levels';
import { audio } from '@/services/audio';
import { t } from '@/services/i18n';
import { profile } from '@/services/profile';
import { Button } from '@/ui/Button';
import { makeText } from '@/ui/factory';
import { Panel } from '@/ui/Panel';
import { showToast } from '@/ui/Toast';
import { TEX } from '@/ui/textures';
import { addTopBar } from '@/ui/TopBar';
import { THEMES } from '@/data/themes';
import { BaseScene } from './BaseScene';

const CARD_W = 400;
const CARD_H = 430;
const SPACING = 460;
const CARD_Y = CY + 10;

interface Card {
  root: Phaser.GameObjects.Container;
  level: LevelDef;
  index: number;
  unlocked: boolean;
}

/** Horizontal carousel of level cards: swipe, arrows or tap a side card. Background follows the level theme. */
export class LevelSelectScene extends BaseScene {
  private cards: Card[] = [];
  private selected = 0;
  private playBtn!: Button;
  private dots!: Phaser.GameObjects.Graphics;
  private dragStartX = 0;
  private dragging = false;

  constructor() {
    super(SceneKeys.LevelSelect);
  }

  protected build(data?: { levelId?: string }): void {
    this.cards = [];
    this.selected = Math.max(0, LEVELS.findIndex((l) => l.id === data?.levelId));
    if (!data?.levelId) {
      // open on the first not-completed unlocked level
      const idx = LEVELS.findIndex((l, i) => isLevelUnlocked(i) && !profile.getProgress(l.id).completed);
      this.selected = idx >= 0 ? idx : 0;
    }

    this.createBackground({ theme: LEVELS[this.selected].themeId, ground: false });
    addTopBar(this, t('levels.title'), () => this.go(SceneKeys.Menu));

    LEVELS.forEach((level, i) => this.cards.push(this.createCard(level, i)));
    this.dots = this.add.graphics();

    new Button(this, CX - 640 + 20, CARD_Y, { width: 80, height: 110, icon: 'back', variant: 'ghost', sfx: 'select', onClick: () => this.move(-1) }).setDepth(40);
    new Button(this, CX + 640 - 20, CARD_Y, { width: 80, height: 110, icon: 'next', variant: 'ghost', sfx: 'select', onClick: () => this.move(1) }).setDepth(40);

    this.playBtn = new Button(this, CX, 650, { width: 340, height: 84, icon: 'play', label: t('levels.play'), variant: 'primary', sfx: 'start', fontSize: 40, onClick: () => this.play() });
    this.playBtn.pulse(0.03, 700);

    this.setupSwipe();
    this.layout(false);
  }

  protected onBack(): void {
    this.go(SceneKeys.Menu);
  }

  // ---------------------------------------------------------------- card

  private createCard(level: LevelDef, index: number): Card {
    const unlocked = isLevelUnlocked(index);
    const progress = profile.getProgress(level.id);
    const theme = THEMES[level.themeId];
    const root = this.add.container(CX + index * SPACING, CARD_Y);

    const panel = new Panel(this, 0, 0, CARD_W, CARD_H, { border: theme.accent });
    root.add(panel);

    // mini preview scene
    const pv = this.add.graphics();
    pv.fillStyle(0x000000, 1);
    pv.fillRoundedRect(-CARD_W / 2 + 22, -CARD_H / 2 + 22, CARD_W - 44, 150, 16);
    root.add(pv);
    const sky = this.add.image(-CARD_W / 2 + 26, -CARD_H / 2 + 26, TEX.pixel).setOrigin(0).setDisplaySize(CARD_W - 52, 142);
    sky.setTint(theme.top, theme.top, theme.bottom, theme.bottom);
    const ground = this.add.image(-CARD_W / 2 + 26, -CARD_H / 2 + 26 + 112, TEX.pixel).setOrigin(0).setDisplaySize(CARD_W - 52, 30).setTint(0x101010);
    const line = this.add.image(-CARD_W / 2 + 26, -CARD_H / 2 + 26 + 112, TEX.pixel).setOrigin(0).setDisplaySize(CARD_W - 52, 4).setTint(theme.accent);
    root.add([sky, ground, line]);
    [-100, -20, 80].forEach((x, i) => {
      const spike = this.add.image(x, -CARD_H / 2 + 26 + 114, i === 1 ? TEX.block : TEX.spike).setOrigin(0.5, 1).setDisplaySize(i === 1 ? 44 : 38, i === 1 ? 44 : 38).setTint(theme.accent);
      root.add(spike);
    });
    const gear = this.add.image(120, -CARD_H / 2 + 70, TEX.gear).setDisplaySize(90, 90).setTint(theme.accent).setAlpha(0.6);
    root.add(gear);
    this.tweens.add({ targets: gear, angle: 360, duration: 9000, repeat: -1 });

    // text
    root.add(makeText(this, 0, -CARD_H / 2 + 208, level.name, 36, '#ffffff', { wordWrap: { width: CARD_W - 50 }, align: 'center' }));

    // difficulty + stars row
    const col = DIFFICULTY_COLOR[level.difficulty];
    const diamond = this.add.graphics();
    diamond.fillStyle(0x000000, 1);
    diamond.fillPoints([{ x: 0, y: -22 }, { x: 22, y: 0 }, { x: 0, y: 22 }, { x: -22, y: 0 }], true);
    diamond.fillStyle(col, 1);
    diamond.fillPoints([{ x: 0, y: -16 }, { x: 16, y: 0 }, { x: 0, y: 16 }, { x: -16, y: 0 }], true);
    diamond.setPosition(-CARD_W / 2 + 70, -CARD_H / 2 + 262);
    root.add(diamond);
    root.add(makeText(this, -CARD_W / 2 + 100, -CARD_H / 2 + 262, t(`difficulty.${level.difficulty}`), 26, '#ffffff').setOrigin(0, 0.5));
    root.add(this.add.image(CARD_W / 2 - 100, -CARD_H / 2 + 262, TEX.icon('star')).setDisplaySize(36, 36).setTint(0xffd21f));
    root.add(makeText(this, CARD_W / 2 - 62, -CARD_H / 2 + 262, String(level.stars), 28).setOrigin(0, 0.5));

    // progress bar
    const barW = CARD_W - 90;
    const barY = -CARD_H / 2 + 330;
    const bar = this.add.graphics();
    bar.fillStyle(0x000000, 1);
    bar.fillRoundedRect(-barW / 2 - 4, barY - 16, barW + 8, 32, 16);
    bar.fillStyle(0x0a1445, 1);
    bar.fillRoundedRect(-barW / 2, barY - 12, barW, 24, 12);
    if (progress.bestPercent > 0) {
      bar.fillStyle(progress.completed ? 0x38e07b : theme.accent, 1);
      bar.fillRoundedRect(-barW / 2, barY - 12, Math.max(24, (barW * progress.bestPercent) / 100), 24, 12);
    }
    root.add(bar);
    root.add(makeText(this, 0, barY, `${progress.bestPercent}%`, 20));
    root.add(makeText(this, 0, barY + 40, progress.completed ? t('levels.completed') : t('levels.best'), 20, '#9af0ff', { strokeThickness: 3 }));

    // locked overlay
    if (!unlocked) {
      const veil = this.add.graphics();
      veil.fillStyle(0x02051a, 0.78);
      veil.fillRoundedRect(-CARD_W / 2 + 4, -CARD_H / 2 + 4, CARD_W - 8, CARD_H - 8, 26);
      root.add(veil);
      root.add(this.add.image(0, -20, TEX.icon('lock')).setDisplaySize(110, 110).setTint(0xcfd8ff));
      root.add(makeText(this, 0, 70, t('levels.locked'), 24, '#cfd8ff', { wordWrap: { width: CARD_W - 70 }, align: 'center' }));
    }

    // tap on card
    const hit = this.add.zone(0, 0, CARD_W, CARD_H).setInteractive();
    root.add(hit);
    hit.on('pointerup', () => {
      if (Math.abs(this.input.activePointer.x - this.dragStartX) > 24) return; // it was a swipe
      if (index !== this.selected) {
        this.select(index);
      } else {
        this.play();
      }
    });

    return { root, level, index, unlocked };
  }

  // ---------------------------------------------------------------- behaviour

  private setupSwipe(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.dragStartX = p.x;
      this.dragging = true;
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!this.dragging) return;
      this.dragging = false;
      const dx = p.x - this.dragStartX;
      if (Math.abs(dx) > 70) this.move(dx < 0 ? 1 : -1);
    });
  }

  private move(dir: number): void {
    this.select(Phaser.Math.Clamp(this.selected + dir, 0, LEVELS.length - 1));
  }

  private select(index: number): void {
    if (index === this.selected) return;
    this.selected = index;
    audio.sfx('select');
    this.layout(true);
  }

  private layout(animate: boolean): void {
    for (const c of this.cards) {
      const d = c.index - this.selected;
      const x = CX + d * SPACING;
      const scale = d === 0 ? 1 : 0.8;
      const alpha = Math.abs(d) > 1 ? 0 : d === 0 ? 1 : 0.55;
      c.root.setDepth(d === 0 ? 20 : 10);
      if (animate) {
        this.tweens.add({ targets: c.root, x, scale, alpha, duration: 280, ease: 'Cubic.easeOut' });
      } else {
        c.root.setPosition(x, CARD_Y).setScale(scale).setAlpha(alpha);
      }
    }
    const level = LEVELS[this.selected];
    this.bg?.setTheme(level.themeId, 500);
    this.playBtn.setAlpha(this.cards[this.selected].unlocked ? 1 : 0.55);
    this.drawDots();
  }

  private drawDots(): void {
    const g = this.dots;
    g.clear();
    const y = 585;
    LEVELS.forEach((_, i) => {
      const x = CX + (i - (LEVELS.length - 1) / 2) * 30;
      g.fillStyle(0x000000, 1);
      g.fillCircle(x, y, i === this.selected ? 11 : 8);
      g.fillStyle(i === this.selected ? 0xffd21f : 0x5a6aa8, 1);
      g.fillCircle(x, y, i === this.selected ? 8 : 5);
    });
  }

  private play(): void {
    const card = this.cards[this.selected];
    if (!card.unlocked) {
      audio.sfx('error');
      this.playBtn.shake();
      showToast(this, t('levels.locked'), 0xff4a5a);
      return;
    }
    this.go(SceneKeys.Game, { levelId: card.level.id });
  }
}
