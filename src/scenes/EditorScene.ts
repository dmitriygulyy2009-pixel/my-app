import Phaser from 'phaser';
import { CX, GAME_HEIGHT, GAME_WIDTH, SceneKeys } from '@/config/constants';
import { DEFAULT_THEME, THEMES } from '@/data/themes';
import { CUSTOM_TRACK_IDS, getTrack } from '@/data/tracks';
import { verifyLevel } from '@/game/bot';
import { computeEndX, ROWS, type LevelData, type LevelObj, type ObjKind } from '@/game/levelData';
import { createObjectView, type ObjectView } from '@/game/objectViews';
import { buildIndex } from '@/game/sim';
import { audio } from '@/services/audio';
import { customLevels } from '@/services/customLevels';
import { t } from '@/services/i18n';
import { Button } from '@/ui/Button';
import { makeText } from '@/ui/factory';
import { Modal } from '@/ui/Modal';
import { showToast } from '@/ui/Toast';
import { TEX } from '@/ui/textures';
import { BaseScene } from './BaseScene';

const ET = 52; // editor tile size in px
const GRID_TOP = 84;
const GROUND_E = GRID_TOP + ROWS * ET; // 604
const TOOLBAR_Y = 666;
const TILE_SIZE = 84;

type Tool = 'draw' | 'erase' | 'hand';

const PALETTE: ObjKind[] = ['block', 'spike', 'saw', 'pad', 'orb', 'portalShip', 'portalCube', 'portalGravUp', 'portalGravDown'];

interface Tile {
  root: Phaser.GameObjects.Container;
  setSelected(on: boolean): void;
  setIcon?(rot: number): void;
}

const key = (x: number, y: number): string => `${x},${y}`;

/**
 * Level editor. Tap/drag to place the selected object on the grid, eraser removes, hand tool (or dragging past the
 * screen edge) scrolls. Autosaves; "Test" plays the map right away, "Bot" runs the same physics-based verifier
 * the built-in levels are checked with and tells you whether the map is beatable.
 */
export class EditorScene extends BaseScene {
  private level!: LevelData;
  private objects: LevelObj[] = [];
  private cells = new Map<string, LevelObj>();
  private views = new Map<LevelObj, ObjectView>();

  private ew!: Phaser.GameObjects.Container; // world container
  private grid!: Phaser.GameObjects.Graphics;
  private sky!: Phaser.GameObjects.Image;
  private gate!: Phaser.GameObjects.Image;
  private startCube!: Phaser.GameObjects.Image;
  private coordText!: Phaser.GameObjects.Text;
  private nameBtn!: Button;

  private scrollCol = -2;
  private tool: Tool = 'draw';
  private kind: ObjKind = 'block';
  private rot = 0;
  private tiles = new Map<string, Tile>();
  private undoStack: string[] = [];
  private lastCell = '';
  private pointerDown = false;
  private panLastX = 0;
  private strokeToggle = true;
  private dirty = false;
  private accent = 0x19d4ff;

  constructor() {
    super(SceneKeys.Editor);
  }

  protected build(data?: { id?: string }): void {
    const found = data?.id ? customLevels.get(data.id) : undefined;
    this.level = found ?? customLevels.create();
    this.objects = this.level.objects;
    this.cells.clear();
    this.views.clear();
    this.tiles.clear();
    this.undoStack = [];
    this.scrollCol = -2;
    this.tool = 'draw';
    this.kind = 'block';
    this.rot = 0;
    this.dirty = false;
    for (const o of this.objects) this.cells.set(key(o.x, o.y), o);

    this.buildScene();
    this.buildTopBar();
    this.buildToolbar();
    this.setupInput();
    this.applyTheme();
    this.refreshViews();
    this.drawGrid();
    this.time.addEvent({ delay: 4000, loop: true, callback: () => this.saveIfDirty() });
  }

  protected onBack(): void {
    this.exit();
  }

  protected onCleanup(): void {
    this.saveIfDirty();
  }

  // ---------------------------------------------------------------- layout

  private buildScene(): void {
    this.sky = this.add.image(0, 0, TEX.pixel).setOrigin(0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setDepth(-20);
    this.grid = this.add.graphics().setDepth(1);
    this.ew = this.add.container(0, GROUND_E).setDepth(3);

    this.gate = this.add.image(0, 0, TEX.finish).setOrigin(0.5, 1).setDisplaySize(ET, ROWS * ET).setAlpha(0.9);
    this.startCube = this.add.image(0, 0, TEX.cubeBody).setDisplaySize(ET * 0.9, ET * 0.9).setTint(0xffc61a).setAlpha(0.55);
    this.ew.add([this.gate, this.startCube]);
    this.startCube.setPosition(0, -ET * 0.45);

    // toolbar / top bar backdrops
    const top = this.add.graphics().setDepth(40);
    top.fillStyle(0x050b2e, 0.96);
    top.fillRect(0, 0, GAME_WIDTH, GRID_TOP);
    top.fillStyle(0x19d4ff, 0.5);
    top.fillRect(0, GRID_TOP - 3, GAME_WIDTH, 3);
    const bottom = this.add.graphics().setDepth(40);
    bottom.fillStyle(0x050b2e, 0.97);
    bottom.fillRect(0, GROUND_E + 8, GAME_WIDTH, GAME_HEIGHT - GROUND_E - 8);
    bottom.fillStyle(0x19d4ff, 0.5);
    bottom.fillRect(0, GROUND_E + 8, GAME_WIDTH, 3);

    this.coordText = makeText(this, 90, GROUND_E - 14, '', 20, '#9af0ff', { strokeThickness: 3 }).setDepth(45).setOrigin(0, 0.5);
  }

  private buildTopBar(): void {
    const D = 50;
    new Button(this, CX - 640 + 50, 42, { width: 84, height: 60, icon: 'back', variant: 'secondary', sfx: 'back', onClick: () => this.exit() }).setDepth(D);
    this.nameBtn = new Button(this, CX - 130, 42, { width: 420, height: 60, label: this.level.name, variant: 'ghost', fontSize: 28, onClick: () => this.rename() }).setDepth(D);
    new Button(this, CX + 160, 42, { width: 76, height: 60, icon: 'undo', variant: 'ghost', sfx: 'click', onClick: () => this.undo() }).setDepth(D);
    new Button(this, CX + 250, 42, { width: 76, height: 60, icon: 'gear', variant: 'ghost', onClick: () => this.openSettings() }).setDepth(D);
    new Button(this, CX + 340, 42, { width: 76, height: 60, icon: 'bot', variant: 'secondary', onClick: () => this.runBot() }).setDepth(D);
    new Button(this, CX + 470, 42, { width: 160, height: 60, icon: 'play', label: t('editor.test'), variant: 'success', fontSize: 26, sfx: 'start', onClick: () => this.testPlay() }).setDepth(D);
  }

  private buildToolbar(): void {
    const items: Array<{ id: string; make: (x: number) => Tile }> = [];
    const toolTile = (id: Tool, icon: 'hand' | 'eraser'): { id: string; make: (x: number) => Tile } => ({
      id,
      make: (x) => this.makeTile(x, () => this.setTool(id), (c, s) => {
        c.add(this.add.image(0, 0, TEX.icon(icon)).setDisplaySize(s * 0.6, s * 0.6));
      }),
    });
    items.push(toolTile('hand', 'hand'), toolTile('erase', 'eraser'));
    items.push({
      id: 'rotate',
      make: (x) => this.makeTile(x, () => this.rotate(), (c, s) => c.add(this.add.image(0, 0, TEX.icon('rotate')).setDisplaySize(s * 0.6, s * 0.6))),
    });
    for (const k of PALETTE) {
      items.push({ id: k, make: (x) => this.makePaletteTile(x, k) });
    }
    const gap = 8;
    const total = items.length * TILE_SIZE + (items.length - 1) * gap;
    let x = CX - total / 2 + TILE_SIZE / 2;
    items.forEach((it, i) => {
      const tile = it.make(x);
      this.tiles.set(it.id, tile);
      x += TILE_SIZE + gap;
      if (i === 2) x += 14; // visual gap between tools and objects
    });
    this.refreshToolbar();
  }

  private makeTile(x: number, onClick: () => void, fill: (c: Phaser.GameObjects.Container, size: number) => void): Tile {
    const s = TILE_SIZE;
    const root = this.add.container(x, TOOLBAR_Y).setDepth(50);
    const bg = this.add.graphics();
    const draw = (on: boolean): void => {
      bg.clear();
      bg.fillStyle(0x000000, 1);
      bg.fillRoundedRect(-s / 2, -s / 2, s, s, 18);
      bg.fillStyle(on ? 0x2a3a9a : 0x101c66, 1);
      bg.fillRoundedRect(-s / 2 + 3, -s / 2 + 3, s - 6, s - 6, 15);
      bg.lineStyle(on ? 5 : 2, on ? 0xffd21f : 0x3b52d6, 1);
      bg.strokeRoundedRect(-s / 2 + 6, -s / 2 + 6, s - 12, s - 12, 12);
    };
    draw(false);
    root.add(bg);
    fill(root, s);
    root.setSize(s, s).setInteractive({ useHandCursor: true });
    root.on('pointerup', () => {
      audio.sfx('select');
      onClick();
    });
    return { root, setSelected: draw };
  }

  private makePaletteTile(x: number, kind: ObjKind): Tile {
    let icon: Phaser.GameObjects.Container | undefined;
    const build = (root: Phaser.GameObjects.Container, size: number, rot: number): void => {
      icon?.destroy();
      const portal = kind.startsWith('portal');
      const it = portal ? size * 0.26 : size * 0.62;
      const obj: LevelObj = { k: kind, x: 0, y: 0 };
      if (kind === 'spike' && rot) obj.r = rot;
      if (kind === 'pad' && rot >= 180) obj.r = 180;
      const view = createObjectView(this, obj, it, 0x19d4ff);
      const c = this.add.container(0, 0);
      c.add(view);
      const dy = kind === 'pad' ? 0.17 : portal ? 1.5 : 0.5;
      c.setPosition(-0.5 * it, dy * it);
      const holder = this.add.container(0, 0, [c]);
      root.add(holder);
      icon = holder;
    };
    const tile = this.makeTile(x, () => this.setKind(kind), (c, s) => build(c, s, 0));
    if (kind === 'spike' || kind === 'pad') tile.setIcon = (rot: number) => build(tile.root, TILE_SIZE, rot);
    return tile;
  }

  private refreshToolbar(): void {
    this.tiles.get('hand')?.setSelected(this.tool === 'hand');
    this.tiles.get('erase')?.setSelected(this.tool === 'erase');
    for (const k of PALETTE) this.tiles.get(k)?.setSelected(this.tool === 'draw' && this.kind === k);
    this.tiles.get('rotate')?.setSelected(false);
  }

  private setTool(tool: Tool): void {
    this.tool = tool;
    this.refreshToolbar();
  }

  private setKind(kind: ObjKind): void {
    this.kind = kind;
    this.tool = 'draw';
    this.refreshToolbar();
  }

  private rotate(): void {
    this.rot = (this.rot + 90) % 360;
    this.tiles.get('spike')?.setIcon?.(this.rot);
    this.tiles.get('pad')?.setIcon?.(this.rot);
    this.refreshToolbar();
  }

  // ---------------------------------------------------------------- input

  private setupInput(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.activeModal || !this.inGrid(p)) return;
      this.pointerDown = true;
      this.panLastX = p.x;
      this.lastCell = '';
      this.strokeToggle = true;
      if (this.tool !== 'hand') this.pushUndo();
      this.paint(p);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.pointerDown || !p.isDown) return;
      if (this.tool === 'hand') {
        this.scrollBy(-(p.x - this.panLastX) / ET);
        this.panLastX = p.x;
      } else {
        this.paint(p);
      }
    });
    this.input.on('pointerup', () => {
      if (!this.pointerDown) return;
      this.pointerDown = false;
      this.afterEdit();
    });
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _o: unknown, dx: number, dy: number) => this.scrollBy((dx + dy) / ET));
  }

  private inGrid(p: Phaser.Input.Pointer): boolean {
    return p.y >= GRID_TOP && p.y < GROUND_E + 4;
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    // dragging near the left/right edge auto-scrolls while drawing
    const p = this.input.activePointer;
    if (this.pointerDown && p.isDown && this.tool !== 'hand' && !this.activeModal) {
      const speed = (delta / 1000) * 9;
      if (p.x < 70) this.scrollBy(-speed);
      else if (p.x > GAME_WIDTH - 70) this.scrollBy(speed);
    }
  }

  private cellAt(p: Phaser.Input.Pointer): { x: number; y: number } | null {
    const x = Math.floor((p.x + this.scrollCol * ET) / ET);
    const y = Math.floor((GROUND_E - p.y) / ET);
    if (x < 0 || y < 0 || y >= ROWS) return null;
    return { x, y };
  }

  private paint(p: Phaser.Input.Pointer): void {
    const c = this.cellAt(p);
    if (!c) return;
    const k = key(c.x, c.y);
    this.coordText.setText(`x ${c.x}  y ${c.y}`);
    if (k === this.lastCell) return;
    this.lastCell = k;
    if (this.tool === 'erase') this.eraseAt(c.x, c.y);
    else if (this.tool === 'draw') this.placeAt(c.x, c.y);
    this.strokeToggle = false;
  }

  private currentRot(): number | undefined {
    if (this.kind === 'spike') return this.rot || undefined;
    if (this.kind === 'pad') return this.rot >= 180 ? 180 : undefined;
    return undefined;
  }

  private placeAt(x: number, y: number): void {
    const existing = this.cells.get(key(x, y));
    const r = this.currentRot();
    if (existing) {
      const same = existing.k === this.kind && (existing.r ?? 0) === (r ?? 0);
      this.removeObject(existing);
      if (same && this.strokeToggle) {
        audio.sfx('erase');
        return; // tapping the same object again removes it
      }
    }
    const o: LevelObj = { k: this.kind, x, y };
    if (r) o.r = r;
    this.objects.push(o);
    this.cells.set(key(x, y), o);
    this.dirty = true;
    this.addView(o);
    audio.sfx('place');
  }

  private eraseAt(x: number, y: number): void {
    const existing = this.cells.get(key(x, y));
    if (!existing) return;
    this.removeObject(existing);
    audio.sfx('erase');
  }

  private removeObject(o: LevelObj): void {
    const i = this.objects.indexOf(o);
    if (i >= 0) this.objects.splice(i, 1);
    this.cells.delete(key(o.x, o.y));
    this.views.get(o)?.destroy();
    this.views.delete(o);
    this.dirty = true;
  }

  // ---------------------------------------------------------------- undo / save

  private pushUndo(): void {
    this.undoStack.push(JSON.stringify(this.objects));
    if (this.undoStack.length > 60) this.undoStack.shift();
  }

  private undo(): void {
    const prev = this.undoStack.pop();
    if (prev === undefined) return;
    const restored = JSON.parse(prev) as LevelObj[];
    this.objects.length = 0;
    this.objects.push(...restored);
    this.cells.clear();
    for (const o of this.objects) this.cells.set(key(o.x, o.y), o);
    for (const v of this.views.values()) v.destroy();
    this.views.clear();
    this.refreshViews();
    this.dirty = true;
    this.afterEdit();
    audio.sfx('back');
  }

  private afterEdit(): void {
    this.level.endX = computeEndX(this.objects);
    this.gate.setX(this.level.endX * ET);
    this.saveIfDirty();
  }

  private saveIfDirty(): void {
    if (!this.dirty) return;
    this.dirty = false;
    customLevels.save(this.level);
  }

  // ---------------------------------------------------------------- scrolling / views

  private scrollBy(cols: number): void {
    const max = Math.max(40, this.level.endX) + 8;
    this.scrollCol = Phaser.Math.Clamp(this.scrollCol + cols, -3, max);
    this.drawGrid();
    this.refreshViews();
  }

  private addView(o: LevelObj): void {
    const v = createObjectView(this, o, ET, this.accent);
    this.ew.add(v);
    this.views.set(o, v);
  }

  private refreshViews(): void {
    this.ew.x = -this.scrollCol * ET;
    const from = Math.floor(this.scrollCol) - 3;
    const to = Math.ceil(this.scrollCol + GAME_WIDTH / ET) + 3;
    for (const o of this.objects) {
      const inside = o.x >= from && o.x <= to;
      const has = this.views.has(o);
      if (inside && !has) this.addView(o);
      else if (!inside && has) {
        this.views.get(o)?.destroy();
        this.views.delete(o);
      }
    }
  }

  private drawGrid(): void {
    const g = this.grid;
    g.clear();
    const first = Math.floor(this.scrollCol) - 1;
    const last = Math.ceil(this.scrollCol + GAME_WIDTH / ET) + 1;
    for (let c = first; c <= last; c++) {
      const x = c * ET - this.scrollCol * ET;
      const major = ((c % 4) + 4) % 4 === 0;
      g.lineStyle(major ? 2 : 1, 0xffffff, major ? 0.2 : 0.09);
      g.lineBetween(x, GRID_TOP, x, GROUND_E);
    }
    for (let r = 0; r <= ROWS; r++) {
      const y = GROUND_E - r * ET;
      g.lineStyle(r === 0 ? 4 : 1, r === 0 ? this.accent : 0xffffff, r === 0 ? 1 : 0.09);
      g.lineBetween(0, y, GAME_WIDTH, y);
    }
    // ceiling line used by ship / flipped-gravity sections (y = 9)
    g.lineStyle(2, 0xff4fd8, 0.55);
    g.lineBetween(0, GROUND_E - 9 * ET, GAME_WIDTH, GROUND_E - 9 * ET);
  }

  private applyTheme(): void {
    const th = THEMES[this.level.themeId] ?? THEMES[DEFAULT_THEME];
    this.accent = th.accent;
    this.sky.setTint(th.top, th.top, th.bottom, th.bottom);
    this.gate.setTint(th.accent);
    for (const v of this.views.values()) v.destroy();
    this.views.clear();
    this.refreshViews();
    this.drawGrid();
  }

  // ---------------------------------------------------------------- actions

  private rename(): void {
    const name = window.prompt(t('editor.rename'), this.level.name);
    if (!name || !name.trim()) return;
    this.level.name = name.trim().slice(0, 24);
    this.nameBtn.setLabel(this.level.name);
    this.dirty = true;
    this.saveIfDirty();
  }

  private exit(): void {
    this.saveIfDirty();
    this.go(SceneKeys.Maps);
  }

  private testPlay(): void {
    if (this.objects.length === 0) {
      audio.sfx('error');
      showToast(this, t('editor.empty'), 0xff4a5a);
      return;
    }
    this.level.endX = computeEndX(this.objects);
    this.dirty = true;
    this.saveIfDirty();
    this.go(SceneKeys.Game, { level: this.level, back: 'editor', editorId: this.level.id });
  }

  private runBot(): void {
    if (this.objects.length === 0) {
      audio.sfx('error');
      showToast(this, t('editor.empty'), 0xff4a5a);
      return;
    }
    showToast(this, t('editor.checking'), 0x19d4ff);
    this.level.endX = computeEndX(this.objects);
    // let the toast render before the (synchronous) search blocks the thread for a moment
    this.time.delayedCall(120, () => {
      const res = verifyLevel(buildIndex(this.level), 5, 2500);
      if (res.ok) {
        audio.sfx('unlock');
        showToast(this, t('editor.passable'), 0x38e07b);
      } else {
        audio.sfx('error');
        showToast(this, t('editor.notPassable', { p: res.percent }), 0xff4a5a);
      }
    });
  }

  private openSettings(): void {
    const themeIds = Object.keys(THEMES);
    new Modal(this, {
      title: t('editor.settings'),
      width: 860,
      height: 440,
      onDismiss: () => audio.playTrack('menu'),
      buttons: [{ label: t('common.ok'), variant: 'success', onClick: () => audio.playTrack('menu') }],
      build: (content, area) => {
        const row = (y: number, label: string, value: () => string, step: (d: number) => void): void => {
          content.add(makeText(this, -area.w / 2 + 10, y, label, 30, '#9af0ff').setOrigin(0, 0.5));
          const val = makeText(this, 150, y, value(), 30).setOrigin(0.5);
          content.add(val);
          const mk = (x: number, icon: 'back' | 'next', d: number): void => {
            const b = new Button(this, x, y, { width: 70, height: 60, icon, variant: 'secondary', sfx: 'select', radius: 18, onClick: () => { step(d); val.setText(value()); } });
            content.add(b);
          };
          mk(-10, 'back', -1);
          mk(310, 'next', 1);
        };
        const cycle = <T,>(list: T[], cur: T, d: number): T => list[(list.indexOf(cur) + d + list.length) % list.length];
        row(area.top + 40, t('editor.theme'), () => this.level.themeId.toUpperCase(), (d) => {
          this.level.themeId = cycle(themeIds, this.level.themeId, d);
          this.dirty = true;
          this.applyTheme();
          this.saveIfDirty();
        });
        row(area.top + 130, t('editor.music'), () => t(getTrack(this.level.trackId).nameKey), (d) => {
          this.level.trackId = cycle(CUSTOM_TRACK_IDS, this.level.trackId, d);
          this.dirty = true;
          audio.playTrack(this.level.trackId, true);
          this.saveIfDirty();
        });
      },
    });
  }
}
