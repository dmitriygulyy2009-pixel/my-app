import Phaser from 'phaser';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
import { GAME_HEIGHT, GAME_WIDTH, Palette } from '@/config/constants';
import { bus, GameEvents } from '@/core/EventBus';
import { audio } from '@/services/audio';
import { profile } from '@/services/profile';
import { BootScene } from '@/scenes/BootScene';
import { EditorScene } from '@/scenes/EditorScene';
import { MapsScene } from '@/scenes/MapsScene';
import { GameScene } from '@/scenes/GameScene';
import { LevelSelectScene } from '@/scenes/LevelSelectScene';
import { MenuScene } from '@/scenes/MenuScene';
import { PreloadScene } from '@/scenes/PreloadScene';
import { SettingsScene } from '@/scenes/SettingsScene';
import { SkinsScene } from '@/scenes/SkinsScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: Palette.navy,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  scale: {
    // FIT keeps the 1560x720 design aspect; any extra space is filled with the background color
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: { antialias: true, roundPixels: false, powerPreference: 'high-performance' },
  input: { activePointers: 2 },
  fps: { target: 60 },
  scene: [BootScene, PreloadScene, MenuScene, LevelSelectScene, SkinsScene, SettingsScene, MapsScene, EditorScene, GameScene],
});

// Keyboard: Escape acts as "back" (handy on desktop)
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') bus.emit(GameEvents.Back);
});

// Native shell integration
if (Capacitor.isNativePlatform()) {
  void StatusBar.hide().catch(() => undefined);
  void App.addListener('backButton', () => bus.emit(GameEvents.Back));
  void App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) {
      audio.resume();
    } else {
      audio.suspend();
      void profile.flush();
    }
  });
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    audio.suspend();
    void profile.flush();
  } else {
    audio.resume();
  }
});

// debug handle
(window as unknown as { __game: Phaser.Game }).__game = game;
