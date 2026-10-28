# RouterForge Portal v0.10.2 — единый интерфейс Chrome и Tampermonkey

## Что изменилось

- Настройки Tampermonkey теперь открывают **ту же встроенную страницу настроек Keenetic**, что и Chromium-расширение, вместо отдельной устаревшей панели.
- Окно первого подключения и резервных копий обновлено: нормальная типографика, крупные элементы, адаптивная компоновка, компактные интеграции. Подробные поля каталога раскрываются по запросу.
- Устаревшее поле «85%» удалено из интерфейса userscript. Значения старых профилей сохраняются исключительно ради совместимости, но **не используются для автоматической геометрии**.
- При создании первого профиля userscript переходит к штатному App Center; существующие адреса, приложения, избранное, порядок и режимы открытия сохраняются.
- Исправлены отображаемые версии в панели и привязки автотестов.

## Доступные способы установки

- Chrome / Edge / Opera: Chromium MV3 ZIP.
- Tampermonkey / Violentmonkey: `routerforge-portal.user.js` и `.meta.js`.
- Firefox: userscript; неподписанный XPI включён **только для временного тестирования**.

Параметры роутера, RouterForge Core, KeeneticOS и Entware не изменяются. Не включай одновременно userscript и нативное расширение на одной вкладке.

---

## English (secondary)

Tampermonkey now opens the **same in-Keenetic settings UI** as the Chromium extension, with a refreshed onboarding and backup dialog. Advanced catalog fields are collapsed; legacy 85% values remain only for config compatibility and are not used by automatic layout geometry. Existing profiles and app preferences remain intact. Chromium, userscript, and unsigned Firefox development XPI are shipped; no router changes.
