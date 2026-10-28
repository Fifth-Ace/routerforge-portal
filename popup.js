import { LANGUAGE_KEY, readLanguage, writeLanguage, localizeStatic, t } from './shared/i18n.js';
import { readState, writeState, routerOrigin, hostMatch } from './shared/model.js';
const $ = s => document.querySelector(s);
let tab, origin = null, chosen = null, lang = 'ru';
const T = (source) => t(source,lang);
function translateUI(){ document.documentElement.lang=lang; $('#popup-language').value=lang; localizeStatic(document.body,lang); }

function status(message, type = 'info') { $('#status').textContent = message; $('#status').dataset.type = type; }
function options() { chrome.runtime.openOptionsPage(); }
async function diagnoseBridge() {
  const box = $('#diagnostics');
  const button = $('#repair-btn');
  const badge = $('#connected .status-pill');
  const version = chrome.runtime.getManifest().version;
  $('#popup-version').textContent = 'v' + version;
  box.hidden = true;
  button.hidden = true;
  if (!tab?.id || !origin || chosen !== origin) return;
  box.hidden = false;
  if (badge) badge.textContent = lang === 'en' ? '● Checking' : '● Проверка';
  button.textContent = lang === 'en' ? '↻ Refresh the current tab' : '↻ Обновить интерфейс этой вкладки';
  try {
    const allowed = await chrome.permissions.contains({ origins: [hostMatch(origin)] });
    if (!allowed) {
      $('#bridge-status').textContent = lang === 'en'
        ? 'Router profile restored, but browser site access was not restored from the backup.'
        : 'Профиль восстановлен, но разрешение браузера для этого роутера не было перенесено при импорте.';
      box.dataset.type = 'warning';
      if (badge) badge.textContent = lang === 'en' ? '● Access needed' : '● Нет доступа';
      button.textContent = lang === 'en' ? 'Grant access and reload tab' : 'Разрешить доступ и обновить вкладку';
      button.hidden = false;
      return;
    }
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'BRIDGE_VERSION' });
    if (response?.authenticated === false) {
      $('#bridge-status').textContent = T('Выполни вход в Keenetic — Portal появится после авторизации.');
      box.dataset.type = 'info';
      if (badge) badge.textContent = lang === 'en' ? '● Sign-in required' : '● Нужен вход';
      button.hidden = true;
      return;
    }
    if (response?.version === version) {
      $('#bridge-status').textContent = (lang==='en'?'✓ Portal active in this tab · v':'✓ Portal активен на странице · v') + version;
      box.dataset.type = 'ok';
      if (badge) badge.textContent = lang === 'en' ? '● Active' : '● Активно';
      return;
    }
    $('#bridge-status').textContent = response?.version
      ? (lang==='en'?`Version mismatch: Portal v${version}, tab v${response.version}.`:`Версии отличаются: Portal v${version}, страница v${response.version}.`)
      : T('На этой вкладке не обнаружен интерфейс текущей версии.');
  } catch {
    $('#bridge-status').textContent = T('На этой вкладке не обнаружен интерфейс текущей версии (возможна старая инъекция).');
  }
  box.dataset.type = 'warning';
  if (badge) badge.textContent = lang === 'en' ? '● Attention needed' : '● Требует внимания';
  button.hidden = false;
}
function renderApps(profile) {
  const list = $('#apps'); list.replaceChildren();
  const activeApps=profile.apps.filter(a=>a.enabled!==false);
  if (!activeApps.length) {
    const msg = document.createElement('p'); msg.className = 'muted'; msg.textContent = T('Пока пусто. Добавь первую веб-панель.'); list.append(msg); return;
  }
  for (const app of activeApps) {
    const btn = document.createElement('button'); btn.className = 'appbutton';
    const icon = document.createElement('span'); icon.className='app-icon'; icon.textContent = app.icon;
    const copy = document.createElement('span'); copy.className='app-copy';
    const name = document.createElement('span'); name.className='app-name'; name.textContent=app.name;
    const mode=document.createElement('span'); mode.className='app-mode';
    mode.textContent=app.mode==='external'?T('ОТДЕЛЬНАЯ ВКЛАДКА'):app.mode==='embedded'?T('ВНУТРИ KEENETIC'):T('АВТОМАТИЧЕСКИ');
    copy.append(name,mode);
    const arrow=document.createElement('span');arrow.className='app-arrow';arrow.textContent='↗';
    btn.append(icon,copy,arrow); btn.title = app.url;
    btn.addEventListener('click', async () => {
      if (app.mode === 'external' || !tab?.id || origin !== chosen) {
        chrome.tabs.create({ url: app.url }); return;
      }
      try {
        const reply = await chrome.tabs.sendMessage(tab.id, { type: 'SHOW_APP', id: app.id });
        if (!reply?.ok) throw Error('Not injected');
        window.close();
      } catch { chrome.tabs.create({ url: app.url }); }
    });
    list.append(btn);
  }
}
async function refresh() {
  const state = await readState();
  const keys = Object.keys(state.routers);
  if (!state.routers[chosen]) chosen = (origin && state.routers[origin]) ? origin : keys[0] || null;
  const profile = chosen ? state.routers[chosen] : null;
  document.documentElement.dataset.theme = profile?.theme || 'auto';
  $('#connect').hidden = !origin || Boolean(state.routers[origin]);
  $('#connected').hidden = !profile;
  $('#choose-box').hidden = keys.length < 2;
  const chooser = $('#choose-router'); chooser.replaceChildren();
  for (const key of keys) {
    const option = document.createElement('option'); option.value = key;
    option.textContent = state.routers[key].label + ' · ' + key;
    chooser.append(option);
  }
  chooser.value = chosen || '';
  if (profile) {
    const permitted = chosen === origin && await chrome.permissions.contains({origins:[hostMatch(origin)]});
    status((permitted ? (lang==='en'?'● Portal connected: ':'● Portal подключён: ') : (lang==='en'?'● Saved router profile: ':'● Профиль роутера сохранён: ')) + chosen, permitted?'ok':'info');
    $('#connected .status-pill').textContent = permitted ? (lang==='en'?'● Checking':'● Проверка') : (lang==='en'?'● Profile saved':'● Профиль сохранён');
    $('#router-title').textContent = profile.label;
    $('#popup-appcount').textContent=String(profile.apps.filter(a=>a.enabled!==false).length);
    renderApps(profile);
  } else if (origin) status((lang==='en'?'Open Keenetic WebUI and connect it: ':'Открой страницу Keenetic и подключи её: ') + origin);
  else status(T('Открой веб-интерфейс Keenetic для подключения.'), 'error');
  await diagnoseBridge();
  translateUI();
}
async function initialize() {
  lang=await readLanguage();
  translateUI();
  $('#popup-language').addEventListener('change',async e=>{ lang=await writeLanguage(e.target.value); await refresh(); });
  chrome.storage.onChanged.addListener(async (changes,area)=>{if(area==='local'&&LANGUAGE_KEY in changes){lang=await readLanguage();await refresh();}});
  $('#repair-btn').addEventListener('click', async () => {
    const btn = $('#repair-btn');
    btn.disabled = true;
    try {
      if (!tab?.id || !origin || chosen !== origin) throw Error((lang==='en'?'No active connected Keenetic tab.':'Нет активной вкладки подключённого Keenetic.'));
      // Site permissions are not part of JSON backups; request inside the user click.
      const grant = chrome.permissions.request({origins:[hostMatch(origin)]});
      if (!(await grant)) throw Error(lang==='en'?'Site access was not granted.':'Доступ к роутеру не предоставлен.');
      const sync = await chrome.runtime.sendMessage({type:'SYNC'});
      if (!sync?.ok || sync.count < 1) throw Error(sync?.error || (lang==='en'?'Unable to register a script for this router':'Не удалось зарегистрировать скрипт для этого роутера'));
      await chrome.tabs.reload(tab.id, { bypassCache: true });
      window.close();
    } catch(error) {
      $('#bridge-status').textContent = (lang==='en'?'Tab reload failed: ':'Обновление вкладки не выполнено: ') + error.message;
      btn.disabled = false;
    }
  });
  $('#settings-btn').addEventListener('click', options);
  $('#updates-btn').addEventListener('click', () => chrome.runtime.openOptionsPage());
  $('#add-btn').addEventListener('click', options);
  $('#open-router-btn').addEventListener('click', () => { if (chosen) chrome.tabs.create({url: chosen}); });
  $('#choose-router').addEventListener('change', e => { chosen=e.target.value; refresh(); });
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try { if (tab?.url) origin = routerOrigin(tab.url); } catch { origin = null; }
  if (origin) $('#router-name').value = new URL(origin).host;
  $('#connect-btn').addEventListener('click', async () => {
    const btn = $('#connect-btn'); btn.disabled = true;
    try {
      // Permission request is made synchronously in the click-handler context.
      const permission = chrome.permissions.request({ origins: [hostMatch(origin)] });
      if (!(await permission)) { status(T('Доступ не предоставлен.'), 'error'); return; }
      const state = await readState();
      if (!state.routers[origin]) state.routers[origin] = {
        label: $('#router-name').value.trim() || new URL(origin).host, apps: []
      };
      await writeState(state);
      chosen = origin;
      const sync = await chrome.runtime.sendMessage({ type: 'SYNC' });
      if (!sync?.ok) throw Error(sync?.error || (lang==='en'?'Failed to register content script.':'Не удалось зарегистрировать скрипт.'));
      await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['content/bridge.css'] });
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content/bridge.js'] });
      await refresh();
    } catch (error) { status((lang==='en'?'Connection error: ':'Ошибка подключения: ') + error.message, 'error'); }
    finally { btn.disabled = false; }
  });
  await refresh();
}
initialize().catch(error => status((lang==='en'?'Error: ':'Ошибка: ') + error.message, 'error'));
