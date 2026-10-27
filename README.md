# RouterForge Portal

**Единый WebUI для приложений Keenetic / Netcraze.** Часть независимой экосистемы [RouterForge](https://github.com/Fifth-Ace/routerforge).

RU · [English](README_EN.md) · [Telegram](https://t.me/RouterForge)

## Установка — сначала GitHub, без магазинов

| Браузер | Рекомендуемая установка | Альтернатива |
| --- | --- | --- |
| Chrome | [Tampermonkey](https://www.tampermonkey.net/) → `routerforge-portal.user.js` | Chromium ZIP (Load unpacked) |
| Microsoft Edge | Tampermonkey → `routerforge-portal.user.js` | Chromium ZIP (Load unpacked) |
| Opera | Tampermonkey/Violentmonkey → `routerforge-portal.user.js` | Chromium ZIP (Developer mode) |
| Firefox | Tampermonkey/Violentmonkey → `routerforge-portal.user.js` | Только временная DEV-сборка XPI (без подписи) |

**Установить Userscript:** после публикации первого релиза открой ссылку:

`https://github.com/Fifth-Ace/routerforge-portal/releases/latest/download/routerforge-portal.user.js`

**Загрузки:** https://github.com/Fifth-Ace/routerforge-portal/releases

Пока репозиторий и первый релиз не созданы, ссылки выше не активны. Для Chromium ZIP распакуй архив в постоянную папку и выбери её на странице `chrome://extensions` / `edge://extensions` / `opera://extensions` через **Load unpacked**.

Полная установка RU/EN: [docs/INSTALL-RU.md](docs/INSTALL-RU.md), [docs/INSTALL-EN.md](docs/INSTALL-EN.md).

## Возможности

- Приложения Keenetic / Entware внутри родного WebUI либо в отдельной вкладке.
- Каталог RouterForge, AWG Manager, NFQWS, NeoFit, AdGuard Home, XKeen UI.
- Изменение адресов/портов, несколько роутеров, темы и RU/EN.
- Без установки чего-либо на роутер и без фонового сканирования сети.
- Появление интерфейса Portal только после входа в Keenetic.

**Не включай одновременно userscript и нативную версию Portal для одного роутера** — меню продублируется. Настройки между ними переносятся через импорт/экспорт JSON.

## Безопасность и обновления

- Userscript работает на ограниченных локальных адресах и вызывает только разрешённые функции менеджера скриптов. `@updateURL` и `@downloadURL` указывают на GitHub Releases, поэтому обновления начнут работать после первого релиза. Автообновление userscript *не* проверяет криптографическую аттестацию GitHub.
- Chromium ZIP устанавливается как распакованное расширение. Оно проверяет релизы; самостоятельная замена собственного кода браузером запрещена. Ручное обновление — с проверкой SHA-256 и attestation для онлайн-установщика.
- Нативный Firefox XPI пока только UNSIGNED DEV для временного теста; для обычной постоянной установки нужна подпись Mozilla.
- GitHub Actions: один исходный код → общий CI → две пользовательские сборки + Firefox DEV → attestations + GitHub Release.

[SECURITY.md](SECURITY.md) · [PRIVACY.md](PRIVACY.md) · [Лицензия MIT](LICENSE).

Это независимый некоммерческий проект; неофициальное расширение Keenetic/Netcraze.
