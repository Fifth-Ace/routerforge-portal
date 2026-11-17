# 🚀 RouterForge Portal v1.0.0 — первый стабильный выпуск

**Первый стабильный RouterForge Portal** — расширение для работы с приложениями Keenetic, локальными сервисами и внешними серверами. Для Portal не требуется установка компонентов на роутер, RouterForge Core или обязательный облачный аккаунт.

## 🌐 Распространение

- **Chrome Web Store:** расширение Portal уже представлено в магазине для совместимых Chromium-браузеров (Chrome, Edge, Brave, Opera, Vivaldi). Обновление **1.0.0** будет появляться по мере прохождения отдельной модерации магазина.
- **Mozilla Firefox Add-ons:** версия 1.0.0 готовится к отправке на проверку Mozilla; наличие неподписанного XPI среди GitHub-артефактов не означает одобрения AMO.
- **Tampermonkey / Violentmonkey:** отдельный userscript с интеграцией веб-приложений в Keenetic WebUI; установка и обновления выполняются через менеджер пользовательских скриптов. Функции Vault/мониторинга внешних серверов относятся к браузерному расширению, не обещаются в userscript.
- **GitHub:** проверенные пакеты, userscript, исходники, SHA256 и материалы релиза.

## 🖥️ Keenetic WebUI

- Встраивание веб-приложений в интерфейс Keenetic без установки пакетов на устройство.
- Поддержка нескольких роутеров и независимых профилей.
- Боковое меню приложений и подключённых серверов; доступ к последним сохранённым показателям серверов.
- Рабочие вкладки, избранное, группы, поиск, недавние приложения.
- Каталог сервисов Keenetic/Entware, быстрое добавление и редактирование приложений.
- Автоматическая подгонка под доступную область WebUI; переключение ширины и ручная калибровка.
- Выбор способа открытия: встроенная панель или отдельная вкладка (с учётом CSP/X-Frame-Options сайта).

## 🖧 Серверы и 3x-ui

- Локальные и удалённые серверы, несколько веб-панелей на сервер, нестандартные порты и полные URL.
- Автоматическая привязка подходящих панелей к серверам, отдельные доступы и действия управления.
- Мониторинг 3x-ui: HTTP RTT, CPU, RAM, диск, состояние Xray и доступные показатели сетевого трафика.
- Ручная диагностика, сохранение снимков, автоматические проверки по явному согласию с интервалом 1–60 минут.
- Отдельные сообщения об ошибках сети, прав доступа, API и авторизации.

## 🔐 Данные и безопасность

- Локальный **Portal Vault** с мастер-паролем для учётных данных и API-токенов.
- Привязка секретов к определённому origin/пути; по возможности предпочтение HTTPS.
- Единый защищённый резервный файл: профили Keenetic, приложения, серверы, веб-панели, настройки и зашифрованный Vault.
- Защита бэкапа PBKDF2-SHA256 + AES-256-GCM; разделение пароля бэкапа и мастер-пароля Vault.
- Отсутствие обязательной облачной синхронизации; внешние проверки только с согласия пользователя и в пределах разрешений браузера.

## 🎨 Интерфейс

- Общая навигация приложений и серверов, компактный popup, адаптивные карточки.
- Русский и английский интерфейс, светлая/тёмная/системная темы.
- Сохранение пользовательских предпочтений и совместимость с предыдущими профилями.

**Важно:** обновляйте существующее установленное расширение без удаления: Chrome хранит профиль, токены и Vault локально по идентификатору расширения. Не загружайте неподписанный Firefox XPI как готовый публичный пакет.

Спасибо всем, кто поддерживает RouterForge! ❤️

---

# 🇬🇧 RouterForge Portal v1.0.0 — First Stable Release

RouterForge Portal is now ready for its first stable release: a browser-based dashboard for Keenetic WebUI applications, local services and remote servers. No mandatory router-side software, RouterForge Core installation or cloud account is required.

## Availability

- **Chrome Web Store:** Portal is listed for compatible Chromium-based browsers (Chrome, Edge, Brave, Opera, Vivaldi). The **1.0.0 update** will become available after the store review process.
- **Mozilla Firefox Add-ons:** Version 1.0.0 is being prepared for AMO submission. The GitHub unsigned XPI is a development candidate, not an AMO-approved signed add-on.
- **Tampermonkey / Violentmonkey:** Dedicated Keenetic WebUI userscript with installation and updates through userscript managers. Extension-only Vault and remote monitoring features are not claimed for the userscript.

## Highlights

- **Keenetic integration:** embedded panels, multiple router profiles, navigation, categories, favorites, search, recent applications, workspace tabs and panel calibration.
- **Servers and web apps:** local and remote servers, multiple web panels, full paths and ports, server shortcuts in Keenetic WebUI.
- **3x-ui monitoring:** HTTP RTT, CPU, RAM, disk, Xray and available network stats; opt-in polling at 1–60-minute intervals.
- **Portal Vault:** local encrypted credentials and API tokens protected by a master password and scoped to the intended origin/path.
- **Full encrypted backup:** Keenetic profiles, applications, servers, web panels, preferences and Vault (PBKDF2-SHA256 + AES-256-GCM).
- **Unified UI:** responsive cards and navigation, compact popup, Russian/English localization and theme support.

**Important:** Update your existing extension instead of uninstalling it to retain browser-local data. The unsigned Firefox development XPI is not a store-ready signed release.
