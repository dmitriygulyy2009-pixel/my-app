import Phaser from 'phaser';

/** Typed names of every global event. Scenes subscribe via `bus.on(...)` and MUST unsubscribe on shutdown. */
export const GameEvents = {
  /** Emitted on every quarter note of the music: { beat: 0..3, bar: 0..3 } */
  Beat: 'audio:beat',
  SettingsChanged: 'settings:changed',
  ProfileChanged: 'profile:changed',
  LanguageChanged: 'lang:changed',
  /** Android hardware back button / Escape key */
  Back: 'app:back',
} as const;

export interface BeatPayload {
  beat: number;
  bar: number;
}

export const bus = new Phaser.Events.EventEmitter();
