// UI-only locale is stored separately from router/app profiles. No config migration.
export const LANGUAGE_KEY = 'rfPortalLanguage';
export const LANGUAGES = Object.freeze(['ru', 'en']);
export function normalizedLanguage(value, browser = 'ru') {
  return LANGUAGES.includes(value) ? value : (/^ru\b/i.test(browser) ? 'ru' : 'en');
}
export async function readLanguage() {
  const saved = await chrome.storage.local.get(LANGUAGE_KEY);
  return normalizedLanguage(saved[LANGUAGE_KEY], chrome.i18n?.getUILanguage?.() || navigator.language);
}
export async function writeLanguage(lang) {
  if (!LANGUAGES.includes(lang)) throw Error('Unsupported language');
  await chrome.storage.local.set({ [LANGUAGE_KEY]: lang });
  return lang;
}
// Russian source strings are also the stable keys for HTML leaf text nodes.
const EN = Object.freeze({
  'Обновления Portal':'Portal updates',
  'Проверка выполняется только по нажатию. Никакой автоматической установки или исполнения файлов.':'Only checks when requested. Never silently installs or executes downloaded files.',
  'Установлено':'Installed','↻ Проверить обновления':'↻ Check for updates','↓ Скачать ZIP':'↓ Download ZIP',
  'Нажми «Проверить» для обращения к GitHub Releases.':'Click Check to query GitHub Releases.',
  'Обновление распакованного расширения — через проверяющий Windows-установщик, затем «Обновить» в chrome://extensions или edge://extensions.':'Update unpacked extensions using the verifying Windows installer, then click Update in chrome://extensions or edge://extensions.',
  '↻ Обновления':'↻ Updates',
  'Центр приложений':'Application Center',
  'Сторонние веб-панели в привычном интерфейсе Keenetic — без установки модулей на роутер.':'Third-party web panels in the familiar Keenetic interface — no additional router packages.',
  '◈ Независим от Core':'◈ No Core required','▣ 2 режима открытия':'▣ 2 display modes','⌘ Локальные профили':'⌘ Local profiles',
  'УСТРОЙСТВО':'DEVICE','Маршрутизаторы':'Routers','Активный профиль':'Active profile',
  'Открой веб-панель Keenetic и подключи устройство через значок расширения.':'Open Keenetic WebUI and connect the device using the extension icon.',
  '↗ Открыть роутер':'↗ Open router','Удалить профиль':'Delete profile',
  'ОФОРМЛЕНИЕ':'APPEARANCE','Внешний вид':'Appearance','Тема Portal для этого роутера':'Portal theme for this router',
  'Системная (авто)':'System (auto)','Тёмная':'Dark','Светлая':'Light',
  'Оформление меню, popup и области интеграции. Внешнюю веб-панель мы не перекрашиваем.':'Theme for navigation, popup and embedded workspace. External apps keep their own styles.',
  'ПРОФИЛИ':'PROFILES','Резервная копия':'Backup',
  'Сохрани список устройств и приложений в JSON. Токены и пароли в адресах не храни.':'Export devices and apps as JSON. Never put tokens or passwords in URLs.',
  '↓ Экспорт JSON':'↓ Export JSON','↑ Импорт JSON':'↑ Import JSON',
  'Импорт заменяет текущие настройки. Права браузера выдаются отдельно.':'Import replaces local settings. Browser permissions are granted separately.',
  'ЭКОСИСТЕМА':'ECOSYSTEM','Portal — независимый спутник RouterForge Core. Один проект, один подход к управлению устройством.':'Portal is an independent companion to RouterForge Core. One ecosystem, one approach to device management.',
  '⌘ RouterForge на GitHub':'⌘ RouterForge on GitHub','✈ Telegram-сообщество':'✈ Telegram community',
  'локально в браузере':'local to your browser','Прошивка и RouterForge Core не изменяются.':'Firmware and RouterForge Core remain unchanged.',
  'Мои приложения':'My applications','Готовые интеграции':'Ready integrations',
  'Включай только те сервисы, которые у тебя уже установлены. Подставляем адрес роутера и рекомендуемый порт; IP, порт, протокол и способ открытия можно поменять. Никакого сканирования сети.':'Enable only services already installed on your Keenetic. We prefill the router address and suggested port; change host, port, protocol and display mode at any time. No network scanning.',
  'Добавить приложение':'Add application','Название':'Name','Значок':'Icon','Адрес веб-интерфейса (включая порт)':'WebUI address (including port)',
  'URL сохранится в профиле устройства — запоминать порт больше не придётся.':'The URL stays with the device profile — no need to remember ports.',
  'Способ открытия':'Display mode','Автоматически — сначала внутри Keenetic':'Auto — embed in Keenetic first',
  'Внутри Keenetic':'Inside Keenetic','В отдельной вкладке':'Separate tab',
  'Некоторые сервисы запрещают iframe через CSP или X-Frame-Options. Для них используй отдельную вкладку.':'Some services block iframes via CSP or X-Frame-Options. Use a separate tab for them.',
  '＋ Сохранить приложение':'＋ Save application','Отмена':'Cancel',
  'RouterForge Ecosystem / Portal · независимое браузерное расширение':'RouterForge Ecosystem / Portal · independent browser extension',
  'Неофициальное расширение для Keenetic / Netcraze':'Unofficial extension for Keenetic / Netcraze',
  '▣ Приложение':'▣ Application','⚡ Скорость':'⚡ Speed','🛡 Защита':'🛡 Protection','⚙ Настройки':'⚙ Settings',
  '🌐 Сеть':'🌐 Network','📡 Сигнал':'📡 Signal','📦 Пакеты':'📦 Packages','🔧 Инструменты':'🔧 Tools',
  'Единый центр приложений':'Unified application center',
  'Проверка вкладки…':'Checking active tab…','↻ Обновить интерфейс этой вкладки':'↻ Reload this tab',
  'Подключить роутер':'Connect a router','Создадим локальный профиль и добавим Portal в интерфейс устройства.':'Create a local profile and add Portal to the device WebUI.',
  'Название устройства':'Device name','＋ Подключить этот роутер':'＋ Connect this router',
  'Разрешение браузера запрашивается только для выбранного адреса.':'Browser access is requested only for the selected address.',
  'ПОДКЛЮЧЕНОЕ УСТРОЙСТВО':'CONNECTED DEVICE','● Активно':'● Active','Выбрать устройство':'Select device',
  'Приложения':'Applications','＋ Управление приложениями':'＋ Manage applications','↗ Открыть Keenetic':'↗ Open Keenetic',
  '⚙ Настройки Portal':'⚙ Portal settings',
  'Отдельно':'Separate','Внутри':'Inside','Авто':'Auto','Изменить':'Edit','Удалить':'Delete',
  'Сохранить':'Save','Сохранить изменения':'Save changes','Сначала подключи Keenetic.':'Connect Keenetic first.',
  'Сначала подключи профиль Keenetic.':'Connect a Keenetic profile first.',
  'Пока нет приложений — добавь первое ниже.':'No applications yet — add one below.',
  'Выключено · готово к настройке':'Disabled · ready to configure','Настройки сохранены':'Settings saved',
  'IP / хост':'IP / host','Порт':'Port','Схема':'Protocol','Открытие':'Display',
  'авто':'auto','встроено':'embedded','отдельно':'separate',
  'включено':'enabled','Включить':'Enable','активно':'active','приложений':'applications',
  'ОТДЕЛЬНАЯ ВКЛАДКА':'SEPARATE TAB','ВНУТРИ KEENETIC':'INSIDE KEENETIC','АВТОМАТИЧЕСКИ':'AUTOMATIC',
  'Пока пусто. Добавь первую веб-панель.':'Nothing here yet. Add your first WebUI.',
  'Выполни вход в Keenetic — Portal появится после авторизации.':'Sign in to Keenetic — Portal will appear after login.',
  'На этой вкладке не обнаружен интерфейс текущей версии.':'No active Portal interface found in this tab.',
  'На этой вкладке не обнаружен интерфейс текущей версии (возможна старая инъекция).':'No current Portal interface found in this tab (a previous script may be active).',
  'Открой веб-интерфейс Keenetic для подключения.':'Open Keenetic WebUI to connect it.',
  'Доступ не предоставлен.':'Permission was not granted.',
  'RouterForge Core':'RouterForge Core',
  'Сеть и VPN':'Network & VPN','DNS и защита':'DNS & security',
  'Модульная платформа RouterForge':'RouterForge modular platform',
  'AmneziaWG и sing-box; реальный порт может отличаться':'AmneziaWG and sing-box; actual port may differ',
  'Веб-интерфейс nfqws / nfqws2':'Web interface for nfqws / nfqws2',
  'Альтернативная панель nfqws2; takeover меняет порт':'Alternative nfqws2 UI; setup may change the port',
  'Маршрутизация и прокси в Keenetic':'Routing and proxy management on Keenetic',
  '3000 — первичная настройка; рабочий порт может быть 80':'3000 is the setup port; the active port may be 80',
  'Веб-панель для xKeen на Entware':'Web interface for xKeen on Entware',
  'Готово к настройке':'Ready to configure',
  'Мой Keenetic':'My Keenetic',
  'Например, AWG Manager':'For example, AWG Manager',
  'Язык интерфейса':'Interface language','РУССКИЙ':'RUSSIAN','ENGLISH':'ENGLISH',
  'Настройки языка применяются ко всему Portal, включая меню Keenetic.':'Language applies to Portal settings, popup and Keenetic navigation.',
  'Сервисы Keenetic / Entware':'Keenetic / Entware services',
  'Только приложения для Keenetic и Entware. Любой другой веб-сервис можно добавить вручную.':'Focused on Keenetic and Entware apps. Any other WebUI can still be added manually.',
  'ЗАГРУЖЕННЫЕ ИНТЕГРАЦИИ':'ACTIVE INTEGRATIONS',
  'Неизвестная интеграция.':'Unknown integration.','Неверный адрес устройства.':'Invalid device address.',
  'Неверное имя устройства.':'Invalid hostname.','Недопустимый протокол.':'Unsupported protocol.',
  'Порт должен быть числом от 1 до 65535.':'Port must be an integer between 1 and 65535.',
  'Порт должен быть от 1 до 65535.':'Port must be between 1 and 65535.',
  'Укажи IP или имя устройства без порта.':'Enter an IP or hostname without the port.',
  'Максимум 100 приложений на роутер.':'Maximum 100 applications per router.',
  'Название: от 1 до 70 символов.':'Name must be 1–70 characters.',
  'Укажи адрес HTTP или HTTPS.':'Enter an HTTP or HTTPS URL.',
  'Некорректный адрес.':'Invalid address.',
  'Разрешены только HTTP/HTTPS без логина и пароля в URL.':'Only HTTP/HTTPS URLs without embedded credentials are allowed.',
  'Настройки сохранены, интеграция выключена.':'Settings saved, integration disabled.',
  'Профиль удалён.':'Profile deleted.',
  'Приложение удалено.':'Application removed.',
  'Импорт выполнен. Для новых роутеров выдай доступ через браузер.':'Import completed. Grant browser permissions for newly imported routers.',
  'Файл слишком большой.':'File is too large.'
});
export function t(source, lang = 'ru', vars) {
  const translated = lang === 'en' ? (EN[source] || source) : source;
  return vars ? translated.replace(/\{([a-z]+)\}/g, (_, key) => String(vars[key] ?? '')) : translated;
}
export function localizeStatic(root, lang) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const el = node.parentElement;
    if (!el || /^(SCRIPT|STYLE|TEXTAREA)$/.test(el.tagName)) continue;
    const source = node.__rfOriginalText ?? node.nodeValue;
    if (node.__rfOriginalText === undefined) node.__rfOriginalText = source;
    const trimmed = source.trim();
    if (!trimmed) continue;
    if (EN[trimmed]) node.nodeValue = source.replace(trimmed, t(trimmed,lang));
  }
  for (const el of root.querySelectorAll('[placeholder],[title],[aria-label]')) {
    for (const key of ['placeholder','title','aria-label']) {
      const originalKey = 'rfSource' + key[0].toUpperCase() + key.slice(1).replace('-','');
      const original = el.dataset[originalKey] ?? el.getAttribute(key);
      if (el.dataset[originalKey] === undefined && original) el.dataset[originalKey] = original;
      if (original && EN[original]) el.setAttribute(key,t(original,lang));
    }
  }
}
