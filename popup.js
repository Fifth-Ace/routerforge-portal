import { LANGUAGE_KEY, readLanguage, writeLanguage, localizeStatic, t } from './shared/i18n.js';
import { readState, writeState, routerOrigin, hostMatch } from './shared/model.js';
import { coreEndpoint, probeCore } from './shared/core_probe.js';
import { readCoreCatalogInTab, summarizeCoreModules } from './shared/core_catalog.js';
import { coreOriginForRouter, suggestCoreWebApps } from './shared/core_suggestions.js';
import { routerOverview, routerProfileKeys, isCoreServiceOrigin, chooseRouter, readSelectedRouter, saveSelectedRouter } from './shared/router_overview.js';
import { cleanApp } from './shared/model.js';
import {readDefaultRouter,DEFAULT_ROUTER_KEY} from './shared/profile_tools.js';
const $ = s => document.querySelector(s);
let tab, origin = null, chosen = null, lang = 'ru', savedRouter = '', defaultRouter = '', favoritesOnly = false;
let coreProfileShown = null, coreRequestSerial = 0, modulesRequestSerial = 0;
let coreCatalogRouter = null, coreCatalogSnapshot = null;
const T = (source) => t(source,lang);
function translateUI(){ document.documentElement.lang=lang; $('#popup-language').value=lang; localizeStatic(document.body,lang); $('#core-status-help').textContent=lang==='en'?'On demand · local /api/health · no login':'Только по нажатию · локальная проверка /api/health · без логина'; $('#core-modules-btn').textContent=lang==='en'?'▣ Module status':'▣ Статус модулей'; }

function status(message, type = 'info') { $('#status').textContent = message; $('#status').dataset.type = type; }
function options() { chrome.runtime.openOptionsPage(); }
async function selectOverviewRouter(target) {
  const state=await readState();
  if (!Object.prototype.hasOwnProperty.call(state.routers,target)) return;
  chosen=target;
  favoritesOnly=false;
  resetCoreStatus(chosen); // invalidates pending checks before waiting for storage
  savedRouter=await saveSelectedRouter(state,target);
  await refresh();
}
function renderRouterOverview(state) {
  const items=routerOverview(state,origin);
  const panel=$('#router-overview'), list=$('#router-overview-list');
  panel.hidden=items.length<2;
  list.replaceChildren();
  $('#router-overview-count').textContent=String(items.length);
  $('#router-overview-title').textContent=coreText('Все роутеры','All routers');
  $('#router-overview-help').textContent=coreText('Профили локальные · статус сети не проверяется','Local profiles · network status not checked');
  for (const entry of items) {
    const row=document.createElement('div'); row.className='router-overview-item';
    if (entry.origin===chosen) row.classList.add('selected');
    const select=document.createElement('button');select.type='button';select.className='router-overview-pick';
    select.setAttribute('aria-pressed',String(entry.origin===chosen));
    const title=document.createElement('span');title.className='router-overview-name';title.textContent=entry.label;
    const meta=document.createElement('span');meta.className='router-overview-meta';
    meta.textContent=coreText(`${entry.apps} приложений · ${entry.favorites} избранных`,`Apps: ${entry.apps} · favorites: ${entry.favorites}`);
    const chips=document.createElement('span');chips.className='router-overview-chips';
    chips.textContent=[entry.activeTab?coreText('Текущая вкладка','Current tab'):null,
      entry.coreLinked?coreText('Core привязан','Core linked'):coreText('Core не привязан','Core not linked'),
      entry.origin===defaultRouter?coreText('★ Основной','★ Default'):null].filter(Boolean).join(' · ');
    select.append(title,meta,chips);
    select.addEventListener('click',()=>selectOverviewRouter(entry.origin).catch(error=>status(error.message,'error')));
    const open=document.createElement('button');open.type='button';open.className='router-overview-open';
    open.title=coreText('Открыть роутер','Open router');open.setAttribute('aria-label',open.title+' '+entry.label);
    open.textContent='↗';open.addEventListener('click',()=>chrome.tabs.create({url:entry.origin}));
    row.append(select,open);list.append(row);
  }
}
function coreText(ru,en) { return lang==='en'?en:ru; }
function resetCoreStatus(profileOrigin) {
  coreRequestSerial++;
  coreProfileShown=profileOrigin;
  const box=$('#core-card'); box.hidden=!profileOrigin;
  $('#core-badge').textContent='○';
  $('#core-status').textContent=coreText('Статус не проверялся','Not checked');
  $('#core-open-btn').disabled=!profileOrigin;
  $('#core-check-btn').disabled=!profileOrigin;
  $('#core-check-btn').textContent=coreText('↻ Проверить Core','↻ Check Core');
  $('#core-open-btn').textContent=coreText('↗ Открыть Core','↗ Open Core');
  modulesRequestSerial++;
  $('#core-modules-btn').disabled=!profileOrigin;
  $('#core-modules-btn').textContent=coreText('▣ Статус модулей','▣ Module status');
  $('#core-link-btn').textContent=coreText('🔗 Связать локально','🔗 Link locally');
  $('#core-modules-status').textContent=coreText('Не проверялись','Not checked');
  $('#core-modules-list').replaceChildren();
  $('#core-modules-list').hidden=true;
  coreCatalogRouter=null;coreCatalogSnapshot=null;
  $('#core-link-btn').disabled=!profileOrigin;
  $('#core-link-state').textContent=coreText('Связь не проверялась','Link not checked');
  $('#core-suggestions-list').replaceChildren();
  $('#core-suggestions-list').hidden=true;
  $('#core-suggestions-state').textContent=coreText('Сначала получи статус модулей','Read modules first');
}
async function checkSelectedCore() {
  const router=chosen;
  if(!router) return;
  const endpoint=coreEndpoint(router);
  // Request immediately in the browser click gesture, before the first await.
  const permission=chrome.permissions.request({origins:[hostMatch(endpoint.origin)]});
  const serial=++coreRequestSerial;
  const button=$('#core-check-btn'); button.disabled=true;
  $('#core-badge').textContent='…';
  $('#core-status').textContent=coreText('Проверяю Core на порту 2233…','Checking Core on port 2233…');
  try {
    // The browser prompts for access to the selected router host ONLY after this user click.
    const granted=await permission;
    if (!granted) throw Error('CORE_PERMISSION_DENIED');
    const state=await readState();
    if (!Object.hasOwn(state.routers,router)) throw Error('PROFILE_GONE');
    const health=await probeCore(router);
    if(chosen!==router || serial!==coreRequestSerial)return;
    $('#core-badge').textContent='●';
    $('#core-status').textContent=coreText('Core доступен · версия ','Core online · version ')+health.version;
  } catch (error) {
    if(chosen!==router || serial!==coreRequestSerial)return;
    $('#core-badge').textContent='○';
    $('#core-status').textContent=error.message==='CORE_PERMISSION_DENIED'
      ?coreText('Разрешение браузера не выдано','Browser site permission not granted')
      :coreText('Core не подтверждён: проверь адрес и порт 2233','Core not verified: check router address and port 2233');
  } finally {if(chosen===router && serial===coreRequestSerial) button.disabled=false;}
}


// P2.2: only an already-open Core tab with an authenticated Core session may read /api/catalog.
// No cookies, passwords, network scans, background refresh or router mutations.
async function checkSelectedModules() {
  const router=chosen;
  if (!router) return;
  const endpoint=coreEndpoint(router);
  // Must happen synchronously inside the user click, before any await.
  const permission=chrome.permissions.request({origins:[hostMatch(endpoint.origin)]});
  const serial=++modulesRequestSerial;
  const button=$('#core-modules-btn'); button.disabled=true;
  const msg=$('#core-modules-status'), list=$('#core-modules-list');
  list.replaceChildren(); list.hidden=true;
  coreCatalogRouter=null;coreCatalogSnapshot=null;
  $('#core-suggestions-list').replaceChildren();
  $('#core-suggestions-list').hidden=true;
  msg.textContent=coreText('Читаю каталог Core…','Reading Core catalogue…');
  const current=()=>chosen===router && serial===modulesRequestSerial;
  try {
    if (!(await permission)) throw Error('NO_PERMISSION');
    const state=await readState();
    if (!Object.hasOwn(state.routers,router)) throw Error('PROFILE_GONE');
    const tabs=await chrome.tabs.query({});
    const tab=tabs.find(item=>{
      try {return Number.isInteger(item.id) && new URL(item.url).origin===endpoint.origin;} catch{return false;}
    });
    if (!tab) throw Error('CORE_TAB_MISSING');
    const results=await chrome.scripting.executeScript({
      target:{tabId:tab.id},func:readCoreCatalogInTab,args:[endpoint.origin]
    });
    if (!current()) return;
    const response=results?.[0]?.result;
    if (response?.kind==='auth_required') throw Error('CORE_LOGIN_REQUIRED');
    if (response?.kind!=='ok') throw Error('CORE_CATALOG_UNAVAILABLE');
    const summary=summarizeCoreModules(response);
    coreCatalogRouter=router; coreCatalogSnapshot=response;
    msg.textContent=coreText(
      `Установлено модулей: ${summary.total} · запущено служб: ${summary.running}`,
      `Installed modules: ${summary.total} · running services: ${summary.running}`
    );
    for (const module of summary.items) {
      const row=document.createElement('div');row.className='core-module-row';
      const name=document.createElement('span'); name.className='core-module-name';
      name.textContent=module.name+(module.version?' · '+module.version:'');
      const status=document.createElement('span'); status.className='core-module-state';
      status.dataset.state=module.status;
      status.textContent=module.status==='running'?coreText('● работает','● running'):
        module.status==='disabled'?coreText('○ отключён','○ disabled'):coreText('○ установлен','○ installed');
      row.append(name,status);list.append(row);
    }
    if (summary.total>summary.items.length) {
      const more=document.createElement('p');more.className='core-status-help';
      more.textContent=coreText(`Показаны первые ${summary.items.length} модулей`,`Showing first ${summary.items.length} modules`);
      list.append(more);
    }
    list.hidden=false;
    await renderCoreSuggestions();
  } catch (error) {
    if (!current()) return;
    msg.textContent=error.message==='NO_PERMISSION'?coreText('Доступ к Core не выдан','Core permission denied'):
      error.message==='CORE_TAB_MISSING'?coreText('Сначала открой Core кнопкой выше, затем повтори проверку','Open Core with the button above, then check again'):
      error.message==='CORE_LOGIN_REQUIRED'?coreText('Авторизуйся во вкладке Core и повтори проверку','Sign in to Core tab and try again'):
      coreText('Не удалось прочитать каталог Core','Could not read Core catalogue');
  } finally {if (current()) button.disabled=false;}
}


// P2.3: user's explicit local association; NOT a remote ownership credential.
async function confirmCoreAssociation() {
  const router=chosen;
  if (!router || coreCatalogRouter !== router || !coreCatalogSnapshot) {
    $('#core-link-state').textContent=coreText('Сначала открой Core и прочитай модули','Open Core and read modules first');
    return;
  }
  if (!confirm(coreText('Связать профиль с локальным Core? Это не даёт прав управления и не подтверждает владение для доступа через интернет.',
    'Link this profile to local Core? This grants no control rights or remote ownership proof.'))) return;
  const state=await readState();
  const profile=state.routers[router];
  if (!profile || router !== chosen) return;
  profile.coreLink=coreEndpoint(router).origin;
  await writeState(state);
  if (router !== chosen) return;
  $('#core-link-state').textContent=coreText('✓ Локальная связь подтверждена','✓ Local link confirmed');
  await renderCoreSuggestions();
}

// P2.4: only user-clicked suggestions are stored. No Core writes, auto-discovery or edits.
async function renderCoreSuggestions() {
  const router=chosen;
  const list=$('#core-suggestions-list');
  list.replaceChildren();list.hidden=true;
  const info=$('#core-suggestions-state');
  if (!router || coreCatalogRouter !== router || !coreCatalogSnapshot) {
    info.textContent=coreText('Сначала получи статус модулей','Read modules first');return;
  }
  const state=await readState();
  const profile=state.routers[router];
  if (router !== chosen) return;
  if (!profile || profile.coreLink !== coreOriginForRouter(router)) {
    info.textContent=coreText('Подтверди локальную связь, чтобы увидеть приложения','Confirm local link to view app suggestions');return;
  }
  const apps=suggestCoreWebApps(coreCatalogSnapshot,router,profile.apps);
  info.textContent=apps.length ? coreText(`Предложено приложений: ${apps.length}`,`Suggested applications: ${apps.length}`) :
    coreText('Новых веб-приложений нет','No new web apps');
  for(const candidate of apps.slice(0,8)) {
    const row=document.createElement('div');row.className='core-suggestion-row';
    const title=document.createElement('span');title.className='core-suggestion-name';
    title.textContent=candidate.name+' · '+new URL(candidate.url).port;
    const btn=document.createElement('button');btn.type='button';btn.className='secondary';
    btn.textContent=coreText('＋ Добавить','＋ Add');
    btn.addEventListener('click',()=>{addCoreSuggestion(candidate).catch(error=>{
      info.textContent=coreText('Не удалось сохранить: ','Could not save: ')+error.message;
    });});
    row.append(title,btn);list.append(row);
  }
  list.hidden=false;
}

async function addCoreSuggestion(candidate) {
  const router=chosen;
  if (!router || coreCatalogRouter !== router || !coreCatalogSnapshot) return;
  const state=await readState();
  const profile=state.routers[router];
  if (!profile || profile.coreLink !== coreOriginForRouter(router) || router!==chosen) return;
  const eligible=suggestCoreWebApps(coreCatalogSnapshot,router,profile.apps)
    .find(item=>item.coreSourceId===candidate.coreSourceId && item.url===candidate.url);
  if (!eligible) return;
  if(profile.apps.length >= 100) throw Error('ROUTER_APP_LIMIT_100');
  const app=cleanApp({id:crypto.randomUUID(),...eligible,enabled:true});
  state.routers[router].apps.push(app);
  if(router!==chosen) return;
  await writeState(state);
  if(router!==chosen) return;
  await renderCoreSuggestions();
  await refresh();
}

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
  const allApps=profile.apps.filter(a=>a.enabled!==false);
  const favoriteCount=allApps.filter(a=>a.favorite===true).length;
  $('#popup-favorite-controls').hidden=allApps.length===0;
  $('#popup-favorite-count').textContent=String(favoriteCount);
  $('#popup-favorite-btn').setAttribute('aria-pressed',String(favoritesOnly));
  $('#popup-favorite-btn').textContent=favoritesOnly?coreText('★ Все приложения','★ All apps'):coreText('☆ Избранное','☆ Favorites');
  const activeApps=favoritesOnly?allApps.filter(a=>a.favorite===true):allApps;
  if (!activeApps.length) {
    const msg = document.createElement('p'); msg.className = 'muted'; msg.textContent = favoritesOnly?coreText('Нет избранных приложений','No favorite apps'):T('Пока пусто. Добавь первую веб-панель.'); list.append(msg); return;
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
      // Explicit external mode stays external. All other launches target Keenetic itself.
      if (app.mode === 'external') { await chrome.tabs.create({url:app.url}); return; }
      const selectedRouter=chosen;
      if (!selectedRouter) return;
      // Browser permission request starts inside the click gesture, before any await.
      const grant=chrome.permissions.request({origins:[hostMatch(selectedRouter)]});
      btn.disabled=true;
      try {
        if (!(await grant)) throw Error('ROUTER_PERMISSION_DENIED');
        const reply=await chrome.runtime.sendMessage({type:'OPEN_EMBEDDED_APP',router:selectedRouter,id:app.id});
        if (!reply?.ok) throw Error(reply?.error || 'KEENETIC_LAUNCH_FAILED');
        window.close();
      } catch(error) {
        status(coreText('Не удалось открыть внутри Keenetic: ','Could not open inside Keenetic: ')+error.message,'error');
      } finally {btn.disabled=false;}
    });
    list.append(btn);
  }
}
async function refresh() {
  const state = await readState();
  const keys = routerProfileKeys(state);
  chosen=chooseRouter(state,chosen,origin,defaultRouter||savedRouter);
  const profile = chosen ? state.routers[chosen] : null;
  document.documentElement.dataset.theme = profile?.theme || 'auto';
  $('#connect').hidden = !origin || isCoreServiceOrigin(origin) || Boolean(state.routers[origin]);
  $('#connected').hidden = !profile;
  $('#choose-box').hidden = true; // P5: the unified router overview is the sole selector
  const chooser = $('#choose-router'); chooser.replaceChildren();
  for (const key of keys) {
    const option = document.createElement('option'); option.value = key;
    option.textContent = (isCoreServiceOrigin(key) && coreParentRouter(state,key) ? 'RouterForge Core (legacy)' : state.routers[key].label) + ' · ' + key;
    chooser.append(option);
  }
  chooser.value = chosen || '';
  renderRouterOverview(state);
  if (coreProfileShown !== chosen) resetCoreStatus(chosen);
  $('#core-link-state').textContent=profile && profile.coreLink===coreOriginForRouter(chosen)
    ?coreText('✓ Локальная связь подтверждена','✓ Local link confirmed'):
    coreText('Связь не подтверждена','Link not confirmed');
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
  savedRouter=await readSelectedRouter();
  defaultRouter=await readDefaultRouter();
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
  $('#core-check-btn').addEventListener('click', () => { checkSelectedCore().catch(console.error); });
  $('#core-open-btn').addEventListener('click', () => { if(chosen) chrome.tabs.create({url:coreEndpoint(chosen).page}); });
  $('#core-modules-btn').addEventListener('click', () => { checkSelectedModules().catch(console.error); });
  $('#core-link-btn').addEventListener('click', () => { confirmCoreAssociation().catch(console.error); });
  $('#choose-router').addEventListener('change', e => { selectOverviewRouter(e.target.value).catch(error=>status(error.message,'error')); });
  $('#popup-favorite-btn').addEventListener('click',async()=>{favoritesOnly=!favoritesOnly;const data=await readState();if(data.routers[chosen])renderApps(data.routers[chosen]);});
  chrome.storage.onChanged.addListener(async(changes,area)=>{if(area==='local' && DEFAULT_ROUTER_KEY in changes){defaultRouter=await readDefaultRouter();await refresh();}});
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


// R5.2 compact popup, last-known data only. No network requests or hidden probes.
const portalCenter=(serverId='')=>chrome.tabs.create({url:chrome.runtime.getURL('options.html?tab=servers'+(serverId?'&server='+encodeURIComponent(serverId):''))}).catch(console.warn);
document.getElementById('portal2-center')?.addEventListener('click',()=>portalCenter());
const appsButton=document.getElementById('portal-mode-apps');
const serversButton=document.getElementById('portal-mode-servers');
const appsBody=document.querySelector('.popup-body');
const serversBody=document.getElementById('portal-popup-servers');
const mini=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
const miniPercent=m=>m&&Number.isFinite(m.current)&&Number.isFinite(m.total)&&m.total>0?Math.round(m.current*100/m.total)+'%':'—';
const miniBytes=n=>{if(!Number.isFinite(n)||n<0)return '—';let i=0;const u=['B','KiB','MiB','GiB'];while(n>=1024&&i<u.length-1){n/=1024;i++;}return (i?n.toFixed(1):Math.round(n))+' '+u[i];};
function miniOpenUrl(app){
 const raw=app?.addressMode==='local'?app?.urlLocal:app?.urlRemote;
 if(typeof raw!=='string'||!raw)return null;
 try{const parsed=new URL(raw);if(!['http:','https:'].includes(parsed.protocol)||parsed.username||parsed.password||parsed.hash)return null;return parsed.href;}catch{return null;}
}
function renderPortalServers(){
 chrome.storage.local.get(['rfPortal2Registry','rfPortalR5Snapshots','rfPortalR5MonitorConfig']).then(data=>{
  const list=document.getElementById('portal-popup-server-list');if(!list)return;list.replaceChildren();
  const servers=data.rfPortal2Registry?.servers||[],apps=data.rfPortal2Registry?.apps||[],snaps=data.rfPortalR5Snapshots||{},config=data.rfPortalR5MonitorConfig||{};
  if(!servers.length){list.append(mini('p','portal-mini-empty','Серверов пока нет. Добавь их в Центре управления.'));return;}
  for(const server of servers){
   const box=mini('article','portal-mini-card');
   const title=mini('div','portal-mini-title');title.append(mini('strong','',server.name));
   const more=mini('button','portal-mini-more','Подробнее');more.type='button';more.addEventListener('click',()=>portalCenter(server.id));title.append(more);box.append(title);
   const panels=apps.filter(a=>a.serverId===server.id);
   if(!panels.length){box.append(mini('p','portal-mini-empty','Нет веб-панелей'));list.append(box);continue;}
   for(const app of panels){
    const v=snaps[app.id]?.latest,hasMetrics=app.adapter==='3xui'&&v&&(v.state==='OK'||v.state==='XRAY_STOPPED');
    const elapsed=v?Date.now()-Date.parse(v.checkedAt):Infinity;
    const stale=!Number.isFinite(elapsed)||elapsed<0||elapsed>Math.max(180000,3*(config[app.id]?.period||1)*60000);
    const state=app.adapter!=='3xui'?'WebUI':config[app.id]?.enabled&&config[app.id]?.needsAuth?'Нужен Vault · прошлые данные':!v?'Не проверялся':stale?'Нет свежих данных':({OK:'Доступен',XRAY_STOPPED:'Xray остановлен',API_AUTH_REQUIRED:'Нужен вход',API_FORBIDDEN:'Нет прав',TIMEOUT:'Таймаут',NETWORK_ERROR:'Ошибка сети',PERMISSION_REQUIRED:'Нет разрешения',VAULT_LOCKED:'Vault закрыт'})[v.state]||v.state;
    const line=mini('div','portal-mini-panel');const first=mini('div','portal-mini-panel-top');first.append(mini('span','portal-mini-panel-name',app.name));
    first.append(mini('span','portal-mini-state',state));first.append(mini('span','portal-mini-rtt',app.adapter==='3xui'&&Number.isFinite(v?.rttMs)?'HTTP RTT '+v.rttMs+' мс':'HTTP RTT —'));
    if(app.adapter==='3xui'){
     const metrics=mini('div','portal-mini-metrics');
     for(const [k,val] of [['CPU',hasMetrics&&Number.isFinite(v.cpu)?v.cpu.toFixed(1)+'%':'—'],['RAM',hasMetrics?miniPercent(v.mem):'—'],['Диск',hasMetrics?miniPercent(v.disk):'—'],['Xray',hasMetrics?(v.xray?.state==='running'?'работает':v.xray?.state==='stopped'?'остановлен':'—'):'—']]){
      const cell=mini('span','');cell.append(mini('small','',k+' '),mini('b','',val));metrics.append(cell);
     }line.append(metrics);
     if(hasMetrics&&v.rate)line.append(mini('span','portal-mini-traffic','↑ '+miniBytes(v.rate.up)+'/с · ↓ '+miniBytes(v.rate.down)+'/с'));
     if(v?.checkedAt&&Number.isFinite(Date.parse(v.checkedAt)))line.append(mini('span','portal-mini-checked','Проверено '+new Date(v.checkedAt).toLocaleString('ru-RU')));
    }
    const url=miniOpenUrl(app);const open=mini('button','portal-mini-open','↗ Веб-панель');open.type='button';open.disabled=!url;
    if(!url)open.title='Нет полного корректного URL';else open.addEventListener('click',()=>chrome.tabs.create({url}).catch(console.warn));
    first.append(open);line.prepend(first);box.append(line);
   }
   list.append(box);
  }
 }).catch(err=>{const list=document.getElementById('portal-popup-server-list');if(list){list.replaceChildren(mini('p','portal-mini-empty','Не удалось прочитать сохранённые данные'));}console.warn('Portal popup local snapshot:',err?.message);});
}
const POPUP_TAB_KEY='rfPortalPopupLastTab';
let userSelectedPopupTab=false;
function mode(what,remember=false){
 const serverMode=what==='servers';appsBody.hidden=serverMode;serversBody.hidden=!serverMode;
 appsButton.setAttribute('aria-current',serverMode?'false':'page');serversButton.setAttribute('aria-current',serverMode?'page':'false');
 if(remember){userSelectedPopupTab=true;chrome.storage.local.set({[POPUP_TAB_KEY]:serverMode?'servers':'apps'}).catch(console.warn);}
 if(serverMode){renderPortalServers();chrome.runtime.sendMessage({type:'PORTAL_R5_MONITOR_REFRESH_DUE'}).catch(()=>{});}
}
appsButton?.addEventListener('click',()=>mode('apps',true));
serversButton?.addEventListener('click',()=>mode('servers',true));
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&!serversBody.hidden&&(changes.rfPortalR5Snapshots||changes.rfPortal2Registry||changes.rfPortalR5MonitorConfig))renderPortalServers();});
// New installs default to Applications. Later openings restore only a known
// user-selected tab; never let an async storage read override a new click.
mode('apps');
chrome.storage.local.get(POPUP_TAB_KEY).then(data=>{
 if(!userSelectedPopupTab&&data[POPUP_TAB_KEY]==='servers')mode('servers');
}).catch(console.warn);
