# Установка RouterForge Portal — Chrome, Edge, Opera и Firefox

**Официальный сайт:** https://fifth-ace.github.io/routerforge-portal/  
**Chrome Web Store:** https://chromewebstore.google.com/detail/ikghhhcbgfepddcjammfhaeomohfajij  
**GitHub Release (ручной канал):** https://github.com/Fifth-Ace/routerforge-portal/releases/tag/v0.10.3

## Google Chrome — рекомендуемый способ

1. Открой [RouterForge Portal в Chrome Web Store](https://chromewebstore.google.com/detail/ikghhhcbgfepddcjammfhaeomohfajij).
2. Нажми **«Установить»** и подтверди разрешения браузера.
3. Войди в Keenetic / NETCRAZE, открой Portal и разреши доступ только к доверенному адресу своего роутера.

Обновления установленного из магазина расширения доставляет Chrome Web Store. Включать режим разработчика и распаковывать ZIP **не нужно**.

## Microsoft Edge и Opera — ручной канал

1. Скачай [Chromium ZIP v0.10.3](https://github.com/Fifth-Ace/routerforge-portal/releases/download/v0.10.3/routerforge-portal-chromium-v0.10.3.zip) и сверь SHA-256 по файлу `SHA256SUMS.txt` релиза.
2. Распакуй в постоянную папку; в корне должен лежать `manifest.json`.
3. Открой `edge://extensions` или `opera://extensions`, включи режим разработчика и выбери **«Загрузить распакованное»**.
4. Открой WebUI роутера и выдай доступ только к нужному адресу.

## Mozilla Firefox — userscript

Установи Tampermonkey или Violentmonkey, затем [RouterForge Portal userscript](https://github.com/Fifth-Ace/routerforge-portal/releases/download/v0.10.3/routerforge-portal.user.js) и подтверди установку в менеджере. `UNSIGNED-DEV.xpi` из GitHub — **только для временных проверок**, а не для постоянной установки.

## Обновление с локальной ZIP-копии

Перед переходом на магазинную сборку экспортируй профили в JSON. Локальная и магазинная версии имеют разные браузерные ID и не разделяют хранилище. Не запускай обе одновременно на одной странице — появится дубль меню.

Если уже используешь ZIP-версию в Edge/Opera, сохраняй папку и вручную обновляй её содержимое после резервного копирования. После импорта профилей при необходимости выбери в Portal «Разрешить доступ и обновить вкладку».

**Безопасность:** Portal не собирает пароли и не требует отправлять адреса роутера разработчику. Предоставляй разрешения только доверенным локальным адресам.
