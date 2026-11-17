import {loadRegistry,saveRegistry,cleanServer,cleanApp,removeServer,appUrl,urlOf,legacyReadOnly,portableExport,attachStandalonePanels,prepareProfileImport} from './shared/portal2_registry.js';
import {PortalVault} from './shared/portal2_vault.js';
import {secureBackup,openBackup,isSecureBackup} from './shared/portal2_bundle.js';
import {read3xui,parseStatus,statusUrl,panelBasePath,adminRequest} from './shared/portal2_3xui.js';
import {diagnose} from './shared/portal2_doctor.js';
import {SNAPSHOT_KEY,CONFIG_KEY,safeSnapshot,apparentState,withoutSecretPath} from './shared/portal2_monitor.js';
import {TEMPLATES} from './shared/portal2_adapters.js';
import {collectWorkspace,restoreWorkspaceChanges,LEGACY,PREF_KEYS} from './shared/portal57_unified.js';

const $=id=>document.getElementById(id);
const vault=new PortalVault();
let registry,selectedServer='',editing=null,credentialApp=null,tokenApp=null,adminApp=null,locale='ru',pendingBackup=null;
let snapshots={},monitorConfig={},tokenFlags={};
const RF57_EMBEDDED=new URLSearchParams(location.search).get('embedded')==='1';
if(RF57_EMBEDDED)document.body.classList.add('rf57-embedded');
const RF58_VIEW=new URLSearchParams(location.search).get('view');
let selectedView=['apps','servers','settings'].includes(RF58_VIEW)?RF58_VIEW:'servers';
const POLL_PREF_KEY='rfPortalR5PollingMinutes';let pollPeriod=1;
const appNotes=new Map(); // session-only; neither results nor requests are persisted
const appMetrics=new Map(); // populated ONLY by the user pressing the status button
const xui3=(app)=>app?.adapter==='3xui';
const TEXT={
 ru:{servers:'Серверы',serverTab:'Мониторинг',appTab:'Веб-панели',settingsTab:'Доступ и диагностика',settingsOverview:'Настройки Portal',serverOverview:'Мониторинг серверов',addServer:'+ Сервер',search:'Поиск серверов…',workspace:'МОЁ РАБОЧЕЕ ПРОСТРАНСТВО',applications:'Приложения',addApp:'+ Приложение',searchApp:'Поиск приложений…',allGroups:'Все группы',privacy:'Локально · без облака',vault:'Portal Vault',vaultHint:'Пароли и токены шифруются. Экспорт профилей скрывает секретные пути 3x-ui.',master:'Мастер-пароль (12+ символов)',unlock:'Открыть / создать',lock:'Заблокировать',vaultOptions:'Настройки Vault',changeMaster:'Сменить пароль',backupVault:'Зашифрованный экспорт',restoreVault:'Импорт Vault',doctor:'Проверка WebUI',doctorHint:'Для обычных сайтов: по кнопке отправляется один запрос HEAD без пароля. Показывает только ответ HTTP, не проверяет работу панели. Для 3x-ui используется отдельный статус API.',legacy:'Старые профили Keenetic (только просмотр)',save:'Сохранить',cancel:'Отмена',username:'Логин',password:'Пароль',credsHint:'Только HTTPS. Точный origin и путь.',tokenTitle:'3x-ui — API token',token:'Bearer token',tokenWarning:'Токен для мониторинга позволяет читать состояние; управление доступно только с подтверждёнными правами администратора.',export:'Экспорт профилей',import:'Импорт профилей',all:'Все серверы',open:'Открыть',edit:'Изменить',remove:'Удалить',fill:'Открыть + заполнить',credentials:'Учётные данные',monitor:'3x-ui статус',doctorRun:'Проверить адрес',tokenSave:'Токен',empty:'Добавь сервер или приложение',selectServer:'Все серверы',unlockFirst:'Разблокируй Vault',vaultLocked:'Vault заблокирован',editServer:'Сервер',editApp:'Веб-приложение',sure:'Подтвердить удаление?',importSure:'Импорт заменит реестр Portal 2. Продолжить?',permission:'Нужно разрешение на сайт',readonly:'Мониторинг выключен по умолчанию'},
 en:{servers:'Servers',serverTab:'Monitoring',appTab:'Web panels',settingsTab:'Access & diagnostics',settingsOverview:'Portal settings',serverOverview:'Server overview',addServer:'+ Server',search:'Search servers…',workspace:'MY WORKSPACE',applications:'Applications',addApp:'+ Application',searchApp:'Search applications…',allGroups:'All groups',privacy:'Local only · no cloud',vault:'Portal Vault',vaultHint:'Passwords are encrypted and excluded from standard profile export.',master:'Master password (12+ characters)',unlock:'Unlock / create',lock:'Lock',vaultOptions:'Vault settings',changeMaster:'Change password',backupVault:'Encrypted export',restoreVault:'Import Vault',doctor:'Check WebUI address',doctorHint:'For generic apps only: one anonymous HEAD on button click. Reports the HTTP response, not full service health. 3x-ui has a separate authenticated status.',legacy:'Existing Keenetic profiles (read only)',save:'Save',cancel:'Cancel',username:'Username',password:'Password',credsHint:'HTTPS only. Bound to exact origin and path.',tokenTitle:'3x-ui — API token',token:'Bearer token',tokenWarning:'Use monitor-scope token, never admin.',export:'Export profiles',import:'Import profiles',all:'All servers',open:'Open',edit:'Edit',remove:'Remove',fill:'Open & fill',credentials:'Credentials',monitor:'3x-ui status',doctorRun:'Check URL',tokenSave:'Token',empty:'Add a server or application',selectServer:'All servers',unlockFirst:'Unlock Vault first',vaultLocked:'Vault locked',editServer:'Server',editApp:'Web application',sure:'Confirm deletion?',importSure:'Import replaces Portal 2 registry. Continue?',permission:'Site permission required',readonly:'Monitoring is disabled by default'}
};
const t=k=>TEXT[locale][k]||k;
const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const button=(text,fn,cls='')=>{const b=node('button',cls,text);b.type='button';b.addEventListener('click',()=>{try{Promise.resolve(fn()).catch(showError);}catch(e){showError(e);}});return b;};
const showError=e=>{const code=String(e?.message||e);status(code,true);if($('editor')?.open){const el=$('editor-error');if(el){el.textContent=code;el.hidden=false;}}};
function status(message,bad=false){const n=$('status');n.dataset.rf59RawMessage=String(message||'');n.textContent=rf59HumanStatus(message);n.hidden=!message;n.dataset.error=bad?'true':'false';n.scrollIntoView?.({block:'nearest',behavior:'smooth'});}

// R5.9: canonical server center static localization. Never mutate user values.
function rf59ApplyCenterLocale(){
 const en=locale==='en';document.documentElement.lang=en?'en':'ru';
 const all={
  '.overview-hint':['HTTP RTT ≠ ICMP ping · Автоопрос только после включения · при закрытом Chrome проверок нет.','HTTP RTT ≠ ICMP ping · Automatic checks require consent · No checks when Chrome is closed.'],
  '.settings-intro':['Учётные данные и диагностика хранятся локально. Проверки выполняются только по команде или при включённом мониторинге.','Credentials and diagnostics stay on this device. Checks run only on request or with enabled monitoring.'],
  '.tools-summary h2':['Vault и диагностика','Vault & diagnostics'],
  '#viewer-title':['Веб-приложение','Web application'],
  '#viewer-external':['↗ Открыть в новой вкладке','↗ Open in new tab'],
  '#viewer-close':['× Закрыть','× Close'],
  '#management-dialog > .hint':['Доступно после подтверждения admin-прав. Все действия выполняются вручную.','Available after admin permissions are confirmed. All actions require a user click.'],
  '#admin-inbounds':['Список входящих подключений','Inbound list'],
  '#admin-restart':['Перезапустить Xray','Restart Xray'],
  '#admin-close':['Закрыть','Close'],
  '#save-token':['Проверить и сохранить','Verify and save'],
  '#remove-token':['Удалить токен','Remove token'],
  '#cancel-token':['Закрыть','Close'],
  '#migrate-legacy-admin':['Использовать прежний admin-токен','Use previous admin token'],
  '#backup-confirm':['Продолжить','Continue'],
  '#backup-cancel':['Отмена','Cancel'],
  '#management-dialog > h2':['Управление 3x-ui','3x-ui management'],
  '#token-dialog > form > h2':['Доступ к API 3x-ui','3x-ui API access'],
  '#backup-dialog > form > h2':['Защищённый бэкап','Encrypted backup']
 };
 for(const [selector,pair] of Object.entries(all)){
  const el=document.querySelector(selector);
  if(!el)continue;
  // Scope hint contains a dynamic count: leave the numeric count intact.
  if(selector==='.overview-hint'){
   const first=[...el.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);
   if(first)first.nodeValue=pair[en?1:0]+' ';
  }else if(el.id==='viewer-title' && $('app-viewer')?.open)continue;
  else if(el.id==='backup-title'&&$('backup-dialog')?.open)continue;
  else el.textContent=pair[en?1:0];
 }
 const sel=$('monitor-period');if(sel){for(const option of sel.options){const n=Number(option.value);option.textContent=n===1?(en?'1 minute':'1 минута'):(en?`${n} minutes`:`${n} ${[2].includes(n)?'минуты':'минут'}`);}}
 const filters=$('group-filter');if(filters){for(const option of filters.options){
  const map={routerforge:['RouterForge','RouterForge'],network:['Сеть','Network'],security:['Безопасность','Security'],other:['Другое','Other']};
  if(map[option.value])option.textContent=map[option.value][en?1:0];
 }}
 const textNodes={
  '.monitor-period-label':['Интервал ','Interval '],
  '#token-dialog label':['Bearer-токен ','Bearer token '],
  '#backup-dialog label:not(#backup-repeat-label)':['Пароль бэкапа (от 12 символов) ','Backup password (12+ characters) '],
  '#backup-repeat-label':['Повтори пароль ','Repeat password ']
 };
 for(const [selector,pair] of Object.entries(textNodes)){
  const el=document.querySelector(selector);if(!el)continue;
  const child=[...el.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);if(child)child.nodeValue=pair[en?1:0];
 }
 const placeholders={'#new-master':['Новый мастер-пароль','New master password'],'#token-input':['Вставь один API-токен','Paste one API token']};
 for(const [selector,pair] of Object.entries(placeholders)){const el=$(selector);if(el)el.placeholder=pair[en?1:0];}
 $('vault-state').textContent=vault.unlocked?(en?'UNLOCKED':'ОТКРЫТ'):(en?'LOCKED':'ЗАКРЫТ');
}
function rf59HumanStatus(message){
 const raw=String(message||'');const en=locale==='en';
 if(raw.includes('VAULT_UNLOCKED_MONITOR_RESUME_FAILED')&&raw.includes('SITE_PERMISSION_DENIED'))
  return en?'Vault unlocked. Automatic monitoring was not resumed: site permission is required. Allow access to the server in Chrome extension permissions.':'Vault открыт. Автоопрос не возобновлён: Chrome не разрешил доступ к сайту сервера. Разреши доступ в настройках расширения Chrome.';
 if(raw.includes('SITE_PERMISSION_DENIED'))return en?'Chrome site access denied. Check extension site permissions.':'Chrome запретил доступ к сайту. Проверь разрешения сайтов для расширения.';
 const fixed={
  'Credential encrypted':['Учётные данные зашифрованы и сохранены.','Credentials encrypted and saved.'],
  'Master password changed':['Мастер-пароль изменён.','Master password changed.'],
  'Vault imported, unlock required':['Vault импортирован. Для доступа введи мастер-пароль.','Vault imported. Enter the master password to unlock.'],
  'Vault разблокирован. Сохранённые токены доступны.':['Vault открыт. Сохранённые токены доступны.','Vault unlocked. Saved tokens are available.'],
 };
 return fixed[raw]?fixed[raw][en?1:0]:raw;
}

function refreshLocale(){for(const el of document.querySelectorAll('[data-t]'))el.textContent=t(el.dataset.t);for(const el of document.querySelectorAll('[data-placeholder]'))el.placeholder=t(el.dataset.placeholder);rf59ApplyCenterLocale();const notice=$('status');if(notice&&!notice.hidden){notice.textContent=rf59HumanStatus(notice.dataset.rf59RawMessage||notice.textContent);}render();}
function reportApp(a,message,bad=false){appNotes.set(a.id,{message,bad});status(a.name+': '+message,bad);renderApps();renderServerDashboard();}
function makeField(parent,label,value='',type='text',wide=false){const wrap=node('label',wide?'wide':'');wrap.textContent=label;const input=node('input');input.type=type;input.value=value??'';wrap.append(input);parent.append(wrap);return input;}
function makeSelect(parent,label,values,current){const wrap=node('label');wrap.textContent=label;const input=node('select');for(const [v,name] of values){const opt=node('option','',name);opt.value=v;input.append(opt);}input.value=current;wrap.append(input);parent.append(wrap);return input;}
async function refreshTokenFlags(){
 const data=await vault.data();tokenFlags={};
 for(const a of registry?.apps||[]){if(!xui3(a))continue;
  try{const e=data?.entries?.['tok_'+a.id],u=new URL(selectedUrl(a));
   tokenFlags[a.id]=Boolean(e&&e.origin===u.origin&&(u.pathname===e.path||u.pathname.startsWith(e.path.endsWith('/')?e.path:e.path+'/')));
  }catch{tokenFlags[a.id]=false;}
 }
}
function updateVault(){ $('vault-state').textContent=vault.unlocked?(locale==='en'?'UNLOCKED':'ОТКРЫТ'):(locale==='en'?'LOCKED':'ЗАКРЫТ');$('vault-state').style.color=vault.unlocked?'#8ee6ae':'#a9cce5';}
function setView(view){selectedView=['apps','servers','settings'].includes(view)?view:'servers';render();}
function showVaultSettings(){setView('settings');requestAnimationFrame(()=>{const field=$('master');if(field){field.focus();field.scrollIntoView?.({block:'nearest'});}});}

function render(){
 if(!registry)return;
 for(const [tab,view] of [['nav-servers','servers'],['nav-apps','apps'],['nav-settings','settings']])$(''+tab).setAttribute('aria-current',selectedView===view?'page':'false');
 $('servers-view').hidden=selectedView!=='servers';$('apps-view').hidden=selectedView!=='apps';$('settings-view').hidden=selectedView!=='settings';
 $('add-app').hidden=selectedView!=='apps';
 $('view-title').textContent=selectedView==='servers'?t('serverOverview'):selectedView==='apps'?t('appTab'):t('settingsOverview');
 $('scope-title').hidden=selectedView==='settings';
 document.querySelector('.heading').hidden=selectedView==='settings';
 renderServers();renderApps();renderServerDashboard();updateVault();
}
function renderServers(){
 const holder=$('servers');holder.replaceChildren();const q=$('server-filter').value.toLocaleLowerCase();
 const all=node('div','server-row');all.append(button(t('all'),()=>{selectedServer='';setView('servers');},selectedServer?'':'selected'));holder.append(all);
 for(const s of registry.servers.filter(s=>[s.name,s.locationLabel,...s.tags].join(' ').toLocaleLowerCase().includes(q))){
  const row=node('div','server-row');const select=button('',()=>{selectedServer=s.id;setView('servers');},selectedServer===s.id?'selected':'');select.append(node('strong','',s.name),node('small','',[s.locationLabel,...s.tags].filter(Boolean).join(' · ')));
  row.append(select,button('✎',()=>openServerEditor(s),'icon-button'));holder.append(row);
 }
}
function stateLabel(state){const names={NOT_CHECKED:'Не проверялся',STALE:'Нет свежих данных',OK:'Доступен',XRAY_STOPPED:'Xray остановлен',API_AUTH_REQUIRED:'Нужен токен / вход',API_FORBIDDEN:'Недостаточно прав',UNSUPPORTED:'API не поддерживается',NETWORK_ERROR:'Ошибка сети / TLS',TIMEOUT:'Таймаут',RATE_LIMIT:'Лимит запросов',VAULT_LOCKED:'Требуется возобновить авторизацию',PERMISSION_REQUIRED:'Нет разрешения сайта'};return locale==='ru'?(names[state]||state):state;}
function monitorSnapshot(app){const s=snapshots[app.id]?.latest;return {snapshot:s,state:apparentState(s,monitorConfig[app.id]?.period||1)};}
async function pullMonitoringState(){const x=await chrome.storage.local.get([SNAPSHOT_KEY,CONFIG_KEY]);snapshots=x[SNAPSHOT_KEY]||{};monitorConfig=x[CONFIG_KEY]||{};}
async function storeManualSnapshot(app,result){const item=safeSnapshot(app.id,result,snapshots[app.id]?.latest),history=(snapshots[app.id]?.history||[]).slice(-71);history.push({checkedAt:item.checkedAt,state:item.state,rttMs:item.rttMs,cpu:item.cpu||null});snapshots[app.id]={latest:item,history};await chrome.storage.local.set({[SNAPSHOT_KEY]:snapshots});}
async function toggleMonitor(app){
 const on=Boolean(monitorConfig[app.id]?.enabled);
 if(on&&!monitorConfig[app.id]?.needsAuth){const res=await chrome.runtime.sendMessage({type:'PORTAL_R5_MONITOR_DISABLE',appId:app.id});if(!res?.ok)throw Error(res?.error||'DISABLE_FAILED');await pullMonitoringState();render();return;}
 if(!vault.unlocked){showVaultSettings();throw Error('Открой Vault и сохрани API-токен для сервера');}
 const url=selectedUrl(app);await ensureOrigin(url);let token;try{token=await vault.get('tok_'+app.id,url);}catch{throw Error('Сначала сохрани API-токен в подключении');}
 if(!confirm('Включить опрос 3x-ui каждые '+$('monitor-period').value+' мин. пока открыт Chrome? При закрытии браузера токен удалится из памяти; после запуска понадобится разблокировать Vault и возобновить опрос.'))return;
 const res=await chrome.runtime.sendMessage({type:'PORTAL_R5_MONITOR_ENABLE',appId:app.id,token,period:Number($('monitor-period').value)});token='';if(!res?.ok)throw Error(res?.error||'ENABLE_FAILED');await pullMonitoringState();render();
}
function renderServerDashboard(){
 const holder=$('server-cards');holder.replaceChildren();
 const q=$('server-filter').value.toLocaleLowerCase();
 const servers=registry.servers.filter(s=>(!selectedServer||s.id===selectedServer)&&[s.name,s.locationLabel,...s.tags].join(' ').toLocaleLowerCase().includes(q));
 $('server-overview-count').textContent=servers.length+' / '+registry.servers.length;
 if(!servers.length){holder.append(node('p','hint',registry.servers.length?(locale==='ru'?'Ничего не найдено.':'No matching servers.'):(locale==='ru'?'Добавь первый сервер кнопкой слева.':'Add your first server using the left button.')));return;}
 for(const server of servers){
  const panels=registry.apps.filter(a=>a.serverId===server.id);
  const card=node('article','server-card compact-server');card.dataset.serverId=server.id;
  const head=node('div','server-card-head compact-head');
  const identity=node('div','compact-identity');identity.append(node('h2','',server.name));
  const subtitle=[server.locationLabel,...server.tags].filter(Boolean).join(' · ');
  if(subtitle)identity.append(node('p','server-subtitle',subtitle));
  head.append(identity);
  if(panels.length===1){
   const a=panels[0],current=monitorSnapshot(a);
   const label=node('span','compact-state',xui3(a)&&monitorConfig[a.id]?.needsAuth?'Нужен Vault':xui3(a)?stateLabel(current.state):(locale==='ru'?'Веб-панель':'Web panel'));label.dataset.state=xui3(a)?current.state:'NOT_CHECKED';
   head.append(label);
   if(xui3(a))head.append(node('span','compact-rtt',Number.isFinite(current.snapshot?.rttMs)?'HTTP RTT '+current.snapshot.rttMs+' мс':'HTTP RTT —'));
   head.append(button(locale==='ru'?'↗ Веб-панель':'↗ Web panel',()=>openApp(a),'compact-open'));
  }else head.append(node('span','compact-count',panels.length+' '+(locale==='ru'?'панелей':'panels')));
  card.append(head);
  if(!panels.length){const empty=node('div','compact-empty',locale==='ru'?'Нет веб-панелей':'No web panels');empty.append(button(locale==='ru'?'+ Добавить панель':'+ Add panel',()=>{selectedServer=server.id;setView('apps');openAppEditor(null,server.id);}));card.append(empty);holder.append(card);continue;}
  for(const a of panels){
   const detail=node('div',panels.length===1?'compact-detail':'compact-detail compact-multi');
   const current=xui3(a)?monitorSnapshot(a):{snapshot:null,state:'NOT_CHECKED'};
   const snap=current.snapshot;
   const hasMetrics=xui3(a)&&snap&&(snap.state==='OK'||snap.state==='XRAY_STOPPED');
   if(panels.length!==1){const aHead=node('div','compact-panel-head');aHead.append(node('strong','',a.name));const badge=node('span','compact-state',xui3(a)?stateLabel(current.state):'WebUI');badge.dataset.state=xui3(a)?current.state:'NOT_CHECKED';aHead.append(badge);if(xui3(a))aHead.append(node('span','compact-rtt',Number.isFinite(snap?.rttMs)?'HTTP RTT '+snap.rttMs+' мс':'HTTP RTT —'));aHead.append(button(locale==='ru'?'↗ Веб-панель':'↗ Web panel',()=>openApp(a),'compact-open'));detail.append(aHead);}
   if(xui3(a)){
    const grid=node('div','compact-metrics');
    const data=[['CPU',hasMetrics&&Number.isFinite(snap.cpu)?snap.cpu.toFixed(1)+'%':'—'],['RAM',hasMetrics?metricPercentage(snap.mem):'—'],[(locale==='ru'?'Диск':'Disk'),hasMetrics?metricPercentage(snap.disk):'—'],['Xray',hasMetrics?(snap.xray?.state==='running'?(locale==='ru'?'Работает':'Running'):snap.xray?.state==='stopped'?(locale==='ru'?'Остановлен':'Stopped'):(snap.xray?.state||'—')):'—']];
    for(const [key,value] of data){const cell=node('div','compact-metric');cell.append(node('span','',key),node('strong','',value));grid.append(cell);}detail.append(grid);
   }
   const meta=node('div','compact-meta');
   if(xui3(a)){
    const traffic=hasMetrics&&snap.rate?(locale==='ru'?'Скорость':'Rate')+' ↑ '+formatBytes(snap.rate.up)+'/с · ↓ '+formatBytes(snap.rate.down)+'/с':(locale==='ru'?'Скорость —':'Rate —');
    meta.append(node('span','',traffic));
    if(snap?.checkedAt){const when=new Date(snap.checkedAt);meta.append(node('span','',locale==='ru'?'Проверено '+when.toLocaleString('ru-RU'):'Checked '+when.toLocaleString('en-US')));}
    else meta.append(node('span','',locale==='ru'?'Не проверялся':'Not checked'));
    meta.append(node('span','',monitorConfig[a.id]?.enabled?(monitorConfig[a.id]?.needsAuth?(locale==='ru'?'Авто: нужен Vault':'Auto: unlock Vault'):(locale==='ru'?'Авто: вкл':'Auto: on')):(locale==='ru'?'Авто: выкл':'Auto: off')));
    if(tokenFlags[a.id]&&!vault.unlocked)meta.append(node('span','',locale==='ru'?'🔒 Токен сохранён (Vault закрыт)':'🔒 Token saved (Vault locked)'));
   }else meta.append(node('span','',locale==='ru'?'Ручная проверка WebUI':'Manual WebUI check'));
   detail.append(meta);
   const actions=node('div','actions compact-actions');
   if(xui3(a))actions.append(button(locale==='ru'?'↻ Проверить':'↻ Check',()=>monitor(a)),button(locale==='ru'?'🔑 Подключение':'🔑 Connection',()=>openToken(a)),...((a.tokenRole==='admin'&&tokenFlags[a.id])?[button(locale==='ru'?'⚙ Управление':'⚙ Management',()=>openManagement(a))]:[]));
   else actions.append(button(t('doctorRun'),()=>doctorApp(a)));
   actions.append(button(t('edit'),()=>openAppEditor(a)));
   if(xui3(a))actions.append(button(monitorConfig[a.id]?.enabled?(monitorConfig[a.id]?.needsAuth?(locale==='ru'?'▶ Возобновить':'▶ Resume'):(locale==='ru'?'■ Авто: выкл':'■ Auto: off')):(locale==='ru'?'▶ Авто: вкл':'▶ Auto: on'),()=>toggleMonitor(a),'compact-auto'));
   detail.append(actions);
   const note=appNotes.get(a.id);if(note){const message=node('p','compact-note',note.message);message.dataset.error=note.bad?'true':'false';detail.append(message);}
   card.append(detail);
  }
  holder.append(card);
 }
}
const metricPercentage=x=>x&&x.total>0&&Number.isFinite(x.current)&&Number.isFinite(x.total)?Math.round(x.current/x.total*100)+'%':'—';
const formatBytes=n=>{if(typeof n!=='number'||!Number.isFinite(n)||n<0)return '—';const units=['B','KiB','MiB','GiB','TiB'];let i=0;while(n>=1024&&i<units.length-1){n/=1024;i++;}return (i===0?Math.round(n):n.toFixed(1))+' '+units[i];};
function renderApps(){
 const holder=$('apps');holder.replaceChildren();const q=$('app-filter').value.toLocaleLowerCase(),g=$('group-filter').value;
 const current=registry.servers.find(s=>s.id===selectedServer);$('scope-title').textContent=current?current.name:t('all');
 const apps=registry.apps.filter(a=>(!selectedServer||a.serverId===selectedServer)&&(!g||a.group===g)&&[a.name,a.urlLocal,a.urlRemote,registry.servers.find(s=>s.id===a.serverId)?.name].join(' ').toLocaleLowerCase().includes(q))
  .sort((a,b)=>Number(b.favorite)-Number(a.favorite)||a.name.localeCompare(b.name));
 if(!apps.length)holder.append(node('p','hint',t('empty')));
 for(const a of apps){
  const card=node('article','app-card'),head=node('div','app-title');head.append(node('strong','',a.name),button(a.favorite?'★':'☆',async()=>{a.favorite=!a.favorite;registry=await saveRegistry(registry);render();}));card.append(head);
  card.append(node('div','app-meta',registry.servers.find(s=>s.id===a.serverId)?.name||'Standalone'));
  const appAddress=node('div','app-meta app-address',xui3(a)?withoutSecretPath(appUrl(a)):appUrl(a));appAddress.title=xui3(a)?'Адрес панели скрыт':appUrl(a);card.append(appAddress);
  const row=node('div','actions app-actions');
  row.append(button(xui3(a)?(locale==='ru'?'↗ Открыть 3x-ui':'↗ Open 3x-ui'):t('open'),()=>openApp(a),'app-primary'));
  if(xui3(a))row.append(button(locale==='ru'?'↻ Статус сервера':'↻ Server status',()=>monitor(a)));
  else row.append(button(t('doctorRun'),()=>doctorApp(a)));
  row.append(button(t('edit'),()=>openAppEditor(a)));
  if(a.authMethod==='vault')row.append(button(t('credentials'),()=>openCredentials(a)),button(t('fill'),()=>openAndFill(a)));
  if(xui3(a))row.append(button('🔑 API-токен',()=>openToken(a)));if(xui3(a)&&a.tokenRole==='admin'&&tokenFlags[a.id])row.append(button('⚙ Управление',()=>openManagement(a)));
  // Every panel has a server; legacy standalone entries are attached on load.
  card.append(row);const info=appNotes.get(a.id);if(info){const note=node('p','app-note',info.message);note.dataset.error=info.bad?'true':'false';card.append(note);}holder.append(card);
 }
 const legacyHolder=$('legacy-apps');legacyHolder.replaceChildren();
 // Existing kbridgeState remains source-of-truth; Portal 2 never rewrites it.
 chrome.storage.local.get('kbridgeState').then(data=>{if(!legacyHolder.isConnected)return;legacyHolder.replaceChildren();
 for(const a of legacyReadOnly(data.kbridgeState).slice(0,300))legacyHolder.append(node('p','',a.name+' — '+a.url));
 }).catch(()=>{});
}
async function persist(){registry=await saveRegistry(registry);render();}
function openServerEditor(s=null,attachApp=null){
 editing={kind:'server',id:s?.id||null};$('editor-error').hidden=true;$('editor-title').textContent=t('editServer');const p=$('editor-fields');p.replaceChildren();
 const name=makeField(p,locale==='ru'?'Название сервера':'Server name',s?.name||attachApp?.name||''),location=makeField(p,locale==='ru'?'Расположение / пометка':'Location',s?.locationLabel||''),tags=makeField(p,locale==='ru'?'Метки через запятую':'Tags',s?.tags.join(', ')||'');
 const firstUrl=s?null:makeField(p,locale==='ru'?'Первая панель (HTTPS URL, необязательно)':'First panel (optional HTTPS URL)','', 'url',true);
 const firstName=s?null:makeField(p,locale==='ru'?'Название первой панели':'First panel name','3x-ui');
 const firstAdapter=s?null:makeSelect(p,locale==='ru'?'Тип первой панели':'First panel type',[['3xui','3x-ui'],['none','Generic web app']],'3xui');
 const firstToken=null,masterForWizard=null; // Single API token editor after creating the panel.
 const standalone=registry.apps.filter(x=>!x.serverId);
 if(attachApp){for(const control of [firstUrl,firstName,firstAdapter,firstToken,masterForWizard]){if(control)control.parentElement.hidden=true;}}
 const attach=s||!standalone.length?null:makeSelect(p,locale==='ru'?'Или привязать уже добавленную панель':'Or attach an existing standalone app',[['','Не привязывать'],...standalone.map(x=>[x.id,x.name])],attachApp?.id||'');
 $('save-editor').onclick=()=>Promise.resolve().then(async()=>{const value=cleanServer({id:s?.id,name:name.value,tags:tags.value.split(','),locationLabel:location.value});
  // Validate the full transaction before writing registry; no partial server/app on bad URL.
  const servers=s?registry.servers.map(x=>x.id===s.id?value:x):[...registry.servers,value];
  let initialApp=null;
  if(firstUrl?.value.trim()){const u=urlOf(firstUrl.value),hostname=new URL(u).hostname;
    const isLocal=/^(?:localhost|.*\.local|.*\.lan|10\.|192\.168\.|172\.(?:1[6-9]|2[0-9]|3[0-1])\.)/i.test(hostname) || /^\[(?:fd|fc|fe80)/i.test(hostname);
    initialApp=cleanApp({name:firstName.value.trim()||'WebUI',serverId:value.id,urlLocal:isLocal?u:'',urlRemote:isLocal?'':u,addressMode:isLocal?'local':'remote',adapter:firstAdapter.value,authMethod:'browser',mode:'external'},servers);
  }
  const attached=attach?.value;
  if(attached&&!registry.apps.some(x=>x.id===attached&&!x.serverId))throw Error('STANDALONE_APP_NOT_FOUND');
  const nextApps=registry.apps.map(x=>x.id===attached?{...x,serverId:value.id}:x);
  const hadFirstToken=false;
  registry={...registry,servers,apps:initialApp?[...nextApps,initialApp]:nextApps};
  selectedServer=value.id;selectedView='servers';await persist();$('editor').close();status((locale==='ru'?'Сервер сохранён: ':'Server saved: ')+value.name);
  if(initialApp?.adapter==='3xui'&&!hadFirstToken)status('3x-ui добавлен. Открой «🔑 API-токен» для подключения.');}).catch(showError);
 const old=$('editor-delete');old?.remove();if(s){const del=button(t('remove'),async()=>{if(!confirm(t('sure')))return;for(const a of registry.apps.filter(a=>a.serverId===s.id&&xui3(a))){const stop=await chrome.runtime.sendMessage({type:'PORTAL_R5_MONITOR_DISABLE',appId:a.id});if(!stop?.ok)throw Error('MONITOR_DISABLE_FAILED');}await vault.dropEncrypted(registry.apps.filter(a=>a.serverId===s.id).flatMap(a=>[a.id,'tok_'+a.id,'adm_'+a.id]));for(const app of registry.apps.filter(a=>a.serverId===s.id)){appMetrics.delete(app.id);appNotes.delete(app.id);}registry=removeServer(registry,s.id);selectedServer='';await persist();$('editor').close();});del.id='editor-delete';$('editor-form').append(del);}
 $('editor').showModal();name.focus();
}
function openAppEditor(a=null,preferredServer=''){
 editing={kind:'app',id:a?.id||null};$('editor-error').hidden=true;$('editor-title').textContent=t('editApp');const p=$('editor-fields');p.replaceChildren();
 const name=makeField(p,locale==='ru'?'Название':'Name',a?.name||''),local=makeField(p,locale==='ru'?'LAN-адрес (необязательно)':'LAN URL (optional)',a?.urlLocal||'','url',true),remote=makeField(p,locale==='ru'?'Интернет-адрес HTTPS (необязательно)':'External HTTPS URL (optional)',a?.urlRemote||'','url',true);
 const server=makeSelect(p,locale==='ru'?'Сервер':'Server',[['',locale==='ru'?'Создать автоматически по адресу':'Create automatically from URL'],...registry.servers.map(x=>[x.id,x.name])],a?.serverId||preferredServer||selectedServer||'');
 const serverHelp=node('p','hint wide',locale==='ru'?'Если сервер ещё не добавлен, Portal создаст его по адресу панели. Повторно вводить URL и токен не нужно.':'When no server exists, Portal creates it from the panel address. No duplicate URL or token input.');p.append(serverHelp);
 const address=makeSelect(p,locale==='ru'?'Используемый адрес':'Active URL',[['local','LAN'],['remote','WAN']],a?.addressMode||'remote');
 const mode=makeSelect(p,locale==='ru'?'Открытие':'Open',[['external',locale==='ru'?'Новая вкладка':'External tab'],['embedded',locale==='ru'?'Встроенная панель':'Embedded'],['auto',locale==='ru'?'Автоматически':'Auto']],a?.mode||'external');
 const group=makeSelect(p,locale==='ru'?'Группа':'Group',[['other','Other'],['routerforge','RouterForge'],['network','Network'],['security','Security']],a?.group||'other');
 const auth=makeSelect(p,locale==='ru'?'Вход':'Authentication',[['browser',locale==='ru'?'Сессия браузера':'Browser session'],['vault',locale==='ru'?'Vault — заполнить':'Vault autofill'],['manual',locale==='ru'?'Вручную / SSO':'Manual / SSO']],a?.authMethod||'browser');
 const adapter=makeSelect(p,locale==='ru'?'Интеграция':'Adapter',[['none','Generic'],['3xui','3x-ui']],a?.adapter||'none');
 const template=makeSelect(p,locale==='ru'?'Шаблон':'Application template',[['','Custom'],...TEMPLATES.map(x=>[x.id,x.name])],'');
 template.addEventListener('change',()=>{const tpl=TEMPLATES.find(x=>x.id===template.value);if(tpl){name.value=tpl.name;adapter.value=tpl.adapter;remote.placeholder='https://server.example:'+tpl.defaultPort+'/';}});
 const baseHelp=node('p','hint wide',locale==='ru'?'3x-ui: вставь полный адрес вместе с секретным путём (например, https://vps.example:2053/secret/). Этот же URL откроется в браузере, а адрес API вычислим из него.':'3x-ui: paste the complete URL including its secret path (for example, https://vps.example:2053/secret/). That exact URL opens in the browser; the API path is derived from it.');p.append(baseHelp);
 const updateAdapterUi=()=>{const is3=adapter.value==='3xui';baseHelp.hidden=!is3;mode.disabled=is3;if(is3)mode.value='external';};adapter.addEventListener('change',updateAdapterUi);updateAdapterUi();
 const auto=makeSelect(p,locale==='ru'?'Отправлять форму (не рекомендуется)':'Auto-submit (optional)',[['off','Off — recommended'],['on','On — explicit consent']],a?.autosubmit?'on':'off');
 const advanced=node('details','advanced wide');advanced.append(node('summary','',locale==='ru'?'Дополнительные настройки':'Advanced settings'));
 for(const field of [address,mode,group,template,auto])advanced.append(field.parentElement);advanced.append(baseHelp);p.append(advanced);
 const addressGuide=node('p','hint wide',locale==='ru'?'Укажи LAN или WAN адрес. Для 3x-ui можно вставить полный URL панели, включая секретный путь.':'Paste the entire panel URL, including the custom 3x-ui base path.');p.append(addressGuide);
 // No auto-submit in initial UI: implementation can be enabled only after separate explicit authorization review.
 $('save-editor').onclick=()=>Promise.resolve().then(async()=>{
  const value=cleanApp({id:a?.id,serverId:server.value,name:name.value,urlLocal:local.value,urlRemote:remote.value,addressMode:(address.value==='remote'&&!remote.value.trim()&&local.value.trim()?'local':address.value==='local'&&!local.value.trim()&&remote.value.trim()?'remote':address.value),mode:mode.value,authMethod:auth.value,adapter:adapter.value,tokenRole:a?.tokenRole,basePath:'',group:group.value,favorite:a?.favorite||false,autosubmit:auto.value==='on'&&adapter.value==='3xui'},registry.servers);
  if(value.autosubmit&&!a?.autosubmit&&!confirm('Enable automatic form submit for this 3x-ui app? 2FA and challenges are never bypassed.'))return;
  if(a){if(appUrl(a)!==appUrl(value)){if(xui3(a)){const stop=await chrome.runtime.sendMessage({type:'PORTAL_R5_MONITOR_DISABLE',appId:a.id});if(!stop?.ok)throw Error('MONITOR_DISABLE_FAILED');}await vault.dropEncrypted([a.id,'tok_'+a.id,'adm_'+a.id]);} appMetrics.delete(a.id);appNotes.delete(a.id);}
  // Bind by server id, not by re-entering the already saved 3x-ui URL/token.
  const nextApps=a?registry.apps.map(x=>x.id===a.id?value:x):[...registry.apps,value];
  const bound=attachStandalonePanels({...registry,apps:nextApps});
  const saved=bound.registry.apps.find(x=>x.id===value.id);
  registry=bound.registry;
  if(!a||!a.serverId){selectedServer=saved.serverId;selectedView='servers';}
  await persist();$('editor').close();status((locale==='ru'?'Панель и сервер сохранены: ':'Panel and server saved: ')+value.name);}).catch(showError);
 const old=$('editor-delete');old?.remove();if(a){const del=button(t('remove'),async()=>{if(!confirm(t('sure')))return;if(xui3(a)){const stop=await chrome.runtime.sendMessage({type:'PORTAL_R5_MONITOR_DISABLE',appId:a.id});if(!stop?.ok)throw Error('MONITOR_DISABLE_FAILED');}await vault.dropEncrypted([a.id,'tok_'+a.id,'adm_'+a.id]);registry.apps=registry.apps.filter(x=>x.id!==a.id);appMetrics.delete(a.id);appNotes.delete(a.id);await persist();$('editor').close();});del.id='editor-delete';$('editor-form').append(del);}
 $('editor').showModal();name.focus();
}
const selectedUrl=a=>urlOf(appUrl(a));
async function ensureOrigin(url){
 const u=new URL(url),match=u.protocol+'//'+u.hostname+'/*';
 // Must be called directly during an explicit user click. Existing grant resolves silently.
 if(!await chrome.permissions.request({origins:[match]}))throw Error('SITE_PERMISSION_DENIED');
 return u.origin;
}
async function openApp(a){
 const url=selectedUrl(a);
 if(xui3(a)||a.mode==='external'){await chrome.tabs.create({url});status((locale==='ru'?'Открыто в отдельной вкладке: ':'Opened in a tab: ')+a.name);return;}
 $('viewer-title').textContent=a.name;$('viewer-frame').src=url;
 $('viewer-external').onclick=()=>chrome.tabs.create({url}).catch(showError);
 $('app-viewer').showModal();
}

async function doctorApp(a){
 if(xui3(a))return monitor(a); // Do NOT probe a 3x-ui login/dashboard URL with anonymous HEAD.
 const url=selectedUrl(a);await ensureOrigin(url);
  const result=await diagnose(url);const note=result.state==='AUTH_REQUIRED'?(locale==='ru'?'Сайт отвечает, но требует входа.':'Site reachable; sign-in required.'):result.state==='REACHABLE'?(locale==='ru'?'Сервис отвечает. Встраивание отдельно не подтверждено.':'Service responds; embedding not verified.'):(locale==='ru'?'Не удалось определить доступность. Проверь адрес, TLS и вход.':'Availability uncertain. Check URL, TLS and sign-in.');reportApp(a,note+' ('+result.reason+')',result.state==='UNKNOWN');
}
async function openCredentials(a){
 if(!vault.unlocked){showVaultSettings();throw Error(t('unlockFirst'));}
 if(new URL(selectedUrl(a)).protocol!=='https:')throw Error('VAULT_REQUIRES_HTTPS');
 credentialApp=a;$('credential-title').textContent=a.name;$('cred-user').value='';$('cred-pass').value='';$('credential').showModal();
}
async function openManagement(a){
 if(!vault.unlocked){showVaultSettings();throw Error('Открой Vault для ручного управления');}
 if(a.tokenRole!=='admin'||!tokenFlags[a.id])throw Error('TOKEN_MONITOR_ONLY');
 adminApp=a;$('management-title').textContent='Управление · '+a.name;$('admin-result').textContent='Операции только по команде';$('management-dialog').showModal();
}
async function adminExecute(op){
 if(!adminApp||!vault.unlocked||adminApp.tokenRole!=='admin'||!tokenFlags[adminApp.id])throw Error('ADMIN_TOKEN_REQUIRED');
 const a=adminApp,url=selectedUrl(a);await ensureOrigin(url);
 const token=await vault.get('tok_'+a.id,url);
 if(op==='restart-xray'&&prompt('Для перезапуска Xray на сервере '+a.name+' введи его имя:')!==a.name)return;
 const result=await adminRequest(a,url,token,op);$('admin-result').textContent=result.state!=='OK'?result.state+' · '+(result.reason||''):
  op==='inbounds'?(result.inbounds.length+' inbound(s)\n'+result.inbounds.map(x=>[x.remark,x.protocol,x.port,x.enabled?'ON':'OFF','clients '+(x.clients??'—')].join(' · ')).join('\n')):'Команда перезапуска Xray принята 3x-ui';
}
async function openToken(a){
 if(!vault.unlocked){showVaultSettings();throw Error(t('unlockFirst'));}
 if(new URL(selectedUrl(a)).protocol!=='https:')throw Error('VAULT_REQUIRES_HTTPS');
 tokenApp=a;$('token-input').value='';const data=await vault.data();
 const single=!!data?.entries?.['tok_'+a.id],legacy=!!data?.entries?.['adm_'+a.id];
 const match=single&&tokenFlags[a.id];
 $('token-status').textContent=match?'Токен сохранён в зашифрованном Vault · '+(a.tokenRole==='admin'?'admin':'monitor'):single?'Токен есть, но адрес/секретный путь панели изменён. Проверь исходный URL.':legacy?'Найден старый admin-токен. Вставь его повторно для объединения.':'Токен не сохранён';
 $('migrate-legacy-admin').hidden=!legacy;$('token-dialog').showModal();
}
async function waitForTab(id){
 const now=await chrome.tabs.get(id);if(now.status==='complete')return now;
 return new Promise((resolve,reject)=>{
  let timer;const cleanup=()=>{chrome.tabs.onUpdated.removeListener(listener);clearTimeout(timer);};
  const listener=(tabId,info,tab)=>{if(tabId===id&&info.status==='complete'){cleanup();resolve(tab);}};
  chrome.tabs.onUpdated.addListener(listener);timer=setTimeout(()=>{cleanup();reject(Error('TAB_LOAD_TIMEOUT'));},15000);
 });
}
// Runs in isolated extension world in ONLY the main frame of a chosen, newly opened tab.
function fillKnownForm(credential,expectedOrigin,expectedPath,allowSubmit){
 if(location.origin!==expectedOrigin||!(location.pathname===expectedPath.replace(/\/$/,'')||location.pathname.startsWith(expectedPath.endsWith('/')?expectedPath:expectedPath+'/')))return {ok:false,error:'BINDING_MISMATCH'};
 const visible=e=>e.getClientRects().length>0&&!e.disabled;
 const pw=[...document.querySelectorAll('input[type="password"]')].filter(visible);
 if(pw.length!==1)return {ok:false,error:'UNSUPPORTED_PASSWORD_FORM'};
 const form=pw[0].form;
 if(form&&new URL(form.action,location.href).origin!==location.origin)return {ok:false,error:'CROSS_ORIGIN_FORM'};
 // SPA login screens, including supported 3x-ui versions, can have no HTML form element.
 const scope=form||document;
 const users=[...new Set(scope.querySelectorAll('input[type="text"],input[type="email"],input[name="username"],input[autocomplete="username"]'))].filter(visible).filter(e=>e!==pw[0]);
 if(users.length!==1)return {ok:false,error:'UNSUPPORTED_USERNAME_FORM'};
 const set=(el,value)=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;if(setter)setter.call(el,value);else el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));};
 set(users[0],credential.username);set(pw[0],credential.password);
 // Never silently bypass MFA, WebAuthn, CAPTCHA or challenge forms.
 const challenge=Boolean((form||document).querySelector('input[autocomplete="one-time-code"],input[name*="totp" i],input[name*="otp" i],iframe,[id*="captcha" i]'));
 const canSubmit=allowSubmit&&!challenge&&form&&typeof form.requestSubmit==='function';
 if(canSubmit)form.requestSubmit();
 return {ok:true,submitted:Boolean(canSubmit)};
}
async function openAndFill(a){
 if(!vault.unlocked){showVaultSettings();throw Error(t('unlockFirst'));}
 const url=selectedUrl(a),u=new URL(url);
 if(u.protocol!=='https:')throw Error('VAULT_REQUIRES_HTTPS');
 // Begin permission request in the user-click flow; never request blanket access.
 await ensureOrigin(url);
 const raw=await vault.get(a.id,url),credentials=JSON.parse(raw);
 if(typeof credentials.username!=='string'||typeof credentials.password!=='string')throw Error('INVALID_CREDENTIAL');
 const tab=await chrome.tabs.create({url});await waitForTab(tab.id);
 const actual=await chrome.tabs.get(tab.id);
 const bindPath=a.adapter==='3xui'?panelBasePath(a,url):u.pathname;
 if(new URL(actual.url).origin!==u.origin||!(new URL(actual.url).pathname===bindPath.replace(/\/$/,'')||new URL(actual.url).pathname.startsWith(bindPath.endsWith('/')?bindPath:bindPath+'/')))throw Error('REDIRECT_BLOCKED');
 const results=await chrome.scripting.executeScript({target:{tabId:tab.id,allFrames:false},func:fillKnownForm,args:[credentials,u.origin,bindPath,Boolean(a.autosubmit&&a.adapter==='3xui')]});
 credentials.username='';credentials.password='';
 const r=results?.[0]?.result;status(r?.ok?(locale==='ru'?'Логин и пароль заполнены — проверь и нажми «Войти».':'Fields filled — review and sign in.'):(locale==='ru'?'Автозаполнение не удалось: ':'Autofill failed: ')+(r?.error||'UNKNOWN'),!r?.ok);
}
// Session mode executes a single same-origin GET inside an already authenticated 3x-ui tab.
// This avoids cross-site SameSite cookie/CORS assumptions of extension-page fetch.
async function read3xuiFromSignedInTab(app,activeUrl){
 const api=statusUrl(app,activeUrl),origin=new URL(activeUrl).origin,base=panelBasePath(app,activeUrl);
 const tabs=await chrome.tabs.query({});
 const valid=(tab)=>{try{const u=new URL(tab.url);return u.origin===origin&&(u.pathname===base.slice(0,-1)||u.pathname.startsWith(base));}catch{return false;}};
 const tab=tabs.filter(valid).sort((x,y)=>Number(y.active)-Number(x.active))[0];
 if(!tab?.id)return {state:'SESSION_TAB_REQUIRED',reason:'OPEN_SIGNED_IN_TAB'};
 const fetchInTab=async (apiUrl,expectedOrigin,expectedBase)=>{
  if(location.origin!==expectedOrigin || !(location.pathname===expectedBase.slice(0,-1)||location.pathname.startsWith(expectedBase)))return {state:'BLOCKED',reason:'TAB_ORIGIN_OR_PATH_CHANGED'};
  const u=new URL(apiUrl);
  if(u.origin!==location.origin||!u.pathname.startsWith(expectedBase))return {state:'BLOCKED',reason:'ENDPOINT_MISMATCH'};
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8000);
  try{
   const r=await fetch(apiUrl,{method:'GET',headers:{'Accept':'application/json','X-Requested-With':'XMLHttpRequest'},credentials:'same-origin',redirect:'error',cache:'no-store',signal:controller.signal});
   if(r.status===401||r.status===403)return {state:'AUTH_REQUIRED',reason:'HTTP_'+r.status};
   if(r.status===404)return {state:'UNSUPPORTED',reason:'PATH_OR_VERSION_404'};
   if(!r.ok)return {state:'UNKNOWN',reason:'HTTP_'+r.status};
   const raw=await r.text();if(raw.length>128000)return {state:'UNKNOWN',reason:'OVERSIZED_STATUS'};
   return {state:'RAW',raw};
  }catch(e){return {state:'UNKNOWN',reason:e?.name==='AbortError'?'TIMEOUT':'NETWORK_OR_AUTH_ERROR'};}
  finally{clearTimeout(timer);}
 };
 try{
  const res=await chrome.scripting.executeScript({target:{tabId:tab.id,allFrames:false},func:fetchInTab,args:[api,origin,base]});
  const out=res?.[0]?.result;
  if(out?.state==='RAW'){try{return parseStatus(JSON.parse(out.raw));}catch{return {state:'UNSUPPORTED',reason:'UNEXPECTED_STATUS_BODY'};}}
  return out||{state:'UNKNOWN',reason:'EMPTY_RESPONSE'};
 }catch{return {state:'UNKNOWN',reason:'TAB_INJECTION_BLOCKED'};}
}
export function format3xuiStatus(result,lang='ru'){
 const fmt=n=>typeof n==='number'&&Number.isFinite(n)?n.toFixed(1):'—';
 const pct=x=>x&&x.total>0&&Number.isFinite(x.current)&&Number.isFinite(x.total)?Math.round(x.current/x.total*100)+'%':'—';
 const size=n=>{if(typeof n!=='number'||!Number.isFinite(n)||n<0)return '—';const units=['B','KiB','MiB','GiB','TiB'];let i=0;while(n>=1024&&i<units.length-1){n/=1024;i++;}return (i===0?Math.round(n):n.toFixed(1))+' '+units[i];};
 const state=result?.xray?.state||'unknown';
 const xray=lang==='ru'?(state==='running'?'работает':state==='stopped'?'остановлен':state):state;
 const first='CPU '+fmt(result.cpu)+'% · RAM '+pct(result.mem)+' · '+(lang==='ru'?'Диск ':'Disk ')+pct(result.disk);
 const second='Xray '+xray+' · ↑ '+size(result.netIO?.up)+' / ↓ '+size(result.netIO?.down);
 return first+'\n'+second;
}
async function monitor(a){
 if(a.adapter!=='3xui')throw Error('NOT_3XUI');
 // An encrypted token survives page close and browser restart. Lack of the
 // in-memory Vault key is NOT proof that token vanished. Never overwrite the
 // last successful snapshot with a false authorization failure.
 if(tokenFlags[a.id]&&!vault.unlocked){showVaultSettings();status('API-токен сохранён в Vault. Разблокируй Vault для проверки; последние данные сохранены.');return;}
 const url=selectedUrl(a);await ensureOrigin(url);
 let token='';if(vault.unlocked){try{token=await vault.get('tok_'+a.id,url);}catch(e){if(e.message!=='SECRET_NOT_FOUND')throw e;}}
 let result;
 if(token){result=await read3xui(a,url,{token});}
 else {result=await read3xuiFromSignedInTab(a,url);}
 if(result.state!=='OK'){const advice=(result.state==='AUTH_REQUIRED'||result.state==='API_AUTH_REQUIRED'||result.state==='API_FORBIDDEN')?(locale==='ru'?'Нужна авторизация 3x-ui. Проверь сохранённый токен и разблокировку Vault либо войди в панель.':'Sign in to 3x-ui in a browser tab or save a monitor token in Vault.'):
 result.state==='SESSION_TAB_REQUIRED'?(locale==='ru'?'Открой 3x-ui отдельной вкладкой и войди, затем повтори проверку. Либо сохрани API-токен.':'Open and sign in to 3x-ui in a tab, or save a monitor token.'):
 result.state==='UNSUPPORTED'?(locale==='ru'?'Проверь путь панели и версию 3x-ui.':'Check panel base path and 3x-ui version.'):(locale==='ru'?'Не удалось получить статус, '+result.reason:result.reason);
 appMetrics.delete(a.id);await storeManualSnapshot(a,{...result,checkedAt:new Date().toISOString()});reportApp(a,advice,true);return;}
 appMetrics.set(a.id,result);await storeManualSnapshot(a,result);reportApp(a,format3xuiStatus(result,locale));
}
const download=(name,txt)=>{const blob=new Blob([txt],{type:'application/json'}),u=URL.createObjectURL(blob);const a=node('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);};
const readFile=file=>file.text();
async function initialize(){
 const savedUiLanguage=await chrome.storage.local.get('rfPortalLanguage');if(['ru','en'].includes(savedUiLanguage.rfPortalLanguage))locale=savedUiLanguage.rfPortalLanguage;
 registry=await loadRegistry();const linked=attachStandalonePanels(registry);registry=linked.registry;if(linked.changed)registry=await saveRegistry(registry);await pullMonitoringState();const preferred=await chrome.storage.local.get(POLL_PREF_KEY);pollPeriod=[1,2,5,10,15,30,60].includes(preferred[POLL_PREF_KEY])?preferred[POLL_PREF_KEY]:1;$('monitor-period').value=String(pollPeriod);await refreshTokenFlags();const desiredServer=new URLSearchParams(location.search).get('server');if(desiredServer&&registry.servers.some(s=>s.id===desiredServer))selectedServer=desiredServer;
 chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.rfPortalLanguage&&['ru','en'].includes(changes.rfPortalLanguage.newValue)){locale=changes.rfPortalLanguage.newValue;refreshLocale();}});
 chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&(changes[SNAPSHOT_KEY]||changes[CONFIG_KEY])){if(changes[SNAPSHOT_KEY])snapshots=changes[SNAPSHOT_KEY].newValue||{};if(changes[CONFIG_KEY])monitorConfig=changes[CONFIG_KEY].newValue||{};renderServerDashboard();}});
 $('monitor-period').onchange=()=>Promise.resolve().then(async()=>{
   const value=Number($('monitor-period').value),old=pollPeriod;
   const r=await chrome.runtime.sendMessage({type:'PORTAL_R5_MONITOR_SET_PERIOD',period:value});
   if(!r?.ok){$('monitor-period').value=String(old);throw Error(r?.error||'POLL_PERIOD_SAVE_FAILED');}
   pollPeriod=value;await pullMonitoringState();renderServerDashboard();status('Интервал сохранён: '+value+' мин. для всех серверов с включённым мониторингом.');
  }).catch(showError);
 $('nav-servers').onclick=()=>setView('servers');
 $('nav-apps').onclick=()=>setView('apps');
 $('nav-settings').onclick=()=>setView('settings');
 $('add-server').onclick=()=>openServerEditor();$('add-app').onclick=()=>openAppEditor();
 $('viewer-close').onclick=()=>{$('viewer-frame').removeAttribute('src');$('app-viewer').close();};
 $('app-viewer').addEventListener('close',()=>{$('viewer-frame').removeAttribute('src');});
 $('cancel-editor').onclick=()=>$('editor').close();$('cancel-credential').onclick=()=>$('credential').close();$('cancel-token').onclick=()=>$('token-dialog').close();
 $('save-credential').onclick=()=>Promise.resolve().then(async()=>{
  if(!credentialApp)throw Error('NO_APP');const secret=JSON.stringify({username:$('cred-user').value,password:$('cred-pass').value});
  await vault.set(credentialApp.id,selectedUrl(credentialApp),secret);$('cred-pass').value='';$('credential').close();status('Credential encrypted');
 }).catch(showError);
 $('remove-token').onclick=()=>Promise.resolve().then(async()=>{
  if(!tokenApp||!confirm('Удалить токен 3x-ui из Vault?'))return;
  const res=await chrome.runtime.sendMessage({type:'PORTAL_R5_MONITOR_DISABLE',appId:tokenApp.id});if(!res?.ok)throw Error('MONITOR_DISABLE_FAILED');
  await vault.dropEncrypted(['tok_'+tokenApp.id,'adm_'+tokenApp.id]);tokenApp.tokenRole='monitor';await refreshTokenFlags();await persist();$('token-dialog').close();await pullMonitoringState();
 }).catch(showError);
 $('admin-close').onclick=()=>$('management-dialog').close();
 $('admin-inbounds').onclick=()=>adminExecute('inbounds').catch(showError);$('admin-restart').onclick=()=>adminExecute('restart-xray').catch(showError);
 async function verifyAndSaveToken(a,token){
  if(!a||!vault.unlocked||!token)throw Error('TOKEN_REQUIRED');
  const url=selectedUrl(a);await ensureOrigin(url);
  // Read-only discovery: monitor token cannot invoke admin actions.
  const statusResult=await read3xui(a,url,{token});
  if(statusResult.state!=='OK')throw Error('TOKEN_STATUS_FAILED: '+statusResult.state);
  const adminCheck=await adminRequest(a,url,token,'inbounds');
  if(['TIMEOUT','NETWORK_ERROR'].includes(adminCheck.state))throw Error('TOKEN_ADMIN_CAPABILITY_UNVERIFIED: '+adminCheck.state);
  const role=adminCheck.state==='OK'?'admin':'monitor';
  const previousConfig=monitorConfig[a.id];
  await vault.set('tok_'+a.id,url,token);
  // Verify the encrypted round trip before promising a successful save.
  if(await vault.get('tok_'+a.id,url)!==token)throw Error('TOKEN_VAULT_VERIFY_FAILED');
  a.tokenRole=role;
  await vault.dropEncrypted(['adm_'+a.id]);await persist();await refreshTokenFlags();
  // We already received a valid live API response during read-only capability
  // discovery. Show it immediately, without forcing another token entry.
  appMetrics.set(a.id,statusResult);appNotes.delete(a.id);
  await storeManualSnapshot(a,statusResult);
  if(previousConfig?.enabled){
   const resumed=await chrome.runtime.sendMessage({type:'PORTAL_R5_MONITOR_ENABLE',appId:a.id,token,period:previousConfig.period||pollPeriod});
   if(!resumed?.ok)throw Error('TOKEN_SAVED_MONITOR_RESUME_FAILED: '+String(resumed?.error||'UNKNOWN'));
  }
  await pullMonitoringState();render();
  $('token-input').value='';$('token-dialog').close();status('API-токен зашифрован и сохранён · права: '+role+(previousConfig?.enabled?' · автоопрос возобновлён.':' · автоопрос включается отдельно.'));
 }
 $('save-token').onclick=()=>Promise.resolve().then(async()=>{
  if(!tokenApp)throw Error('NO_APP');await verifyAndSaveToken(tokenApp,$('token-input').value.trim());
 }).catch(showError);
 $('migrate-legacy-admin').onclick=()=>Promise.resolve().then(async()=>{
  if(!tokenApp||!vault.unlocked)throw Error('VAULT_LOCKED');
  const a=tokenApp,legacy=await vault.get('adm_'+a.id,selectedUrl(a));
  await verifyAndSaveToken(a,legacy);
 }).catch(showError);
 async function resumeEnabledMonitors(){
  await pullMonitoringState();let restored=0;
  for(const a of registry.apps){
   if(!xui3(a)||!monitorConfig[a.id]?.enabled)continue;
   const url=selectedUrl(a);let token;
   try{token=await vault.get('tok_'+a.id,url);}catch(e){
    if(['SECRET_NOT_FOUND','ORIGIN_OR_PATH_MISMATCH'].includes(e?.message))continue;
    throw e;
   }
   const response=await chrome.runtime.sendMessage({type:'PORTAL_R5_MONITOR_ENABLE',appId:a.id,token,period:monitorConfig[a.id].period||pollPeriod});
   if(!response?.ok)throw Error('MONITOR_RESUME_FAILED: '+String(response?.error||'UNKNOWN'));
   restored++;
  }
  await pullMonitoringState();return restored;
 }
 $('unlock-vault').onclick=()=>Promise.resolve().then(async()=>{
  const pass=$('master').value;$('master').value='';
  // Password authentication is an independent gate. Never mislabel a monitor or
  // rendering failure as a rejected Vault password after successful decrypt.
  try{
   if(!await vault.data())await vault.create(pass);else await vault.unlock(pass);
  }catch(error){vault.lock();updateVault();throw error;}
  updateVault();
  status('Vault разблокирован. Сохранённые токены доступны.');
  try{await refreshTokenFlags();render();}
  catch(error){status('VAULT_UNLOCKED_UI_REFRESH_FAILED: '+String(error?.message||error),true);return;}
  try{
   const restored=await resumeEnabledMonitors();
   if(restored){render();status('Vault разблокирован · возобновлено серверов: '+restored+'.');}
  }catch(error){
   // Retain a usable unlocked Vault even if automatic 3x-ui polling is denied.
   status('VAULT_UNLOCKED_MONITOR_RESUME_FAILED: '+String(error?.message||error),true);
  }
 }).catch(showError);
 $('lock-vault').onclick=()=>{vault.lock();chrome.runtime.sendMessage({type:'PORTAL_R5_MONITOR_CLEAR_AUTH'}).catch(showError);updateVault();status(t('vaultLocked')+' · фоновая авторизация отозвана');};
 $('change-master').onclick=()=>Promise.resolve().then(async()=>{
  await vault.changePassword($('master').value,$('new-master').value);$('master').value='';$('new-master').value='';status('Master password changed');
 }).catch(showError);
 $('export-vault').onclick=()=>Promise.resolve().then(async()=>{download('routerforge-portal2-vault-encrypted.json',await vault.exportEncrypted());}).catch(showError);
 $('import-vault').onclick=()=>$('vault-import-file').click();
 $('vault-import-file').onchange=()=>Promise.resolve().then(async()=>{const file=$('vault-import-file').files?.[0];if(file){if(!confirm('Replace existing encrypted Vault?'))return;await vault.importEncrypted(await readFile(file));await refreshTokenFlags();render();updateVault();status('Vault imported, unlock required');}}).catch(showError);
 function openBackupDialog(mode,source=null){
  pendingBackup={mode,source};$('backup-title').textContent=mode==='export'?'Защищённый экспорт: профили и токены':'Импорт защищённого бэкапа';
  $('backup-repeat-label').hidden=mode!=='export';$('backup-password').value='';$('backup-repeat').value='';$('backup-error').hidden=true;
  $('backup-help').textContent=mode==='export'?'Единая копия ВСЕГО Portal: Keenetic, приложения, серверы, полные HTTPS URL, зашифрованный Vault, интервалы и настройки. Пароль бэкапа защищает файл; мастер-пароль Vault нужен отдельно.':'После проверки целостности будут восстановлены настройки Keenetic, серверы, все панели и зашифрованный Vault. Разрешения сайтов Chrome выдаются отдельно; после входа в Vault мониторинг возобновляется.';
  $('backup-dialog').showModal();
 }
 $('backup-cancel').onclick=()=>{$('backup-dialog').close();pendingBackup=null;};
 $('backup-confirm').onclick=()=>Promise.resolve().then(async()=>{
  if(!pendingBackup)throw Error('BACKUP_NOT_SELECTED');const pass=$('backup-password').value;
  if(pass.length<12)throw Error('BACKUP_PASSWORD_TOO_SHORT');
  if(pendingBackup.mode==='export'){
   if(pass!==$('backup-repeat').value)throw Error('BACKUP_PASSWORD_MISMATCH');
   const raw=await vault.data();const saved=await chrome.storage.local.get([LEGACY,...PREF_KEYS,CONFIG_KEY]);const workspace=collectWorkspace(saved,registry);
   const content=await secureBackup(registry,raw,pass,{period:pollPeriod,workspace});
   download('routerforge-portal-FULL-encrypted.json',content);status('Полный защищённый бэкап создан: Keenetic + приложения + серверы + Vault + настройки мониторинга.');
  }else{
   const decoded=await openBackup(pendingBackup.source,pass);if(!await applyImportedProfile(decoded.registry,decoded.vault,true,decoded.settings?.period,decoded.settings?.workspace||null))return;
  }
  $('backup-password').value='';$('backup-repeat').value='';pendingBackup=null;$('backup-dialog').close();
 }).catch(e=>{$('backup-error').textContent=e.message||String(e);$('backup-error').hidden=false;});
 $('export-profiles').onclick=()=>openBackupDialog('export');
 $('import-profiles').onclick=()=>$('import-file').click();
 async function applyImportedProfile(proposed,encryptedVault=null,secure=false,restoredPeriod=null,restoredWorkspace=null){
  if(!confirm((secure?'Заменить профили И Vault защищённым бэкапом?':'Заменить профили из обычного JSON? Vault останется без изменений.')+'\nСерверов: '+proposed.servers.length+' · панелей: '+proposed.apps.length))return false;
  // Snapshot retention: ONLY exact unchanged panel endpoint.
  await pullMonitoringState();const previous=registry,previousSnapshots=snapshots,previousConfig=monitorConfig,previousVault=await vault.data();
  const previousWorkspace=await chrome.storage.local.get([LEGACY,...PREF_KEYS,POLL_PREF_KEY]);const previousApps=new Map(previous.apps.map(a=>[a.id,a]));
  const retained={};for(const app of proposed.apps){const old=previousApps.get(app.id);if(old&&old.adapter===app.adapter&&appUrl(old)===appUrl(app)&&previousSnapshots[app.id])retained[app.id]=previousSnapshots[app.id];}
  const stopped=await chrome.runtime.sendMessage({type:'PORTAL_R5_MONITOR_CLEAR_ALL'});if(!stopped?.ok)throw Error('MONITOR_CLEAR_FAILED: '+String(stopped?.error||'NO_RESPONSE'));
  try{
   const stored={rfPortal2Registry:proposed,[SNAPSHOT_KEY]:retained,[CONFIG_KEY]:restoredWorkspace?restoredWorkspace.monitor:{}};
   if(secure){stored.rfPortal2VaultEncrypted=encryptedVault;if([1,2,5,10,15,30,60].includes(restoredPeriod))stored[POLL_PREF_KEY]=restoredPeriod;}
   if(restoredWorkspace)Object.assign(stored,restoreWorkspaceChanges(restoredWorkspace));
   await chrome.storage.local.set(stored);vault.lock();registry=proposed;snapshots=retained;monitorConfig=stored[CONFIG_KEY];if(secure&&[1,2,5,10,15,30,60].includes(restoredPeriod)){pollPeriod=restoredPeriod;$('monitor-period').value=String(pollPeriod);}await refreshTokenFlags();
  }catch(error){
   const rollback={rfPortal2Registry:previous,[SNAPSHOT_KEY]:previousSnapshots,[CONFIG_KEY]:previousConfig,...previousWorkspace};if(secure)rollback.rfPortal2VaultEncrypted=previousVault;
   await chrome.storage.local.set(rollback).catch(()=>{});throw error;
  }
  appMetrics.clear();appNotes.clear();selectedServer='';render();status('Импортировано: '+registry.servers.length+' серверов · '+registry.apps.length+' панелей. '+(secure?'Vault восстановлен в зашифрованном виде.':'Токены отсутствуют в обычном JSON: они не восстановлены.'));return true;
 }
 $('import-file').onchange=()=>Promise.resolve().then(async()=>{
  const file=$('import-file').files?.[0];if(!file)return;const parsed=JSON.parse(await readFile(file));
  if(isSecureBackup(parsed)){openBackupDialog('import',parsed);return;}
  // Legacy redacted JSON: never silently drop the 3x-ui secret path.
  const storedVault=await vault.data();const proposed=prepareProfileImport(parsed,registry,storedVault?.entries||{});await applyImportedProfile(proposed);
 }).catch(showError).finally(()=>{$('import-file').value='';});
 $('server-filter').oninput=()=>{renderServers();renderServerDashboard();};$('app-filter').oninput=renderApps;$('group-filter').onchange=renderApps;
 $('switch-language').onclick=()=>{locale=locale==='ru'?'en':'ru';refreshLocale();chrome.storage.local.set({rfPortalLanguage:locale}).catch(showError);};
 window.addEventListener('pagehide',()=>vault.lock());setInterval(()=>{if(!vault.unlocked){vault.lock();updateVault();}},30000);
 refreshLocale();status('');
}
// R5.8: no second standalone settings screen. Preserve bookmarked view/server.
// This branch never handles credentials or mutates storage or remote services.
if(!RF57_EMBEDDED){
 const params=new URLSearchParams(location.search);
 const next=new URL(chrome.runtime.getURL('options.html'));
 next.searchParams.set('tab','servers');
 if(['servers','apps','settings'].includes(params.get('view')))next.searchParams.set('serverView',params.get('view'));
 const savedServer=params.get('server');
 if(savedServer&&/^[a-zA-Z0-9_-]{4,80}$/.test(savedServer))next.searchParams.set('server',savedServer);
 location.replace(next.href);
}else{
 initialize().catch(showError);
}
