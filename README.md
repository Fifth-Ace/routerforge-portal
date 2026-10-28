<div align="center">

<a href="https://github.com/Fifth-Ace/routerforge"><img src="https://raw.githubusercontent.com/Fifth-Ace/routerforge/main/docs/assets/routerforge-banner.jpg" alt="RouterForge — фирменный баннер проекта" width="100%"></a>

# RouterForge Portal

**Один интерфейс для веб-приложений Keenetic / Netcraze. Прямо в браузере.**

Добавляй AWG Manager, RouterForge Core, nfqws и другие панели в привычное меню роутера — без установки дополнительного ПО на сам Keenetic.

[**🇷🇺 Русский**](README.md) · [**🇬🇧 English**](README_EN.md)

[![Release](https://img.shields.io/github/v/release/Fifth-Ace/routerforge-portal?style=flat-square&label=release&color=38bdf8)](https://github.com/Fifth-Ace/routerforge-portal/releases/latest)
[![CI](https://img.shields.io/github/actions/workflow/status/Fifth-Ace/routerforge-portal/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/Fifth-Ace/routerforge-portal/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/Fifth-Ace/routerforge-portal?style=flat-square)](LICENSE)
![Chrome / Edge / Opera](https://img.shields.io/badge/Chrome%20%7C%20Edge%20%7C%20Opera-v0.10.1-24313d?style=flat-square)

### [📦 Скачать v0.10.1 для всех каналов](https://github.com/Fifth-Ace/routerforge-portal/releases/latest) · [💬 Telegram](https://t.me/RouterForge)

[Возможности](#возможности) · [Установка](#установка) · [Скриншоты](#как-выглядит) · [FAQ](#частые-вопросы)

</div>

---

## Что это такое?

**RouterForge Portal** объединяет веб-панели установленных на роутере сервисов в одном месте. Он добавляет раздел приложений в интерфейс Keenetic, предлагает каталог известных интеграций и запоминает адреса, порты и выбранный способ открытия.

> [!IMPORTANT]
> Portal **не устанавливает** приложения на роутер и **не заменяет** штатную панель Keenetic. Управляемый сервис должен быть установлен и доступен отдельно.

## Установка — актуальная версия v0.10.1 (Chromium)

**Каналы v0.10.1:** Chrome, Edge и Opera — Chromium MV3 ZIP; Tampermonkey/Violentmonkey — userscript для поддерживаемых браузеров; Firefox — userscript или неподписанный XPI **только для временного тестирования** (не постоянная установка).

1. [Скачай Chromium ZIP v0.10.1](https://github.com/Fifth-Ace/routerforge-portal/releases/download/v0.10.1/routerforge-portal-chromium-v0.10.1.zip).
2. Распакуй архив в постоянную папку.
3. В `chrome://extensions`, `edge://extensions` или `opera://extensions` включи режим разработчика и выбери **«Загрузить распакованное расширение»**.
4. Открой NETCRAZE/Keenetic, авторизуйся и разреши Portal доступ к адресу роутера по запросу браузера. После импорта JSON нажми «Разрешить доступ и обновить вкладку», если разрешение не восстановлено.

**Другие платформы:** в релизе находятся `routerforge-portal.user.js` и `.meta.js` для Tampermonkey/Violentmonkey, а также `routerforge-portal-firefox-UNSIGNED-DEV-v0.10.1.xpi` (только временные тесты). Не включай userscript одновременно с расширением на одном роутере.

**Обновление с v0.9.0:** сначала экспортируй JSON-настройки. Сохраняй ту же папку установленного расширения и нажимай **«Обновить»**; не удаляй прежний экземпляр до проверки профилей. Старый релиз `v0.9.0` (включая его userscript) остаётся [в истории выпусков](https://github.com/Fifth-Ace/routerforge-portal/releases/tag/v0.9.0), и не изменяется при публикации v0.10.1.

**[Подробная инструкция](docs/INSTALL-RU.md)** · [English guide](docs/INSTALL-EN.md).

## Как выглядит

<p align="center">
  <a href="docs/screenshots/portal-live-demo.gif"><img src="docs/screenshots/portal-live-demo.gif" alt="RouterForge Portal внутри NETCRAZE/Keenetic: RouterForge Core, nfqws2 и AWG Manager" width="100%"></a>
</p>
<p align="center"><sub>Десять настоящих скриншотов NETCRAZE Ultra, предоставленных пользователем: настройки Portal, RouterForge Core, nfqws2, AWG Manager и каталог. Приложения открыты внутри штатной панели NETCRAZE/Keenetic. Анимация циклическая; нажми на изображение, чтобы открыть крупнее.</sub></p>

## Возможности

| | Что умеет |
|:---|:---|
| 🧩 **Единое меню** | Добавляет пункт приложений в штатный WebUI Keenetic после входа в систему. |
| 📚 **Готовый каталог** | RouterForge Core, AWG Manager, nfqws-keenetic-web, nfqws2-ui, NeoFit, AdGuard Home, XKeen UI. |
| 🛠️ **Свои сервисы** | Любые другие веб-панели по адресу и порту; можно настроить несколько роутеров. |
| 🪟 **Два режима** | Встроенная область в Keenetic или отдельная вкладка. Если iframe запрещён CSP/X-Frame-Options, используй вкладку. |
| 🎨 **Оформление** | Светлая и тёмная темы, русский и английский язык. |
| 💾 **Профили** | Локальные настройки, импорт и экспорт JSON. |
| 🗂️ **Workspace** | До трёх живых вкладок без перезагрузки, избранное и группы приложений, встроенные настройки. |
| 📐 **Адаптивность** | Автоматически следует границам штатного WebUI при изменении размера окна. |
| 🔄 **Обновления** | Нативное расширение обновляется вручную, без скрытой установки кода. |

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

Для исторической версии v0.9.0 менеджер userscript мог проверять обновления через GitHub Releases. Это **не** означает автоматическую проверку GitHub Attestation. Для нативной версии не предусмотрено скрытой установки нового кода; проверяй контрольные суммы релизных файлов и обновляй папку расширения вручную. [Подробнее о безопасности](SECURITY.md).
</details>

## Приватность и разработка

Portal хранит профили в браузере, не запрашивает пароли Keenetic, не сканирует сеть и не отправляет телеметрию разработчикам. Сетевой запрос к GitHub для проверки обновлений нативной версии выполняется только по кнопке пользователя. **[Политика приватности](PRIVACY.md)** · **[Сообщить о проблеме](https://github.com/Fifth-Ace/routerforge-portal/issues)**.

Открытый исходный код · [MIT License](LICENSE) · [Проект RouterForge](https://github.com/Fifth-Ace/routerforge) · [Telegram](https://t.me/RouterForge)

<sub>RouterForge Portal — независимое неофициальное дополнение для Keenetic / Netcraze, не связанное с производителями устройств.</sub>
