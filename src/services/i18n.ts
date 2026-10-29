import type { Language } from '@/types/save';

type Dict = Record<string, string>;

const ru: Dict = {
  'common.back': 'Назад',
  'common.cancel': 'Отмена',
  'common.ok': 'Ок',
  'preload.tap': 'НАЖМИТЕ, ЧТОБЫ НАЧАТЬ',
  'preload.loading': 'Загрузка...',
  'menu.play': 'ИГРАТЬ',
  'menu.skins': 'Скины',
  'menu.settings': 'Настройки',
  'toast.exit': 'Нажмите ещё раз, чтобы выйти',

  'levels.title': 'УРОВНИ',
  'levels.best': 'Лучший результат',
  'levels.locked': 'Пройдите предыдущий уровень',
  'levels.play': 'ИГРАТЬ',
  'levels.completed': 'Пройден',

  'skins.title': 'ГАРАЖ',
  'skins.tab.cubes': 'Кубы',
  'skins.tab.colors': 'Цвета',
  'skins.tab.trails': 'Шлейфы',
  'skins.primary': 'Основной цвет',
  'skins.secondary': 'Цвет лица',
  'skins.need': 'Нужно набрать {n} звёзд',

  'settings.title': 'НАСТРОЙКИ',
  'settings.music': 'Музыка',
  'settings.sfx': 'Звуки',
  'settings.vibration': 'Вибрация',
  'settings.quality': 'Графика',
  'settings.quality.low': 'Низкая',
  'settings.quality.high': 'Высокая',
  'settings.quality.hint': 'Применится при смене экрана',
  'settings.fps': 'Показывать FPS',
  'settings.language': 'Язык',
  'settings.about': 'Об игре',
  'settings.reset': 'Сбросить прогресс',
  'settings.reset.confirm': 'Весь прогресс, скины и настройки будут удалены. Продолжить?',
  'settings.reset.yes': 'Сбросить',
  'settings.reset.done': 'Прогресс сброшен',

  'about.title': 'Об игре',
  'about.stage': 'Этап 1: интерфейс. Игровой процесс появится в следующем этапе.',
  'about.tech': 'Phaser 3 · TypeScript · Vite · Capacitor',

  'pause.title': 'ПАУЗА',
  'pause.resume': 'Продолжить',
  'pause.restart': 'Заново',
  'pause.exit': 'В меню',

  'game.stub': 'Игровой движок будет добавлен на этапе 2',
  'game.attempt': 'Попытка {n}',

  'difficulty.easy': 'Лёгкий',
  'difficulty.normal': 'Обычный',
  'difficulty.hard': 'Сложный',
  'difficulty.harder': 'Очень сложный',
  'difficulty.insane': 'Безумный',
  'difficulty.demon': 'Демон',

  'skin.classic': 'Классик',
  'skin.smile': 'Улыбка',
  'skin.angry': 'Злюка',
  'skin.cool': 'Крутой',
  'skin.cat': 'Котик',
  'skin.cyclops': 'Циклоп',
  'skin.knockout': 'Нокаут',
  'skin.sleepy': 'Соня',
  'skin.robot': 'Робот',
  'skin.triplet': 'Трио',
  'skin.skull': 'Череп',
  'skin.stellar': 'Звёздный',

  'trail.none': 'Без шлейфа',
  'trail.fire': 'Огонь',
  'trail.ice': 'Лёд',
  'trail.pixel': 'Пиксели',
  'trail.toxic': 'Токсин',
  'trail.rainbow': 'Радуга',
};

const en: Dict = {
  'common.back': 'Back',
  'common.cancel': 'Cancel',
  'common.ok': 'OK',
  'preload.tap': 'TAP TO START',
  'preload.loading': 'Loading...',
  'menu.play': 'PLAY',
  'menu.skins': 'Skins',
  'menu.settings': 'Settings',
  'toast.exit': 'Press again to exit',

  'levels.title': 'LEVELS',
  'levels.best': 'Best',
  'levels.locked': 'Complete the previous level',
  'levels.play': 'PLAY',
  'levels.completed': 'Completed',

  'skins.title': 'GARAGE',
  'skins.tab.cubes': 'Cubes',
  'skins.tab.colors': 'Colors',
  'skins.tab.trails': 'Trails',
  'skins.primary': 'Primary color',
  'skins.secondary': 'Face color',
  'skins.need': 'Collect {n} stars to unlock',

  'settings.title': 'SETTINGS',
  'settings.music': 'Music',
  'settings.sfx': 'Sound FX',
  'settings.vibration': 'Vibration',
  'settings.quality': 'Graphics',
  'settings.quality.low': 'Low',
  'settings.quality.high': 'High',
  'settings.quality.hint': 'Applies on the next screen',
  'settings.fps': 'Show FPS',
  'settings.language': 'Language',
  'settings.about': 'About',
  'settings.reset': 'Reset progress',
  'settings.reset.confirm': 'All progress, skins and settings will be erased. Continue?',
  'settings.reset.yes': 'Reset',
  'settings.reset.done': 'Progress reset',

  'about.title': 'About',
  'about.stage': 'Stage 1: user interface. Gameplay arrives in the next stage.',
  'about.tech': 'Phaser 3 · TypeScript · Vite · Capacitor',

  'pause.title': 'PAUSED',
  'pause.resume': 'Resume',
  'pause.restart': 'Restart',
  'pause.exit': 'Menu',

  'game.stub': 'The game engine arrives in stage 2',
  'game.attempt': 'Attempt {n}',

  'difficulty.easy': 'Easy',
  'difficulty.normal': 'Normal',
  'difficulty.hard': 'Hard',
  'difficulty.harder': 'Harder',
  'difficulty.insane': 'Insane',
  'difficulty.demon': 'Demon',

  'skin.classic': 'Classic',
  'skin.smile': 'Smile',
  'skin.angry': 'Grumpy',
  'skin.cool': 'Cool',
  'skin.cat': 'Kitty',
  'skin.cyclops': 'Cyclops',
  'skin.knockout': 'Knockout',
  'skin.sleepy': 'Sleepy',
  'skin.robot': 'Robot',
  'skin.triplet': 'Triplet',
  'skin.skull': 'Skull',
  'skin.stellar': 'Stellar',

  'trail.none': 'No trail',
  'trail.fire': 'Fire',
  'trail.ice': 'Ice',
  'trail.pixel': 'Pixels',
  'trail.toxic': 'Toxic',
  'trail.rainbow': 'Rainbow',
};

const dictionaries: Record<Language, Dict> = { ru, en };

let current: Language = 'ru';

export function detectLanguage(): Language {
  const nav = (navigator.language || 'en').toLowerCase();
  return ['ru', 'kk', 'uk', 'be'].some((p) => nav.startsWith(p)) ? 'ru' : 'en';
}

export function setLanguage(lang: Language): void {
  current = lang;
}

export function getLanguage(): Language {
  return current;
}

/** Translate a key. Placeholders look like {n}. Unknown keys return the key itself (easy to spot). */
export function t(key: string, vars?: Record<string, string | number>): string {
  let s = dictionaries[current][key] ?? dictionaries.en[key] ?? key;
  if (vars) for (const k of Object.keys(vars)) s = s.replace(`{${k}}`, String(vars[k]));
  return s;
}
