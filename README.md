<div align="center">

<a href="https://github.com/Fifth-Ace/routerforge"><img src="https://raw.githubusercontent.com/Fifth-Ace/routerforge/main/docs/assets/routerforge-banner.jpg" alt="RouterForge — фирменный баннер проекта" width="100%"></a>

# RouterForge Portal

**Один интерфейс для веб-приложений Keenetic / Netcraze. Прямо в браузере.**

Добавляй AWG Manager, RouterForge Core, nfqws и другие панели в привычное меню роутера — без установки дополнительного ПО на сам Keenetic.

[**🇷🇺 Русский**](README.md) · [**🇬🇧 English**](README_EN.md)

[![Release](https://img.shields.io/github/v/release/Fifth-Ace/routerforge-portal?style=flat-square&label=release&color=38bdf8)](https://github.com/Fifth-Ace/routerforge-portal/releases/latest)
[![CI](https://img.shields.io/github/actions/workflow/status/Fifth-Ace/routerforge-portal/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/Fifth-Ace/routerforge-portal/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/Fifth-Ace/routerforge-portal?style=flat-square)](LICENSE)
![Chrome / Edge / Opera / Firefox](https://img.shields.io/badge/Chrome%20%7C%20Edge%20%7C%20Opera%20%7C%20Firefox-supported%20channels-24313d?style=flat-square)

### [📦 Скачать расширение](https://github.com/Fifth-Ace/routerforge-portal/releases/latest) · [⚡ Установить через Tampermonkey](https://github.com/Fifth-Ace/routerforge-portal/releases/latest/download/routerforge-portal.user.js) · [💬 Telegram](https://t.me/RouterForge)

[Возможности](#возможности) · [Установка](#установка) · [Скриншоты](#как-выглядит) · [FAQ](#частые-вопросы)

</div>

---

## Что это такое?

**RouterForge Portal** объединяет веб-панели установленных на роутере сервисов в одном месте. Он добавляет раздел приложений в интерфейс Keenetic, предлагает каталог известных интеграций и запоминает адреса, порты и выбранный способ открытия.

> [!IMPORTANT]
> Portal **не устанавливает** приложения на роутер и **не заменяет** штатную панель Keenetic. Управляемый сервис должен быть установлен и доступен отдельно.

## Установка

### Вариант 1 — Tampermonkey / Violentmonkey (проще всего)

Работает в **Chrome, Edge, Opera и Firefox** через совместимый менеджер пользовательских скриптов.

1. Установи [Tampermonkey](https://www.tampermonkey.net/) или [Violentmonkey](https://violentmonkey.github.io/).
2. Открой **[routerforge-portal.user.js — установить скрипт](https://github.com/Fifth-Ace/routerforge-portal/releases/latest/download/routerforge-portal.user.js)** и подтверди установку в менеджере. Если браузер просто скачал файл, импортируй его через панель менеджера.
3. Открой WebUI Keenetic и войди в систему. Portal появится после авторизации. Настроить интеграции можно через меню Tampermonkey / Violentmonkey.

> [!NOTE]
> В актуальном Chromium для Tampermonkey может потребоваться опция **«Разрешить пользовательские скрипты» (Allow User Scripts)** в настройках расширения. Также могут потребоваться настройки режима разработчика — смотри документацию своего менеджера.

### Вариант 2 — обычное расширение Chrome / Edge / Opera

1. **[Скачай Chromium ZIP v0.9.0](https://github.com/Fifth-Ace/routerforge-portal/releases/download/v0.9.0/routerforge-portal-chromium-v0.9.0.zip)** и распакуй его в постоянную папку.
2. Открой `chrome://extensions`, `edge://extensions` или `opera://extensions` и включи **режим разработчика**.
3. Нажми **«Загрузить распакованное расширение» (Load unpacked)** и выбери папку, в которой находится `manifest.json`.
4. Открой Keenetic и разреши Portal доступ к нужному адресу роутера при запросе браузера.

**Firefox:** для обычного использования рекомендуем userscript. Файл `firefox-UNSIGNED-DEV.xpi` из релиза — только для временного тестирования через `about:debugging`, он **не подписан Mozilla** и не предназначен для постоянной установки.

**[Подробная инструкция на русском](docs/INSTALL-RU.md)** · [English installation guide](docs/INSTALL-EN.md) · [Все версии](https://github.com/Fifth-Ace/routerforge-portal/releases)

## Как выглядит

<p align="center"><a href="docs/screenshots/portal-preview.webp"><img src="docs/screenshots/portal-preview.webp" alt="RouterForge Portal — демонстрационные экраны RU/EN" width="100%"></a></p>
<p align="center"><sub>Скриншоты из Chromium с демонстрационным профилем Keenetic и Portal v0.9.0. Это не снимки реального роутера.</sub></p>

<details>
<summary><b>Больше скриншотов: русская и английская версии, каталог приложений</b></summary>

| Настройки — RU | Settings — EN |
|:---:|:---:|
| <a href="docs/screenshots/portal-settings-ru.webp"><img src="docs/screenshots/portal-settings-ru.webp" alt="Центр приложений RouterForge Portal" width="420"></a> | <a href="docs/screenshots/portal-settings-en.webp"><img src="docs/screenshots/portal-settings-en.webp" alt="RouterForge Portal Application Center" width="420"></a> |

<details><summary>Каталог интеграций крупнее</summary>

![Каталог интеграций RouterForge Portal](docs/screenshots/portal-catalog.webp)
</details>
</details>

## Возможности

| | Что умеет |
|:---|:---|
| 🧩 **Единое меню** | Добавляет пункт приложений в штатный WebUI Keenetic после входа в систему. |
| 📚 **Готовый каталог** | RouterForge Core, AWG Manager, nfqws-keenetic-web, nfqws2-ui, NeoFit, AdGuard Home, XKeen UI. |
| 🛠️ **Свои сервисы** | Любые другие веб-панели по адресу и порту; можно настроить несколько роутеров. |
| 🪟 **Два режима** | Встроенная область в Keenetic или отдельная вкладка. Если iframe запрещён CSP/X-Frame-Options, используй вкладку. |
| 🎨 **Оформление** | Светлая и тёмная темы, русский и английский язык. |
| 💾 **Профили** | Локальные настройки, импорт и экспорт JSON. |
| 🔄 **Обновления** | Userscript может получать обновления через менеджер скриптов; нативный ZIP обновляется вручную. |

## Частые вопросы

<details><summary><b>Нужно ли устанавливать RouterForge Core?</b></summary>

Нет. Portal — независимый проект. Для работы конкретной веб-панели соответствующий сервис должен быть установлен и доступен на роутере.
</details>
<details><summary><b>Почему приложение открывается в отдельной вкладке, а не внутри Keenetic?</b></summary>

Некоторые интерфейсы запрещают встраивание с помощью CSP или X-Frame-Options. Portal не отключает эти ограничения: выбери режим «Отдельно».
</details>
<details><summary><b>Можно ли использовать userscript и ZIP одновременно?</b></summary>

Не стоит: на одной странице появятся дублирующиеся меню. Выбери один канал; настройки между вариантами можно перенести экспортом/импортом JSON.
</details>
<details><summary><b>А автообновления и безопасность?</b></summary>

Менеджер userscript может проверять обновления по ссылкам GitHub Release. Это **не** означает автоматическую проверку GitHub Attestation. Для нативной версии не предусмотрено скрытой установки нового кода; проверяй контрольные суммы релизных файлов и обновляй папку расширения вручную. [Подробнее о безопасности](SECURITY.md).
</details>

## Приватность и разработка

Portal хранит профили в браузере, не запрашивает пароли Keenetic, не сканирует сеть и не отправляет телеметрию разработчикам. Сетевой запрос к GitHub для проверки обновлений нативной версии выполняется только по кнопке пользователя. **[Политика приватности](PRIVACY.md)** · **[Сообщить о проблеме](https://github.com/Fifth-Ace/routerforge-portal/issues)**.

Открытый исходный код · [MIT License](LICENSE) · [Проект RouterForge](https://github.com/Fifth-Ace/routerforge) · [Telegram](https://t.me/RouterForge)

<sub>RouterForge Portal — независимое неофициальное дополнение для Keenetic / Netcraze, не связанное с производителями устройств.</sub>
