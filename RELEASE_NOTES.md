# RouterForge Portal v0.10.1 — импорт профилей и возвращение каналов

## Исправления
- После импорта конфигурации Portal отличает сохранённый профиль от действующего разрешения браузера.
- При отсутствии разрешения показывает понятную причину и кнопку «Разрешить доступ и обновить вкладку»; разрешение запрашивается только по нажатию пользователя.
- После согласия синхронизирует content scripts и обновляет вкладку Keenetic. Приложения и настройки остаются на месте.

## Платформы
- Chrome / Microsoft Edge / Opera: нативный Chromium ZIP (MV3).
- Tampermonkey / Violentmonkey: userscript и metadata.
- Firefox: XPI **UNSIGNED-DEV**, временная тестовая установка, не подписанная постоянная версия.

Никаких изменений в RouterForge Core, KeeneticOS и Entware. Production-выпуск после полного CI, проверки хешей и подписей на GitHub Actions.

---

## English (secondary)
Import permission repair: detect missing browser site grants, request access only on user action and reload the tab. Restore multichannel build artifacts: Chromium MV3, userscript + metadata, and unsigned Firefox development XPI (not a permanently installable signed release). No router changes.