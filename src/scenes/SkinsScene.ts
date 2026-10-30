import Phaser from 'phaser';
import { CX, SceneKeys } from '@/config/constants';
import { CubeHopper } from '@/game/CubeHopper';
import { PlayerCube } from '@/game/PlayerCube';
import { COLOR_PALETTE, SKINS, TRAILS, getSkin, getTrail } from '@/data/skins';
import { audio } from '@/services/audio';
import { haptics } from '@/services/haptics';
import { t } from '@/services/i18n';
import { profile } from '@/services/profile';
import { Button } from '@/ui/Button';
import { makeText } from '@/ui/factory';
import { Panel } from '@/ui/Panel';
import { showToast } from '@/ui/Toast';
import { TEX } from '@/ui/textures';
import { addTopBar } from '@/ui/TopBar';
import { BaseScene } from './BaseScene';

type Tab = 'cubes' | 'colors' | 'trails';

const GRID_LEFT = CX - 640 + 440; // left edge of the selection area
const GRID_W = 800;
const CONTENT_TOP = 215;

/** Garage: live preview on the left, three tabs (cubes / colors / trails) on the right. */
export class SkinsScene extends BaseScene {
  private tab: Tab = 'cubes';
  private preview!: PlayerCube;
  private hopper?: CubeHopper;
  private nameText!: Phaser.GameObjects.Text;
  private content!: Phaser.GameObjects.Container;
  private tabButtons = new Map<Tab, Button>();

  constructor() {
    super(SceneKeys.Skins);
  }

  protected build(): void {
    this.createBackground({ theme: 'violet', ground: false });
    addTopBar(this, t('skins.title'), () => this.go(SceneKeys.Menu));

    this.buildPreview();
    this.buildTabs();
    this.content = this.add.container(0, 0);
    this.showTab('cubes');
  }

  protected onBack(): void {
    this.go(SceneKeys.Menu);
  }

  protected onCleanup(): void {
    this.hopper?.destroy();
    this.hopper = undefined;
    this.tabButtons.clear();
  }

  // ---------------------------------------------------------------- preview

  private buildPreview(): void {
    const px = CX - 640 + 200;
    const py = 405;
    new Panel(this, px, py, 380, 500, { border: 0xb46bff });

    const groundY = py + 120;
    const g = this.add.graphics();
    g.fillStyle(0x000000, 1);
    g.fillRect(px - 160, groundY, 320, 8);
    g.fillStyle(0xb46bff, 1);
    g.fillRect(px - 160, groundY, 320, 4);

    const p = profile.player;
    this.preview = new PlayerCube(this, px - 20, groundY - 80, 160, { skinId: p.skinId, primary: p.primaryColor, secondary: p.secondaryColor, trailId: p.trailId });
    this.preview.setDepth(10);
    this.hopper = new CubeHopper(this, this.preview, { groundY, jumpHeight: 120, duration: 760, pause: 360 });
    this.hopper.start(300);

    this.nameText = makeText(this, px, py - 195, t(getSkin(p.skinId).nameKey), 40, '#ffd21f');
  }

  private refreshPreview(): void {
    const p = profile.player;
    this.preview.setLook({ skinId: p.skinId, primary: p.primaryColor, secondary: p.secondaryColor, trailId: p.trailId });
    this.nameText.setText(t(getSkin(p.skinId).nameKey));
    this.tweens.add({ targets: this.nameText, scale: { from: 1.25, to: 1 }, duration: 220, ease: 'Back.easeOut' });
  }

  // ---------------------------------------------------------------- tabs

  private buildTabs(): void {
    const tabs: Array<{ id: Tab; label: string }> = [
      { id: 'cubes', label: t('skins.tab.cubes') },
      { id: 'colors', label: t('skins.tab.colors') },
      { id: 'trails', label: t('skins.tab.trails') },
    ];
    const w = 250;
    tabs.forEach((tb, i) => {
      const x = GRID_LEFT + 20 + w / 2 + i * (w + 14);
      const btn = new Button(this, x, 160, { width: w, height: 64, label: tb.label, variant: i === 0 ? 'primary' : 'ghost', fontSize: 28, sfx: 'select', onClick: () => this.showTab(tb.id) });
      this.tabButtons.set(tb.id, btn);
    });
  }

  private showTab(tab: Tab): void {
    this.tab = tab;
    for (const [id, btn] of this.tabButtons) btn.setVariant(id === tab ? 'primary' : 'ghost');
    this.content.removeAll(true);
    if (tab === 'cubes') this.buildCubes();
    else if (tab === 'colors') this.buildColors();
    else this.buildTrails();
    this.content.setAlpha(0);
    this.tweens.add({ targets: this.content, alpha: 1, duration: 180 });
  }

  // ---------------------------------------------------------------- cubes

  private buildCubes(): void {
    const cell = 124;
    const gap = 14;
    const cols = 6;
    const startX = GRID_LEFT + 20 + cell / 2;
    SKINS.forEach((skin, i) => {
      const x = startX + (i % cols) * (cell + gap);
      const y = CONTENT_TOP + 70 + Math.floor(i / cols) * (cell + gap);
      const unlocked = profile.player.stars >= skin.requiredStars;
      const selected = profile.player.skinId === skin.id;
      const p = profile.player;

      const card = this.drawCell(x, y, cell, cell, selected);
      const cube = new PlayerCube(this, x, y - 8, 72, { skinId: skin.id, primary: p.primaryColor, secondary: p.secondaryColor });
      cube.setDepth(5);
      this.content.add([card, cube]);

      if (!unlocked) this.addLock(x, y, cell, skin.requiredStars);

      const zone = this.add.zone(x, y, cell, cell).setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => this.pickSkin(skin.id, unlocked, skin.requiredStars));
      this.content.add(zone);
      if (selected) this.addCheck(x + cell / 2 - 12, y - cell / 2 + 12);
    });
  }

  private pickSkin(id: string, unlocked: boolean, need: number): void {
    if (!unlocked) return this.denied(need);
    audio.sfx('select');
    haptics.light();
    profile.updatePlayer({ skinId: id });
    this.refreshPreview();
    this.showTab('cubes');
  }

  // ---------------------------------------------------------------- colors

  private buildColors(): void {
    const sw = 78;
    const gap = 12;
    const cols = 6;
    const startX = GRID_LEFT + 20 + sw / 2 + 10;
    const rows: Array<{ title: string; key: 'primaryColor' | 'secondaryColor'; y: number }> = [
      { title: t('skins.primary'), key: 'primaryColor', y: CONTENT_TOP + 18 },
      { title: t('skins.secondary'), key: 'secondaryColor', y: CONTENT_TOP + 18 + 205 },
    ];
    for (const row of rows) {
      const label = makeText(this, GRID_LEFT + 30, row.y, row.title, 26, '#9af0ff').setOrigin(0, 0.5);
      this.content.add(label);
      COLOR_PALETTE.forEach((color, i) => {
        const x = startX + (i % cols) * (sw + gap) + (i % cols) * 24;
        const y = row.y + 66 + Math.floor(i / cols) * (sw + gap);
        const selected = profile.player[row.key] === color;
        const g = this.add.graphics();
        g.fillStyle(0x000000, 1);
        g.fillRoundedRect(x - sw / 2 - 3, y - sw / 2 - 3, sw + 6, sw + 6, 18);
        g.fillStyle(color, 1);
        g.fillRoundedRect(x - sw / 2 + 2, y - sw / 2 + 2, sw - 4, sw - 4, 14);
        g.fillStyle(0xffffff, 0.28);
        g.fillRoundedRect(x - sw / 2 + 8, y - sw / 2 + 7, sw - 16, 16, 7);
        if (selected) {
          g.lineStyle(5, 0xffd21f, 1);
          g.strokeRoundedRect(x - sw / 2 - 7, y - sw / 2 - 7, sw + 14, sw + 14, 20);
        }
        this.content.add(g);
        if (selected) this.addCheck(x + sw / 2 - 4, y - sw / 2 + 4);

        const zone = this.add.zone(x, y, sw, sw).setInteractive({ useHandCursor: true });
        zone.on('pointerup', () => {
          audio.sfx('select');
          haptics.light();
          profile.updatePlayer(row.key === 'primaryColor' ? { primaryColor: color } : { secondaryColor: color });
          this.refreshPreview();
          this.showTab('colors');
        });
        this.content.add(zone);
      });
    }
  }

  // ---------------------------------------------------------------- trails

  private buildTrails(): void {
    const w = 252;
    const h = 150;
    const gap = 16;
    TRAILS.forEach((trail, i) => {
      const x = GRID_LEFT + 20 + w / 2 + (i % 3) * (w + gap);
      const y = CONTENT_TOP + 90 + Math.floor(i / 3) * (h + gap);
      const unlocked = profile.player.stars >= trail.requiredStars;
      const selected = profile.player.trailId === trail.id;

      const card = this.drawCell(x, y, w, h, selected);
      this.content.add(card);
      this.content.add(makeText(this, x, y - 38, t(trail.nameKey), 28));

      // swatch strip showing the particle colors
      const colors = trail.tint.length > 0 ? trail.tint : [0x3a3f66];
      const sz = 26;
      const total = colors.length * (sz + 6) - 6;
      colors.forEach((c, k) => {
        const sq = this.add.rectangle(x - total / 2 + sz / 2 + k * (sz + 6), y + 22, sz, sz, c).setStrokeStyle(3, 0x000000);
        this.content.add(sq);
      });

      if (!unlocked) this.addLock(x, y, w, trail.requiredStars, h);
      if (selected) this.addCheck(x + w / 2 - 12, y - h / 2 + 12);

      const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => {
        if (!unlocked) return this.denied(trail.requiredStars);
        audio.sfx('select');
        haptics.light();
        profile.updatePlayer({ trailId: trail.id });
        this.preview.setTrail(getTrail(trail.id).id);
        this.showTab('trails');
      });
      this.content.add(zone);
    });
  }

  // ---------------------------------------------------------------- shared bits

  private drawCell(x: number, y: number, w: number, h: number, selected: boolean): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();
    g.fillStyle(0x000000, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 22);
    g.fillStyle(selected ? 0x2a3a9a : 0x101c66, 0.96);
    g.fillRoundedRect(x - w / 2 + 3, y - h / 2 + 3, w - 6, h - 6, 19);
    g.lineStyle(selected ? 5 : 2, selected ? 0xffd21f : 0x3b52d6, 1);
    g.strokeRoundedRect(x - w / 2 + 6, y - h / 2 + 6, w - 12, h - 12, 16);
    return g;
  }

  private addLock(x: number, y: number, w: number, need: number, h = w): void {
    const veil = this.add.graphics();
    veil.fillStyle(0x02051a, 0.74);
    veil.fillRoundedRect(x - w / 2 + 3, y - h / 2 + 3, w - 6, h - 6, 19);
    const lock = this.add.image(x, y - 12, TEX.icon('lock')).setDisplaySize(46, 46).setTint(0xcfd8ff);
    const star = this.add.image(x - 22, y + h / 2 - 28, TEX.icon('star')).setDisplaySize(26, 26).setTint(0xffd21f);
    const num = makeText(this, x + 6, y + h / 2 - 28, String(need), 24).setOrigin(0, 0.5);
    this.content.add([veil, lock, star, num]);
  }

  private addCheck(x: number, y: number): void {
    const bg = this.add.circle(x, y, 17, 0x38e07b).setStrokeStyle(4, 0x000000);
    const ck = this.add.image(x, y, TEX.icon('check')).setDisplaySize(22, 22);
    this.content.add([bg, ck]);
  }

  private denied(need: number): void {
    audio.sfx('error');
    haptics.medium();
    showToast(this, t('skins.need', { n: need }), 0xff4a5a);
  }
}
