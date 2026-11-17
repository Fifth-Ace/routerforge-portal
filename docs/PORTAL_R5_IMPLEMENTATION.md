# RouterForge Portal R5 — implementation & handoff (2026-11-17)

## Доставлено / реализация

* Встроенный «Центр управления»: 1 точка входа в Keenetic, 1 в footer popup. Разделы «Обзор» и «Приложения» в одной странице.
* Popup: переключатель «Приложения / Серверы»; список серверов и последних известных статусов без фоновых запросов из popup; HTTP RTT, а не ICMP.
* Мастер создания сервера: имя, местоположение, первая 3x-ui панель с полным HTTPS URL, monitor-токен + мастер-пароль Vault. Существующие записи остаются в реестре v1 без миграции с потерями.
* 3x-ui: `GET /panel/api/server/status` с Bearer monitor-token или manual сессией уже открытой панели; CPU/RAM/диск/Xray/total netIO, HTTP RTT. Частота 1/2/5 минут через chrome.alarms, с явным opt-in.
* Monitored raw counters `netIO.up/down`: вычисляются производные B/s из двух снимков, учитываются reset/устаревшие пары. Не называются «пингом» или абсолютной скоростью без дельты.
* Worker: 3 одновременных запросa максимум, timeout 8 s, no redirects, no cookies, optional site permission. Monitor-token хранится в `chrome.storage.session` после opt-in, максимум 1 час или до отключения/перезапуска браузера/явной блокировки Vault; **не** в local/sync. Нужен запущенный Chrome; не является 24/7.
* Persistent `chrome.storage.local` snapshot и максимум 72 коротких записи истории на app, не включают token, user/pass, 3x-ui base path, UUID, клиентов.
* Управление вручную через другой admin-токен в Vault: `GET /panel/api/inbounds/list` (санитизированный summary) и `POST /panel/api/server/restartXrayService` (после ввода имени сервера). Monitor-token не имеет доступа к этим действиям. Изменение/удаление клиентов и inbound намеренно не активированы без контрактных тестов на версии живой панели.
* Экспорт профилей намеренно теряет секретные пути 3x-ui (адрес будет вида https://host:port/), поэтому после импорта нужно вновь ввести полный URL панели. Исходный локальный реестр не меняется. Зашифрованный Vault экспортируется отдельно.
* Редактирование URL, удаление приложения/сервера, импорт профилей сбрасывают фоновые credentials до изменения привязки. Административные токены никогда не пересылаются background monitor.

## Разграничения и ограничения

* В стандартном Chrome расширении ICMP недоступен. `HTTP RTT` — время ответа API; это не ping. Для ICMP/TCP/TLS в будущем нужен отдельный Observer, которого нет в R5.
* Реальный 24/7 при выключенном Chrome или ПК невозможен. Observer вынесен за пределы R5: **не развернут, не изменяет RouterForge Core и Keenetic**.
* Старый 3x-ui/форк может не поддерживать scoped monitor tokens или эти endpoints. R5 сообщает `UNSUPPORTED`/`API_AUTH_REQUIRED`, не предполагает совместимость.
* Vault может истечь после 10 мин бездействия в UI, однако ранее явно предоставленная background-сессия живёт не больше 1 часа; при **ручной** блокировке Vault ключи фонового опроса отзываются немедленно. Закрытие вкладки само по себе их не отзывает.
* `chrome.storage.local` по-прежнему хранит исходный URL для открытия панели. Secret path не экспортируется автоматически, но **локальный реестр не зашифрован**. Для защиты от локального доступа к профилю Chrome требуется отдельное проектное изменение и стратегия миграции.
* Режим в Firefox/userscript не обещает тот же фон: worker/alarms/permissions зависят от платформы. Поведение CWS требует проверки перед магазином.
* Живые 3x-ui/VPS не проверялись, тесты с mock JSON и в Chromium fixture. Ни релиз, ни push, ни работа с роутером/VPS не разрешены данным пакетом.

## QA & безопасность

Тесты `tests/portal5.test.js`: экспорт secret-path, санитизация snapshot, RTT/stale, rates, admin allowlist, restart POST, background mocked worker opt-in/disable и отсутствие токена в local. Плюс предыдущие P10–P13 и проектные gates в локальном CLI runner.

## API sources
* https://docs.sanaei.dev/docs/reference/api/server/
* https://docs.sanaei.dev/docs/reference/api/inbounds/
* https://docs.sanaei.dev/docs/reference/api/authentication/
* https://docs.sanaei.dev/ru/docs/reference/api/api-tokens/
* https://docs.sanaei.dev/docs/config/panel/
* https://developer.chrome.com/docs/extensions/reference/api/alarms
