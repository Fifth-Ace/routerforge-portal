# Установка RouterForge Portal 1.0.0

**Сайт:** https://fifth-ace.github.io/routerforge-portal/
**Chrome Web Store:** https://chromewebstore.google.com/detail/ikghhhcbgfepddcjammfhaeomohfajij
**Firefox Add-ons:** https://addons.mozilla.org/ru/firefox/addon/routerforge-portal/
**GitHub Release:** https://github.com/Fifth-Ace/routerforge-portal/releases/tag/v1.0.0

## Google Chrome — магазин

Открой [Portal в Chrome Web Store](https://chromewebstore.google.com/detail/ikghhhcbgfepddcjammfhaeomohfajij) и установи расширение. Магазин обновляет его самостоятельно. **Версия 1.0.0 в GitHub уже опубликована, но в магазине она может появиться позднее после проверки обновления.**

## Edge, Brave, Opera, Vivaldi — Chromium

Используй магазин Chrome Web Store, если браузер поддерживает этот способ. Для ручной установки скачай [Chromium ZIP v1.0.0](https://github.com/Fifth-Ace/routerforge-portal/releases/download/v1.0.0/routerforge-portal-chromium-v1.0.0.zip), проверь SHA256 по [SHA256SUMS](https://github.com/Fifth-Ace/routerforge-portal/releases/download/v1.0.0/SHA256SUMS.txt), распакуй в постоянную папку и выбери **Загрузить распакованное расширение** в режиме разработчика браузера. `manifest.json` должен быть в корне выбранной папки.

## Firefox — Mozilla Add-ons

Установи [RouterForge Portal из Mozilla Add-ons](https://addons.mozilla.org/ru/firefox/addon/routerforge-portal/). Firefox устанавливает подписанное дополнение и выполняет штатные обновления. XPI с пометкой `UNSIGNED-DEV` в GitHub — тестовый пакет.

## Tampermonkey / Violentmonkey

Установи менеджер скриптов и открой [routerforge-portal.user.js](https://github.com/Fifth-Ace/routerforge-portal/releases/download/v1.0.0/routerforge-portal.user.js). Userscript добавляет меню приложений в Keenetic WebUI. **Удалённые серверы, Vault и мониторинг 3x-ui доступны в нативном расширении**, а не в userscript.

## Обновление и безопасность

- **Не удаляй установленное расширение**, чтобы не потерять Chrome local storage.
- Перед переключением между магазинной и распакованной версиями создай **полный защищённый бэкап**: их идентификаторы и локальные хранилища могут различаться.
- Не запускай расширение и userscript одновременно на одной странице Keenetic.
- Предоставляй браузерные разрешения только доверенным адресам роутеров и серверов.
- Portal может хранить добавленные пользователем пароли и токены **в зашифрованном локальном Vault**, но не передаёт их разработчику. См. [политику приватности](../PRIVACY.md).
