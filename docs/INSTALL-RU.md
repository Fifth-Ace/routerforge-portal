# RouterForge Portal — установка (v0.9.0)

**До первого GitHub Release прямые ссылки на установки неактивны; после публикации используйте ссылки из README.**

## Chrome / Edge
1. Скачай `routerforge-portal-chromium-v0.9.0.zip`, распакуй в постоянную папку.
2. Открой `chrome://extensions` / `edge://extensions`, включи режим разработчика.
3. Нажми «Загрузить распакованное расширение» и выбери папку с `manifest.json`.
4. Подключи профиль Keenetic в окне Portal; для настройки роутера потребуется согласие на доступ к его адресу.

## Opera
**Вариант A:** установи Tampermonkey или Violentmonkey и открой файл `routerforge-portal.user.js`. Это рекомендуемый путь без магазина RouterForge.
**Вариант B:** распакуй `routerforge-portal-chromium-v0.9.0.zip`, открой `opera://extensions`, включи Developer Mode, затем Load unpacked и выбери папку с `manifest.json`.

## Firefox
**Рекомендуемый путь:** установи Tampermonkey или Violentmonkey для Firefox, открой файл `routerforge-portal.user.js`, подтверди установку.
**Нативный тест:** `routerforge-portal-firefox-UNSIGNED-DEV-v0.9.0.xpi` создан только для тестов через `about:debugging` → This Firefox → Load Temporary Add-on. Пропадёт после перезапуска. Обычная постоянная установка Firefox потребует Mozilla-подписанный XPI (даже при размещении на GitHub).

## Общее: настройка и ограничения
- Userscript и нативный extension хранят конфигурации отдельно. Переносится через экспорт/импорт JSON.
- **Не включай оба варианта одновременно в одном браузере для одного Keenetic** — они будут дублировать интерфейс.
- Интерфейс активен лишь после входа в штатный WebUI; приложение не устанавливает службы на роутер.
- Для неизвестных доменных имён локальной сети нужно расширить правила соответствия URL в самом userscript, либо пользоваться нативным расширением с отдельным разрешением на хост.
- `@updateURL` и `@downloadURL` начнут работать только после первого опубликованного GitHub Release с `.meta.js` и `.user.js`. Пользовательский менеджер проверяет обновления, но не удостоверяет GitHub Attestation: доверие к аккаунту и выпуску остаётся важным.
- Все встроенные сервисы должны допускать iframe. Если сайт запрещает встраивание, открывай его отдельно; защитные заголовки не удаляются.

Источники: https://github.com/ilyhalight/voice-over-translation (схема распространения); https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background (Firefox MV3); https://help.opera.com/en/extensions/testing/ (Opera).
