import { CX, SceneKeys } from '@/config/constants';
import { THEMES } from '@/data/themes';
import { getTrack } from '@/data/tracks';
import type { LevelData } from '@/game/levelData';
import { audio } from '@/services/audio';
import { customLevels, pickLevelFile, shareLevelFile } from '@/services/customLevels';
import { t } from '@/services/i18n';
import { Button } from '@/ui/Button';
import { makeText } from '@/ui/factory';
import { Modal } from '@/ui/Modal';
import { Panel } from '@/ui/Panel';
import { showToast } from '@/ui/Toast';
import { addTopBar } from '@/ui/TopBar';
import { BaseScene } from './BaseScene';

const PER_PAGE = 4;
const ROW_H = 100;
const ROW_GAP = 16;
const FIRST_Y = 196;

/** "My maps": list of player-made levels — play, edit, share as a file, delete, import a friend's file. */
export class MapsScene extends BaseScene {
  private page = 0;

  constructor() {
    super(SceneKeys.Maps);
  }

  protected build(data?: { page?: number }): void {
    this.page = data?.page ?? 0;
    this.createBackground({ theme: 'sunset', ground: false });
    addTopBar(this, t('maps.title'), () => this.go(SceneKeys.Menu), false);

    new Button(this, CX + 290, 54, { width: 330, height: 66, icon: 'import', label: t('maps.import'), variant: 'secondary', fontSize: 26, onClick: () => void this.importFile() }).setDepth(50);
    new Button(this, CX + 570, 54, { width: 150, height: 66, icon: 'plus', variant: 'success', onClick: () => this.createNew() }).setDepth(50);

    const levels = customLevels.all();
    const pages = Math.max(1, Math.ceil(levels.length / PER_PAGE));
    this.page = Math.min(this.page, pages - 1);

    if (levels.length === 0) {
      makeText(this, CX, 360, t('maps.empty'), 34, '#ffffff', { wordWrap: { width: 900 }, align: 'center', strokeThickness: 5 });
      return;
    }

    levels.slice(this.page * PER_PAGE, (this.page + 1) * PER_PAGE).forEach((level, i) => this.buildRow(level, FIRST_Y + i * (ROW_H + ROW_GAP)));

    if (pages > 1) {
      new Button(this, CX - 120, 664, { width: 90, height: 56, icon: 'back', variant: 'ghost', sfx: 'select', onClick: () => this.turn(-1) });
      new Button(this, CX + 120, 664, { width: 90, height: 56, icon: 'next', variant: 'ghost', sfx: 'select', onClick: () => this.turn(1) });
      makeText(this, CX, 664, `${this.page + 1} / ${pages}`, 30);
    }
  }

  protected onBack(): void {
    this.go(SceneKeys.Menu);
  }

  private turn(dir: number): void {
    const pages = Math.ceil(customLevels.all().length / PER_PAGE);
    const next = this.page + dir;
    if (next < 0 || next >= pages) return;
    this.scene.restart({ page: next });
  }

  private buildRow(level: LevelData, y: number): void {
    const theme = THEMES[level.themeId] ?? THEMES.neon;
    new Panel(this, CX, y, 1260, ROW_H, { border: theme.accent, radius: 24 });

    const sw = this.add.graphics();
    sw.fillStyle(0x000000, 1);
    sw.fillRoundedRect(CX - 610, y - 34, 68, 68, 14);
    sw.fillStyle(theme.top, 1);
    sw.fillRoundedRect(CX - 606, y - 30, 60, 30, { tl: 10, tr: 10, bl: 0, br: 0 });
    sw.fillStyle(theme.bottom, 1);
    sw.fillRoundedRect(CX - 606, y, 60, 30, { tl: 0, tr: 0, bl: 10, br: 10 });
    sw.fillStyle(theme.accent, 1);
    sw.fillRect(CX - 606, y + 8, 60, 4);

    makeText(this, CX - 520, y - 18, level.name, 36).setOrigin(0, 0.5);
    makeText(this, CX - 520, y + 24, `${level.objects.length} ${t('maps.objects')}  ·  ${t(getTrack(level.trackId).nameKey)}`, 22, '#9af0ff', { strokeThickness: 3 }).setOrigin(0, 0.5);

    const bx = CX + 600;
    new Button(this, bx - 3 * 90, y, { width: 76, height: 76, icon: 'play', variant: 'success', radius: 22, sfx: 'start', onClick: () => this.go(SceneKeys.Game, { level, back: 'maps' }) });
    new Button(this, bx - 2 * 90, y, { width: 76, height: 76, icon: 'pencil', variant: 'secondary', radius: 22, onClick: () => this.go(SceneKeys.Editor, { id: level.id }) });
    new Button(this, bx - 90, y, { width: 76, height: 76, icon: 'share', variant: 'primary', radius: 22, onClick: () => void this.share(level) });
    new Button(this, bx, y, { width: 76, height: 76, icon: 'trash', variant: 'danger', radius: 22, onClick: () => this.confirmDelete(level) });
  }

  private createNew(): void {
    const level = customLevels.create();
    this.go(SceneKeys.Editor, { id: level.id });
  }

  private async importFile(): Promise<void> {
    const text = await pickLevelFile();
    if (text === null) return;
    const level = customLevels.importText(text);
    if (!level) {
      audio.sfx('error');
      showToast(this, t('maps.importFail'), 0xff4a5a);
      return;
    }
    audio.sfx('unlock');
    this.scene.restart({ page: Math.floor((customLevels.all().length - 1) / PER_PAGE) });
    showToast(this, t('maps.imported'), 0x38e07b);
  }

  private async share(level: LevelData): Promise<void> {
    const res = await shareLevelFile(level);
    if (res === 'failed') {
      audio.sfx('error');
      showToast(this, t('maps.exportFail'), 0xff4a5a);
    } else if (res === 'downloaded') {
      showToast(this, t('maps.shared'), 0x38e07b);
    }
  }

  private confirmDelete(level: LevelData): void {
    Modal.confirm(this, {
      title: t('maps.delete'),
      message: t('maps.deleteConfirm', { name: level.name }),
      yes: t('maps.delete'),
      danger: true,
      onYes: () => {
        customLevels.remove(level.id);
        this.scene.restart({ page: this.page });
      },
    });
  }
}
