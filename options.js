import {checkForUpdates} from './shared/updates.js';
import { LANGUAGE_KEY, readLanguage, writeLanguage, localizeStatic, t } from './shared/i18n.js';
import { readState, writeState, routerOrigin, cleanApp, cleanState, newState, KEY, hostMatch } from './shared/model.js';
import { CATALOG, catalogById, catalogUrl, makeCatalogApp, validatePort } from './shared/catalog.js';
const $ = s => document.querySelector(s);
let state = newState(), selected = '', editingId = null, lang = 'ru';
const T = (source, vars) => t(source, lang, vars);
function translateUI(){ document.documentElement.lang=lang; $('#ui-language').value=lang; localizeStatic(document.body,lang); document.title=lang==='en'?'RouterForge Portal — Application Center':'RouterForge Portal — Центр приложений'; }
function notify(message, fail = false) {
  const el = $('#message'); el.hidden = false; el.className = `alert${fail?' error':''}`; el.textContent = message;
}
async function manualUpdateCheck() {
  const button=$('#check-updates'), statusEl=$('#update-status'), download=$('#update-download'), digest=$('#update-hash');
  button.disabled=true;download.hidden=true;download.removeAttribute('href');digest.hidden=true;
  $('#update-remote').textContent='—';
  statusEl.textContent=lang==='en'?'Checking GitHub Releases…':'Проверяю GitHub Releases…';
  try {
    // Request GitHub host access only on a direct user click; no network on startup.
    const grant=chrome.permissions.request({origins:['https://api.github.com/*']});
    if(!(await grant))throw Error('GITHUB_PERMISSION_DENIED');
    const installed=chrome.runtime.getManifest().version;
    const release=await checkForUpdates(installed);
    $('#update-remote').textContent='v'+release.version;
    if(release.hasUpdate){
      statusEl.textContent=lang==='en'?'New version available. Download the ZIP; verify the signed release using the Windows installer.':'Доступна новая версия. Скачай ZIP; подпись выпуска проверит установщик Windows.';
      download.href=release.assetUrl;download.hidden=false;
      digest.textContent='SHA-256: '+release.sha256;digest.hidden=false;
    }else{
      statusEl.textContent=lang==='en'?'Latest release is not newer than the installed version.':'Новая версия пока не опубликована.';
    }
  }catch(err){
    const map={GITHUB_PERMISSION_DENIED:'Проверка отменена: не предоставлен доступ к GitHub API.',REPOSITORY_OR_RELEASE_NOT_FOUND:'Публичный релиз ещё не опубликован.',GITHUB_RATE_LIMIT:'GitHub ограничил запросы. Повтори позже.',ASSET_SHA256_UNAVAILABLE:'GitHub не предоставил SHA-256; выпуск не принимается.',INSTALL_ASSET_NOT_PUBLISHED:'В релизе нет установочного ZIP.',NETWORK_TIMEOUT:'GitHub не ответил вовремя.'};
    const en={GITHUB_PERMISSION_DENIED:'GitHub API permission not granted.',REPOSITORY_OR_RELEASE_NOT_FOUND:'No public release yet.',GITHUB_RATE_LIMIT:'GitHub rate limit reached.',ASSET_SHA256_UNAVAILABLE:'No SHA-256 digest available; release rejected.',INSTALL_ASSET_NOT_PUBLISHED:'Installation ZIP missing.',NETWORK_TIMEOUT:'GitHub request timed out.'};
    const code=err?.message||'UNKNOWN';
    statusEl.textContent=(lang==='en'?en[code]:map[code])||(lang==='en'?'Update check failed: ':'Проверка обновлений не выполнена: ')+code;
  }finally{button.disabled=false;}
}
function clearForm() {
  editingId = null; $('#app-form').reset(); $('#form-title').textContent = T('Добавить приложение');
  $('#save').textContent = T('Сохранить приложение'); $('#cancel').hidden = true;
}
function render() {
  const list = $('#routers'); const old = selected;
  list.replaceChildren();
  for (const [origin, profile] of Object.entries(state.routers)) {
    const item = document.createElement('option'); item.value = origin; item.textContent = `${profile.label} — ${origin}`;
    list.append(item);
  }
  selected = state.routers[old] ? old : Object.keys(state.routers)[0] || '';
  document.documentElement.dataset.theme = (selected && state.routers[selected].theme) || 'auto';
  list.value = selected;
  const has = Boolean(selected);
  $('#no-routers').hidden = has; $('#router-actions').hidden = !has;
  $('#router-theme').disabled = !has;
  $('#router-theme').value = has ? (state.routers[selected].theme || 'auto') : 'auto';
  $('#app-form').querySelectorAll('input,select,button').forEach(el => el.disabled = !has);
  const container = $('#app-list'); container.replaceChildren();
  const apps = has ? state.routers[selected].apps.filter(a=>a.enabled !== false) : [];
  renderCatalog();
  $('#appcount').textContent = apps.length ? `${apps.length} ${T('приложений')}` : '';
  if (!apps.length) {
    const p = document.createElement('p'); p.className='hint'; p.textContent = has ? T('Пока нет приложений — добавь первое ниже.') : T('Сначала подключи Keenetic.');
    container.append(p);
  }
  for (const app of apps) {
    const entry = document.createElement('div'); entry.className='entry';
    const info = document.createElement('div');
    const label = document.createElement('div'); label.className='name'; label.textContent=`${app.icon}  ${app.name}`;
    const meta = document.createElement('div'); meta.className='meta';
    const modeLabel={auto:T('авто'),embedded:T('встроено'),external:T('отдельно')}[app.mode]||app.mode;
    meta.textContent=`${app.url}  ·  ${modeLabel}`;
    info.append(label,meta);
    const actions = document.createElement('div'); actions.className='actions';
    const edit = document.createElement('button'); edit.className='mini'; edit.textContent=T('Изменить');
    edit.addEventListener('click', () => {
      if (app.presetId && catalogById(app.presetId)) { document.querySelector('#catalog-'+app.presetId)?.scrollIntoView({behavior:'smooth',block:'center'}); document.querySelector('#catalog-'+app.presetId+' .catalog-port')?.focus(); return; }
      editingId=app.id; $('#name').value=app.name; $('#url').value=app.url;
      $('#mode').value=app.mode; $('#icon').value=app.icon;
      $('#form-title').textContent=lang==='en'?`Edit: ${app.name}`:`Редактировать: ${app.name}`; $('#save').textContent=T('Сохранить изменения');
      $('#cancel').hidden=false; $('#name').focus();
    });
    const del = document.createElement('button'); del.className='mini danger'; del.textContent=T('Удалить');
    del.addEventListener('click', async () => {
      if (!confirm(app.presetId && catalogById(app.presetId) ? (lang==='en'?`Disable integration "${app.name}"?`:`Выключить интеграцию «${app.name}»?`) : (lang==='en'?`Delete application "${app.name}"?`:`Удалить приложение «${app.name}»?`))) return;
      if (app.presetId && catalogById(app.presetId)) app.enabled=false;
      else state.routers[selected].apps = state.routers[selected].apps.filter(a => a.id !== app.id);
      await persist(T('Приложение удалено.')); clearForm();
    });
    actions.append(edit,del); entry.append(info,actions); container.append(entry);
  }
  translateUI();
}
function node(tag, cls='', text='') {
  const el=document.createElement(tag); if(cls) el.className=cls; if(text) el.textContent=text;
  return el;
}
function catalogField(container, text, type, val, css, attrs={}) {
  const label=node('label','catalog-field');
  const title=node('span','catalog-label',text);
  const el=document.createElement(type==='select'?'select':'input');
  el.className=css;
  if(type==='number'){el.type='number';el.min='1';el.max='65535';el.step='1';}
  else if(type==='text') el.type='text';
  if(type==='select') for(const [value,name] of attrs.options||[]) {const opt=node('option','',name);opt.value=value;el.append(opt);}
  el.value=String(val);
  label.append(title,el);container.append(label);
  return el;
}
function renderCatalog() {
  const grid=$('#catalog-grid');grid.replaceChildren();
  if(!selected){ grid.append(node('p','hint',T('Сначала подключи профиль Keenetic.')));$('#catalog-count').textContent=`0 ${T('активно')}`;return; }
  const apps=state.routers[selected].apps;
  const count=CATALOG.filter(t=>apps.some(a=>a.presetId===t.id && a.enabled!==false)).length;
  $('#catalog-count').textContent=count+' / '+CATALOG.length+' '+T('активно');
  for(const template of CATALOG){
    const old=apps.find(a=>a.presetId===template.id);
    const fallback=catalogUrl(selected,template.id);
    const url=new URL(old?.url || fallback);
    const card=node('article','catalog-card');card.id='catalog-'+template.id;
    if(old?.enabled!==false && old)card.classList.add('catalog-active');
    const top=node('div','catalog-top');
    const visual=node('span','catalog-symbol',template.icon);
    const details=node('div','catalog-details');
    details.append(node('div','catalog-name',template.name),node('div','catalog-category',T(template.category)));
    const toggleLabel=node('label','catalog-toggle');
    const toggle=document.createElement('input');toggle.type='checkbox';toggle.className='catalog-enabled';toggle.checked=old?.enabled!==false && Boolean(old);toggle.setAttribute('aria-label',T('Включить')+' '+template.name);
    toggleLabel.append(toggle,node('span','catalog-switch-track'));
    top.append(visual,details,toggleLabel);
    const description=node('p','catalog-description',T(template.description));
    const fields=node('div','catalog-fields');
    const host=catalogField(fields,T('IP / хост'),'text',url.hostname,'catalog-host');host.maxLength=253;
    const port=catalogField(fields,T('Порт'),'number',url.port || (url.protocol==='https:'?443:80),'catalog-port');
    const protocol=catalogField(fields,T('Схема'),'select',url.protocol,'catalog-protocol',{options:[['http:','HTTP'],['https:','HTTPS']]});
    const mode=catalogField(fields,T('Открытие'),'select',old?.mode||'auto','catalog-mode',{options:[['auto',T('Авто')],['embedded',T('Внутри')],['external',T('Отдельно')]]});
    const footer=node('div','catalog-foot');
    footer.append(node('span','catalog-hint',old?T('Настройки сохранены'):T('Выключено · готово к настройке')));
    const save=node('button','mini secondary catalog-save',T('Сохранить'));save.type='button';footer.append(save);
    async function apply(enabled) {
      try {
        const next=makeCatalogApp(selected,template.id,{hostname:host.value.trim(),port:validatePort(port.value),protocol:protocol.value,mode:mode.value},enabled,old);
        const found=apps.findIndex(a=>a.presetId===template.id);
        if(found<0) {if(apps.length>=100)throw Error('Максимум 100 приложений на роутер.');apps.push(next);}
        else apps[found]=next;
        await persist(template.name+(enabled?(lang==='en'?' — enabled.':' — включено.'):(lang==='en'?' — settings saved, integration disabled.':' — настройки сохранены, интеграция выключена.')));
      }catch(error){notify(template.name+': '+T(error.message),true);toggle.checked=Boolean(old && old.enabled!==false);}
    }
    toggle.addEventListener('change',()=>apply(toggle.checked));
    save.addEventListener('click',()=>apply(toggle.checked));
    card.append(top,description,fields,footer);grid.append(card);
  }
}
async function persist(message) {
  state = await writeState(state); render(); notify(message);
}
async function initialize() {
  lang = await readLanguage();
  state = await readState(); render(); translateUI();
  $('#ui-language').addEventListener('change',async e=>{lang=await writeLanguage(e.target.value);render();translateUI();notify(lang==='en'?'Language changed.':'Язык изменён.');});
  $('#routers').addEventListener('change', e => { selected = e.target.value; clearForm(); render(); });
  $('#router-theme').addEventListener('change', async e => { if (!selected) return; state.routers[selected].theme = e.target.value; await persist(lang==='en'?'Theme saved. Keenetic UI will update automatically.':'Тема сохранена. Интерфейс Keenetic обновится автоматически.'); });
  $('#open-router').addEventListener('click', () => chrome.tabs.create({ url: selected }));
  $('#delete-router').addEventListener('click', async () => {
    if (!selected || !confirm(lang==='en'?`Delete profile ${state.routers[selected].label} and its applications?`:`Удалить профиль ${state.routers[selected].label} и все его приложения?`)) return;
    const removedOrigin = selected;
    delete state.routers[selected]; selected = ''; clearForm(); await persist(T('Профиль удалён.'));
    if (!Object.keys(state.routers).some(origin => hostMatch(origin) === hostMatch(removedOrigin))) {
      try { await chrome.permissions.remove({ origins: [hostMatch(removedOrigin)] }); }
      catch (error) { notify((lang==='en'?'Profile deleted, but remove the browser permission manually: ':'Профиль удалён, но разрешение браузера нужно снять вручную: ')+error.message, true); }
    }
  });
  $('#cancel').addEventListener('click', clearForm);
  $('#app-form').addEventListener('submit', async ev => {
    ev.preventDefault(); if (!selected) return;
    try {
      const app = cleanApp({ id: editingId, name: $('#name').value, url: $('#url').value, mode: $('#mode').value, icon: $('#icon').value });
      const apps = state.routers[selected].apps;
      if (editingId) {
        const index=apps.findIndex(a=>a.id===editingId);
        if (index<0) throw Error('Приложение для изменения не найдено.');
        apps[index]=app;
      } else {
        if (apps.length>=100) throw Error('Максимум 100 приложений на роутер.');
        apps.push(app);
      }
      clearForm(); await persist(lang==='en'?'Application saved. Open Keenetic to use the Applications menu.':'Приложение сохранено. Открой Keenetic, пункт «Приложения» появится автоматически.');
    } catch (error) { notify(T(error.message),true); }
  });
  $('#export').addEventListener('click', () => {
    const data=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
    const u=URL.createObjectURL(data); const a=document.createElement('a'); a.href=u; a.download='routerforge-portal-config.json'; a.click();
    setTimeout(()=>URL.revokeObjectURL(u),1000);
  });
  $('#import').addEventListener('click', () => $('#file').click());
  $('#file').addEventListener('change', async e => {
    const file=e.target.files[0]; e.target.value=''; if (!file) return;
    try {
      if (file.size>200000) throw Error(T('Файл слишком большой.'));
      const next=cleanState(JSON.parse(await file.text()));
      if (!confirm(lang==='en'?'Replace all existing profiles and applications with the imported configuration?':'Заменить текущие профили и приложения импортированными?')) return;
      state=next; selected=''; clearForm(); await persist(T('Импорт выполнен. Для новых роутеров выдай доступ через браузер.'));
    } catch (error) { notify((lang==='en'?'Import failed: ':'Импорт не выполнен: ')+T(error.message),true); }
  });
  $('#update-current').textContent='v'+(chrome.runtime?.getManifest?.()?.version || '0.9.0');
  $('#check-updates').addEventListener('click', manualUpdateCheck);
  chrome.storage.onChanged.addListener(async (changes,area) => {
    if(area==='local' && KEY in changes){ state=await readState(); render(); }
    if(area==='local' && LANGUAGE_KEY in changes){ lang=await readLanguage(); render(); translateUI(); }
  });
}
initialize().catch(e=>notify(e.message,true));
