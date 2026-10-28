# NeuroJump
Phaser 3 + TS + Vite + Capacitor.

## Запуск в браузере
npm install && npm run dev

## Сборка APK (локально, нужны JDK 17 + Android SDK)
npm install
npm run build
npx cap add android
# портретная ориентация:
sed -i 's/<activity /<activity android:screenOrientation="portrait" /' android/app/src/main/AndroidManifest.xml
npx cap sync android
cd android && ./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk

## Сборка APK в облаке (без Android Studio)
Залей папку в GitHub -> Actions -> Build APK -> скачай artifact NeuroJump-apk.

## Архитектура
src/config.ts       — константы/баланс
src/scenes/         — Boot, Menu, Game (новые экраны = новые сцены)
src/entities/       — Player (позже: враги, бонусы)
src/systems/        — PlatformSystem, InputSystem (логика отдельно от сцен)
src/services/       — Storage (позже: звук, реклама, лидерборд)
