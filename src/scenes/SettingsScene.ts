import { APP_VERSION, CX, SceneKeys } from '@/config/constants';
import { audio } from '@/services/audio';
import { t } from '@/services/i18n';
import { profile } from '@/services/profile';
import { Button } from '@/ui/Button';
import { makeText } from '@/ui/factory';
import { Modal } from '@/ui/Modal';
import { Panel } from '@/ui/Panel';
import { Slider } from '@/ui/Slider';
import { showToast } from '@/ui/Toast';
import { TEX } from '@/ui/textures';
import { addTopBar } from '@/ui/TopBar';
import { Toggle } from '@/ui/Toggle';
import { BaseScene } from './BaseScene';

const PANEL_W = 960;
const ROW_H = 66;
const FIRST_ROW_Y = 190;

export class SettingsScene extends BaseScene {
  constructor() {
    super(SceneKeys.Settings);
  }

  protected build(): void {
    this.createBackground({ theme: 'neon', ground: false });
    addTopBar(this, t('settings.title'), () => this.go(SceneKeys.Menu), false);

    new Panel(this, CX, 410, PANEL_W, 570);

    const left = CX - PANEL_W / 2 + 70;
    const right = CX + PANEL_W / 2 - 70;
    let row = 0;
    const rowY = (): number => FIRST_ROW_Y + row++ * ROW_H;
    const s = profile.settings;

    // music
    let y = rowY();
    this.label(left, y, t('settings.music'), 'note');
    new Slider(this, right - 230, y, 360, s.musicVolume, (v) => {
      profile.updateSettings({ musicVolume: v });
      audio.setVolumes(v, profile.settings.sfxVolume);
    });

    // sfx
    y = rowY();
    this.label(left, y, t('settings.sfx'), 'speaker');
    new Slider(
      this, right - 230, y, 360, s.sfxVolume,
      (v) => {
        profile.updateSettings({ sfxVolume: v });
        audio.setVolumes(profile.settings.musicVolume, v);
      },
      () => audio.sfx('click'),
    );

    // vibration
    y = rowY();
    this.label(left, y, t('settings.vibration'));
    new Toggle(this, right - 56, y, s.vibration, (v) => profile.updateSettings({ vibration: v }));

    // fps counter
    y = rowY();
    this.label(left, y, t('settings.fps'));
    new Toggle(this, right - 56, y, s.showFps, (v) => profile.updateSettings({ showFps: v }));

    // quality (segmented)
    y = rowY();
    this.label(left, y, t('settings.quality'));
    this.segmented(right - 150, y, [
      { id: 'low', label: t('settings.quality.low') },
      { id: 'high', label: t('settings.quality.high') },
    ], s.quality, (id) => {
      profile.updateSettings({ quality: id as 'low' | 'high' });
      showToast(this, t('settings.quality.hint'), 0x19d4ff);
    });

    // language (segmented) — restarts the scene so every label is re-created
    y = rowY();
    this.label(left, y, t('settings.language'));
    this.segmented(right - 150, y, [
      { id: 'ru', label: 'Русский' },
      { id: 'en', label: 'English' },
    ], s.language, (id) => {
      profile.updateSettings({ language: id as 'ru' | 'en' });
      this.scene.restart();
    });

    // bottom actions
    const by = 600;
    new Button(this, CX - 220, by, { width: 360, height: 76, icon: 'info', label: t('settings.about'), variant: 'secondary', fontSize: 30, onClick: () => this.showAbout() });
    new Button(this, CX + 220, by, { width: 360, height: 76, icon: 'restart', label: t('settings.reset'), variant: 'danger', fontSize: 28, onClick: () => this.confirmReset() });
  }

  protected onBack(): void {
    this.go(SceneKeys.Menu);
  }

  // ---------------------------------------------------------------- helpers

  private label(x: number, y: number, text: string, icon?: 'note' | 'speaker'): void {
    if (icon) this.add.image(x + 20, y, TEX.icon(icon)).setDisplaySize(40, 40).setTint(0x9af0ff);
    makeText(this, x + (icon ? 54 : 0), y, text, 32).setOrigin(0, 0.5);
  }

  private segmented(cx: number, y: number, items: Array<{ id: string; label: string }>, current: string, onPick: (id: string) => void): void {
    const w = 170;
    const buttons: Button[] = [];
    items.forEach((it, i) => {
      const b = new Button(this, cx + (i - (items.length - 1) / 2) * (w + 10), y, {
        width: w, height: 56, label: it.label, fontSize: 24, radius: 18,
        variant: it.id === current ? 'primary' : 'ghost',
        sfx: 'toggle',
        onClick: () => {
          buttons.forEach((o, k) => o.setVariant(items[k].id === it.id ? 'primary' : 'ghost'));
          onPick(it.id);
        },
      });
      buttons.push(b);
    });
  }

  private showAbout(): void {
    new Modal(this, {
      title: t('about.title'),
      width: 800,
      height: 520,
      build: (content, area) => {
        const logo = this.add.image(0, area.top + 90, TEX.logo).setDisplaySize(170, 170);
        content.add(logo);
        content.add(makeText(this, 0, area.top + 215, `DashWorld  v${APP_VERSION}`, 32, '#ffd21f'));
        content.add(makeText(this, 0, area.top + 262, t('about.stage'), 22, '#ffffff', { wordWrap: { width: area.w - 20 }, align: 'center', strokeThickness: 4 }));
        content.add(makeText(this, 0, area.top + 318, t('about.tech'), 22, '#9af0ff', { strokeThickness: 4 }));
      },
    });
  }

  private confirmReset(): void {
    Modal.confirm(this, {
      title: t('settings.reset'),
      message: t('settings.reset.confirm'),
      yes: t('settings.reset.yes'),
      danger: true,
      onYes: () => {
        void profile.reset().then(() => {
          audio.setVolumes(profile.settings.musicVolume, profile.settings.sfxVolume);
          this.scene.restart();
          showToast(this, t('settings.reset.done'), 0x38e07b);
        });
      },
    });
  }
}
