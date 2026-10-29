# DashWorld — этап 1 (интерфейс)

Phaser 3 + TypeScript + Vite + Capacitor.

## Как получить APK через GitHub
1. Загрузите ВСЁ содержимое этого архива в репозиторий (включая папку `.github`).
2. Вкладка **Actions** → **Build APK** → **Run workflow** (запустится и сам после push).
3. Через ~5–8 минут: **Releases → DashWorld (latest build) → DashWorld.apk**. Откройте на телефоне и установите (разрешите «неизвестные источники»).

## Локально
`npm install && npm run dev`

## Структура src/
- `config/` константы · `core/` шина событий · `services/` аудио, сохранения, i18n, вибрация
- `data/` уровни, скины, темы (новый контент = новая запись) · `ui/` кнопки, панели, текстуры
- `game/` куб, параллакс-фон · `scenes/` экраны (Boot, Preload, Menu, LevelSelect, Skins, Settings, Game-заглушка)

Этап 2: игровой движок — в `scenes/GameScene.ts` и `game/`.
