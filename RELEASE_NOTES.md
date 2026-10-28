# RouterForge Portal v0.10.3 — исправление запуска userscript

## Исправлено

- Исправлена ошибка синтаксиса в сборке userscript v0.10.2: однострочный комментарий при удалении старого поля ширины скрывал код и отключал весь Portal в Tampermonkey/Violentmonkey.
- Каталог, современная встроенная панель настроек и ранее сохранённые профили остались без изменения.
- Включена обязательная проверка **собранного** файла routerforge-portal.user.js через node --check в генераторе, CI и Release. Отдельная проверка bridge.js больше не считается достаточной.
- Дополнительный регрессионный тест запрещает повторение пропавшего кода после комментария.

## Платформы

Chrome / Edge / Opera — Chromium ZIP. Tampermonkey / Violentmonkey — userscript и metadata. Firefox — userscript; unsigned XPI только для временной разработки. Никакого изменения RouterForge Core, KeeneticOS и Entware.

---

## English (secondary)

Fix userscript v0.10.2 syntax failure caused by an inline comment accidentally swallowing the following JavaScript. Tampermonkey/Violentmonkey now start normally, preserving stored profiles and the redesigned settings UI. Built userscript syntax is checked during build, CI and release. All six platform assets are supplied; no router changes.
