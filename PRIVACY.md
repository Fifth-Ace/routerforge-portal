# RouterForge Portal 1.0.0 — конфиденциальность / Privacy

## Русский

RouterForge Portal — независимое браузерное расширение. Профили Keenetic, адреса веб-приложений, серверы, настройки интерфейса и последние снимки мониторинга сохраняются **локально в хранилище браузера**. Portal не требует облачного аккаунта и не отправляет пользовательскую базу данных разработчику для аналитики или синхронизации.

**Учётные данные:** если пользователь добровольно добавляет пароль или API-токен, Portal хранит его в **зашифрованном локальном Vault**, защищённом мастер-паролем. Поэтому утверждение, что Portal вообще не хранит пароли, неверно. Полный резервный файл может включать зашифрованные секреты; передавать его другим людям следует с осторожностью. Шифрование защищённого бэкапа использует PBKDF2-SHA256 и AES-256-GCM. Пароль бэкапа может отличаться от мастер-пароля Vault.

**Сетевые обращения:** приложение подключается к адресам Keenetic, локальным и внешним веб-панелям и API 3x-ui по выбору пользователя, с учётом разрешений браузера. Автоматический мониторинг включается пользователем и может отправлять API-токен соответствующему серверу для авторизованных запросов. Удалённые сервисы получают обычные сетевые метаданные подключения в соответствии с их собственными политиками. Проверка GitHub Releases выполняется по действию пользователя.

**Разделение каналов:** Tampermonkey/Violentmonkey обеспечивают интеграцию приложений в Keenetic WebUI; шифрованный Vault и мониторинг внешних серверов — функции нативного браузерного расширения.

## English

RouterForge Portal is an independent browser extension. Keenetic profiles, app URLs, server registry, UI preferences and last monitoring snapshots are kept **locally in browser storage**. No cloud account is required and no developer-operated analytics or sync service receives the user's workspace.

**Credentials:** when a user voluntarily saves a password or API token, it is stored in the **encrypted local Vault** protected by a master password. Portal may therefore store credentials locally, contrary to outdated descriptions. Full encrypted backups may contain encrypted credentials and should be shared carefully. Backup encryption uses PBKDF2-SHA256 and AES-256-GCM; the backup password can differ from the Vault master password.

**Network requests:** Portal contacts Keenetic devices and local/remote panels or 3x-ui APIs at the user's request and subject to browser host permissions. Opt-in monitoring can send the corresponding API token to the chosen server to authenticate requests. Remote providers may receive standard connection metadata under their own policies. GitHub release checks occur on explicit user action.

**Channel scope:** Tampermonkey/Violentmonkey support Keenetic WebUI app integration; encrypted Vault and remote server monitoring are native-extension features.
