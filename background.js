// R5 opt-in monitor worker (statically composed)
// Manifest V3 service-worker feature. This is intentionally classic JS for importScripts.
// No credential is ever written to storage.local, logs, or history.
(()=>{
if(!chrome?.alarms?.onAlarm || !chrome?.storage?.session || !chrome?.runtime?.getURL)return; // unsupported legacy runtime
const CFG='rfPortalR5MonitorConfig',SNAP='rfPortalR5Snapshots',SESSION='rfPortalR5TransientAuth',REG='rfPortal2Registry',ALARM='rf-portal-r5-monitor';
const TTL=60*60*1000,MAX=72,MAX_BODY=128000;
let busy=false;
const registered=(s)=>s?.id===chrome.runtime.id&&typeof s?.url==='string'&&s.url.startsWith(chrome.runtime.getURL(''));
const urlFor=a=>a.addressMode==='local'?a.urlLocal:a.urlRemote;
function endpoint(raw){const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password||u.hash||u.search)throw Error('HTTPS_URL_REQUIRED');const part=u.pathname.replace(/\/(?:panel(?:\/.*)?|login)\/?$/,'')||'/';if(part.startsWith('//')||part.includes('\\'))throw Error('BAD_PATH');return new URL(part.replace(/\/+$/,'')+'/panel/api/server/status',u.origin).href;}
function cleanMessage(r){if(r.state==='OK')return {appId:r.appId,state:r.xray?.state==='stopped'?'XRAY_STOPPED':'OK',checkedAt:r.checkedAt,source:'CHROME',rttMs:r.rttMs,cpu:r.cpu,mem:r.mem,disk:r.disk,netIO:r.netIO,xray:r.xray,rate:r.rate||null,reason:''};return {appId:r.appId,state:r.state,checkedAt:r.checkedAt,source:'CHROME',rttMs:r.rttMs||null,reason:String(r.reason||'').slice(0,60)};}
async function save(result){const store=(await chrome.storage.local.get(SNAP))[SNAP]||{};const prev=store[result.appId]?.latest;
 if(result.state==='OK'&&prev?.state==='OK'&&result.netIO&&prev.netIO){const sec=(Date.parse(result.checkedAt)-Date.parse(prev.checkedAt))/1000,up=result.netIO.up-prev.netIO.up,down=result.netIO.down-prev.netIO.down;if(sec>=1&&sec<1800&&up>=0&&down>=0)result.rate={up:up/sec,down:down/sec};}
 const latest=cleanMessage(result),history=(store[result.appId]?.history||[]).slice(-MAX+1);history.push({state:latest.state,checkedAt:latest.checkedAt,rttMs:latest.rttMs,cpu:latest.cpu??null});
 store[result.appId]={latest,history};const keys=Object.keys(store);if(keys.length>500)for(const id of keys.slice(0,keys.length-500))delete store[id];await chrome.storage.local.set({[SNAP]:store});return latest;
}
async function test(app,token){const now=new Date().toISOString(),start=performance.now();let state='UNKNOWN',reason='',rttMs=null;
 try{
  const url=endpoint(urlFor(app)),u=new URL(url),origin=u.protocol+'//'+u.hostname+'/*';
  if(!(await chrome.permissions.contains({origins:[origin]})))return save({appId:app.id,state:'PERMISSION_REQUIRED',checkedAt:now,reason:'SITE_PERMISSION_REQUIRED'});
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);let response;
  try{response=await fetch(url,{method:'GET',headers:{Accept:'application/json',Authorization:'Bearer '+token},credentials:'omit',redirect:'error',cache:'no-store',signal:controller.signal});}
  finally{clearTimeout(timer);}rttMs=Math.round(performance.now()-start);
  if(response.status===401)state='API_AUTH_REQUIRED';else if(response.status===403)state='API_FORBIDDEN';else if(response.status===404)state='UNSUPPORTED';else if(response.status===429)state='RATE_LIMIT';else if(!response.ok)state='NETWORK_ERROR';else{
    const raw=await response.text();if(raw.length>MAX_BODY)throw Error('OVERSIZED');
    const data=JSON.parse(raw);if(data.success!==true||!data.obj||typeof data.obj.cpu!=='number'||!data.obj.mem||!data.obj.disk)state='UNSUPPORTED';else{
      const v=data.obj;const num=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0?x:null;const pair=x=>({current:num(x?.current),total:num(x?.total)});
      return save({appId:app.id,state:'OK',checkedAt:now,rttMs,cpu:num(v.cpu),mem:pair(v.mem),disk:pair(v.disk),netIO:{up:num(v.netIO?.up),down:num(v.netIO?.down)},xray:{state:String(v.xray?.state||'unknown').slice(0,20),version:String(v.xray?.version||'').slice(0,30)}});
    }
  }
  reason='HTTP_'+response.status;
 }catch(e){state=e?.name==='AbortError'?'TIMEOUT':(String(e?.message||'').includes('HTTPS_URL')?'UNSUPPORTED':'NETWORK_ERROR');reason=state;}
 return save({appId:app.id,state,checkedAt:now,rttMs,reason});
}
async function reconcile(){const cfg=(await chrome.storage.local.get(CFG))[CFG]||{};if(Object.values(cfg).some(v=>v?.enabled)){
  if(!await chrome.alarms.get(ALARM))await chrome.alarms.create(ALARM,{periodInMinutes:1});
 }else await chrome.alarms.clear(ALARM);
}
async function runCycle(forceId=''){
 if(busy)return {state:'BUSY'};busy=true;
 try{const local=await chrome.storage.local.get([REG,CFG]),session=await chrome.storage.session.get(SESSION),reg=local[REG],cfg=local[CFG]||{},auth=session[SESSION]||{};
  const targets=(reg?.apps||[]).filter(a=>a.adapter==='3xui'&&cfg[a.id]?.enabled&&(!forceId||forceId===a.id));
  const now=Date.now(),out=[];let index=0;
  async function worker(){for(;;){const a=targets[index++];if(!a)return;const c=cfg[a.id],k=auth[a.id];
    if(!forceId&&(now-(c.lastAttempt||0)<Math.max(1,c.period||1)*60000-5000||now<(c.nextDue||0)))continue;
    if(!k||!k.token||k.until<=now){out.push(await save({appId:a.id,state:'VAULT_LOCKED',checkedAt:new Date().toISOString(),reason:'SESSION_EXPIRED'}));continue;}
    c.lastAttempt=now;const r=await test(a,k.token);out.push(r);
    if(r.state==='OK'||r.state==='XRAY_STOPPED'){c.failures=0;c.nextDue=0;}
    else {c.failures=Math.min(6,(c.failures||0)+1);c.nextDue=now+Math.min(30*60000,60000*Math.pow(2,c.failures-1))+(Math.floor(Math.random()*10000));}
  }}await Promise.all([worker(),worker(),worker()]);await chrome.storage.local.set({[CFG]:cfg});return {state:'OK',count:out.length};
 }finally{busy=false;}
}
chrome.alarms.onAlarm.addListener(a=>{if(a.name===ALARM)runCycle().catch(()=>{});});
chrome.runtime.onStartup.addListener(()=>{reconcile().catch(()=>{});});
chrome.runtime.onInstalled.addListener(()=>{reconcile().catch(()=>{});});
chrome.runtime.onMessage.addListener((msg,sender,respond)=>{
 if(!msg?.type?.startsWith('PORTAL_R5_MONITOR_'))return false;
 if(!registered(sender)){respond({ok:false,error:'UNTRUSTED_SENDER'});return false;}
 (async()=>{
  // Global commands do not identify a panel. Handle them BEFORE appId validation.
  // The caller must still be an authenticated extension page (checked above).
  if(msg.type==='PORTAL_R5_MONITOR_CLEAR_ALL'||msg.type==='PORTAL_R5_MONITOR_CLEAR_AUTH'){
   const all=msg.type==='PORTAL_R5_MONITOR_CLEAR_ALL';
   // Clear monitoring configuration on Vault lock too: it must not continue
   // scheduling requests against an expired session token.
   await chrome.storage.local.set(all?{[CFG]:{},[SNAP]:{}}:{[CFG]:{}});
   await chrome.storage.session.set({[SESSION]:{}});
   await reconcile();
   return {ok:true,cleared:all?'all':'auth'};
  }
  const id=msg.appId;if(!/^[a-zA-Z0-9_-]{4,80}$/.test(id||''))throw Error('INVALID_APP');
  const reg=(await chrome.storage.local.get(REG))[REG],app=reg?.apps?.find(a=>a.id===id&&a.adapter==='3xui');if(!app)throw Error('APP_NOT_FOUND');
  const config=(await chrome.storage.local.get(CFG))[CFG]||{};
  if(msg.type==='PORTAL_R5_MONITOR_DISABLE'){
   delete config[id];await chrome.storage.local.set({[CFG]:config});const saved=(await chrome.storage.session.get(SESSION))[SESSION]||{};delete saved[id];await chrome.storage.session.set({[SESSION]:saved});await reconcile();return {ok:true};
  }
  if(msg.type!=='PORTAL_R5_MONITOR_ENABLE'&&msg.type!=='PORTAL_R5_MONITOR_RUN')throw Error('INVALID_OPERATION');
  const token=msg.token,period=Number(msg.period||1);if(typeof token!=='string'||!token||token.length>8192)throw Error('TOKEN_REQUIRED');
  if(![1,2,5].includes(period))throw Error('INVALID_PERIOD');
  const url=urlFor(app);endpoint(url);const u=new URL(url);
  if(!(await chrome.permissions.contains({origins:[u.protocol+'//'+u.hostname+'/*']})))throw Error('SITE_PERMISSION_DENIED');
  if(msg.type==='PORTAL_R5_MONITOR_ENABLE'){
   const existing=(await chrome.storage.session.get(SESSION))[SESSION]||{};existing[id]={token,until:Date.now()+TTL};await chrome.storage.session.set({[SESSION]:existing});
   config[id]={enabled:true,period,lastAttempt:0};await chrome.storage.local.set({[CFG]:config});await reconcile();
  }
  if(msg.type==='PORTAL_R5_MONITOR_RUN')return {ok:true,result:await test(app,token)};
  return {ok:true,result:await runCycle(id)};
 })().then(respond).catch(e=>respond({ok:false,error:String(e.message||'FAILED').slice(0,80)}));return true;
});
reconcile().catch(()=>{});
})();


const KEY = 'kbridgeState';
const PREFIX = 'kbridge-router-';

function pattern(value) {
  const u = new URL(value);
  if (!['http:', 'https:'].includes(u.protocol)) throw Error('Unsupported origin');
  return `${u.protocol}//${u.hostname}/*`;
}

async function syncScripts() {
  const existing = await chrome.scripting.getRegisteredContentScripts();
  const owned = existing.filter(item => item.id.startsWith(PREFIX)).map(item => item.id);
  if (owned.length) await chrome.scripting.unregisterContentScripts({ ids: owned });
  const { [KEY]: state } = await chrome.storage.local.get(KEY);
  const origins = Object.keys(state?.routers || {});
  const scripts = [];
  const seen = new Set();
  for (const origin of origins) {
    try {
      if (new URL(origin).origin !== origin) continue;
      const match = pattern(origin);
      if (seen.has(match)) continue;
      seen.add(match);
      if (!(await chrome.permissions.contains({ origins: [match] }))) continue;
      scripts.push({
        id: `${PREFIX}${scripts.length}`,
        matches: [match],
        js: ['content/bridge.js'],
        css: ['content/bridge.css'],
        runAt: 'document_idle',
        persistAcrossSessions: true
      });
    } catch (error) { console.warn('RouterForge Portal: skip origin', error); }
  }
  if (scripts.length) await chrome.scripting.registerContentScripts(scripts);
  return scripts.length;
}

let syncQueue = Promise.resolve();
function queueSync() { syncQueue = syncQueue.catch(() => {}).then(syncScripts); return syncQueue; }

chrome.runtime.onInstalled.addListener(() => { queueSync().catch(console.error); });
chrome.runtime.onStartup.addListener(() => { queueSync().catch(console.error); });
chrome.permissions.onAdded.addListener(() => { queueSync().catch(console.error); });
chrome.permissions.onRemoved.addListener(() => { queueSync().catch(console.error); });
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && KEY in changes) queueSync().catch(console.error);
});
// P5.1: launch embedded apps from the popup even when a different browser tab is active.
// Runs in the extension background so focus changes cannot cancel the launch.
async function waitForKeeneticTab(tabId) {
  const current=await chrome.tabs.get(tabId);
  if (current.status==='complete') return;
  await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>{cleanup();reject(Error('KEENETIC_TAB_TIMEOUT'));},12000);
    function cleanup(){clearTimeout(timeout);chrome.tabs.onUpdated.removeListener(changed);}
    function changed(id,change){if(id===tabId && change.status==='complete'){cleanup();resolve();}}
    chrome.tabs.onUpdated.addListener(changed);
  });
}
async function openEmbeddedApp(router,appId) {
  if (typeof router!=='string' || typeof appId!=='string') throw Error('INVALID_ROUTER_OR_APP');
  const parsed=new URL(router);
  if (!['http:','https:'].includes(parsed.protocol) || parsed.origin!==router || parsed.username || parsed.password) throw Error('INVALID_ROUTER');
  const {[KEY]:state}=await chrome.storage.local.get(KEY);
  const app=state?.routers?.[router]?.apps?.find(item=>item.id===appId && item.enabled!==false);
  if (!app) throw Error('APP_NOT_IN_SELECTED_ROUTER');
  if (app.mode==='external') throw Error('EXPLICIT_EXTERNAL_MODE');
  if (!(await chrome.permissions.contains({origins:[pattern(router)]}))) throw Error('ROUTER_SITE_PERMISSION_REQUIRED');
  const allTabs=await chrome.tabs.query({});
  const matching=allTabs.filter(tab=>{
    try{return Number.isInteger(tab.id) && new URL(tab.url).origin===router;}catch{return false;}
  });
  let tab=matching.find(item=>item.active) || matching[0];
  if (!tab) tab=await chrome.tabs.create({url:router,active:true});
  if (!tab || !Number.isInteger(tab.id)) throw Error('KEENETIC_TAB_NOT_CREATED');
  if (tab.status!=='complete') await waitForKeeneticTab(tab.id);
  let reply=null;
  try { reply=await chrome.tabs.sendMessage(tab.id,{type:'SHOW_APP',id:appId}); }catch{}
  if (!reply?.ok) {
    // Do not reload or replace a user's tab. Inject only into this explicitly selected router.
    try {
      await chrome.scripting.insertCSS({target:{tabId:tab.id},files:['content/bridge.css']});
      await chrome.scripting.executeScript({target:{tabId:tab.id},files:['content/bridge.js']});
      reply=await chrome.tabs.sendMessage(tab.id,{type:'SHOW_APP',id:appId});
    } catch{}
  }
  // Keep the router tab visible, including the login page if the user must sign in.
  await chrome.tabs.update(tab.id,{active:true});
  if (Number.isInteger(tab.windowId)) await chrome.windows.update(tab.windowId,{focused:true});
  if (!reply?.ok) throw Error('KEENETIC_LOGIN_OR_BRIDGE_REQUIRED');
  return {ok:true,tabId:tab.id};
}


// P6: authenticated catalogue preview via an already-open Core tab; no cookies read,
// no direct router network access, no background polling, and no Core mutations.
function p6CoreOrigin(router) {
  if (typeof router !== 'string') throw Error('INVALID_ROUTER');
  const url=new URL(router);
  if (!['http:','https:'].includes(url.protocol) || url.origin!==router || url.username || url.password) throw Error('INVALID_ROUTER');
  url.protocol='http:';url.port='2233';return url.origin;
}
async function p6ReadCatalogInCoreTab(expectedOrigin) {
  if (location.origin !== expectedOrigin || location.protocol !== 'http:' || location.port !== '2233') return {kind:'wrong_tab'};
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5500);
  try {
    const response=await fetch(expectedOrigin+'/api/catalog',{
      method:'GET',credentials:'same-origin',cache:'no-store',redirect:'error',
      headers:{Accept:'application/json'},signal:controller.signal
    });
    if (response.status===401 || response.status===403) return {kind:'auth_required'};
    if (!response.ok) return {kind:'http_error'};
    if (!String(response.headers.get('content-type')||'').toLowerCase().includes('application/json')) return {kind:'not_json'};
    if (Number(response.headers.get('content-length')||0)>2*1024*1024) return {kind:'too_large'};
    const raw=await response.text();
    if (raw.length>2*1024*1024) return {kind:'too_large'};
    const catalogue=JSON.parse(raw);
    if (!catalogue || !Array.isArray(catalogue.modules)) return {kind:'bad_catalog'};
    // Return only display and web metadata; never transfer cookies or credentials.
    const minimal=item=>({
      id:typeof item?.id==='string'?item.id.slice(0,64):'',
      name:typeof item?.name==='string'?item.name.slice(0,70):'',
      installed:item?.installed===true,
      web:item?.web && typeof item.web==='object' && !Array.isArray(item.web)?{
        scheme:typeof item.web.scheme==='string'?item.web.scheme.slice(0,12):'',
        port:Number.isInteger(item.web.port)?item.web.port:0,
        path:typeof item.web.path==='string'?item.web.path.slice(0,301):'/'
      }:null
    });
    return {kind:'ok',modules:catalogue.modules.slice(0,80).map(minimal),
      integrations:Array.isArray(catalogue.integrations)?catalogue.integrations.slice(0,80).map(minimal):[]};
  } catch(error) {return {kind:error?.name==='AbortError'?'timeout':'fetch_error'};}
  finally {clearTimeout(timer);}
}
function p6CoreCandidates(catalogue,router,existing) {
  if (catalogue?.kind!=='ok' || !Array.isArray(catalogue.modules) || !Array.isArray(catalogue.integrations)) throw Error('CORE_CATALOG_INVALID');
  const base=new URL(router);
  const sources=new Set(existing.map(item=>item.coreSourceId).filter(Boolean));
  const urls=new Set(existing.map(item=>{try{return new URL(item.url).href;}catch{return '';}}));
  const out=[],seen=new Set();
  for(const [kind,entries] of [['m',catalogue.modules],['i',catalogue.integrations]]) {
    for (const item of entries) {
      if (!item || item.installed!==true || typeof item.id!=='string' || !/^[a-z0-9_-]{2,60}$/i.test(item.id)) continue;
      if (typeof item.name!=='string' || !item.name.trim() || item.name.trim().length>70) continue;
      const web=item.web;
      if (!web || typeof web!=='object') continue;
      const scheme=String(web.scheme||'http').replace(/:$/,'').toLowerCase();
      if (!['http','https'].includes(scheme) || !Number.isInteger(web.port) || web.port<1 || web.port>65535) continue;
      const path=web.path||'/';
      if (typeof path!=='string' || path.length>300 || !path.startsWith('/') || path.startsWith('//') || /[\\\r\n\t\s<>"'`#]/.test(path) || /(^|\/)\.{1,2}(\/|\?|$)/.test(path)) continue;
      const target=new URL(router);target.protocol=scheme+':';target.port=String(web.port);
      target.pathname='/';target.search='';target.hash='';
      let url;try{url=new URL(path,target.origin);}catch{continue;}
      if(url.origin!==target.origin || url.hostname!==base.hostname || url.username || url.password) continue;
      const sourceId=kind+'_'+item.id;
      if(seen.has(sourceId) || sources.has(sourceId) || urls.has(url.href)) continue;
      seen.add(sourceId);urls.add(url.href);
      out.push({coreSourceId:sourceId,name:item.name.trim(),url:url.href,
        icon:kind==='m'?'▣':'🌐',group:kind==='m'?'routerforge':'other',mode:'auto'});
      if(out.length>=16)return out;
    }
  }
  return out;
}
async function p6ReadCandidates(router,sender) {
  if (!Number.isInteger(sender?.tab?.id) || !sender.tab.url || new URL(sender.tab.url).origin!==router) throw Error('ROUTER_TAB_REQUIRED');
  const core=p6CoreOrigin(router);
  const {[KEY]:state}=await chrome.storage.local.get(KEY);
  const profile=state?.routers?.[router];
  if (!profile || profile.coreLink!==core) throw Error('CORE_LINK_REQUIRED');
  if (!(await chrome.permissions.contains({origins:[pattern(core)]}))) throw Error('CORE_SITE_PERMISSION_REQUIRED');
  const tabs=await chrome.tabs.query({});
  const active=tabs.find(tab=>{
    try{return Number.isInteger(tab.id) && new URL(tab.url).origin===core;}catch{return false;}
  });
  if (!active) throw Error('CORE_TAB_REQUIRED');
  const result=await chrome.scripting.executeScript({target:{tabId:active.id},func:p6ReadCatalogInCoreTab,args:[core]});
  const response=result?.[0]?.result;
  if(response?.kind==='auth_required') throw Error('CORE_LOGIN_REQUIRED');
  if(response?.kind!=='ok') throw Error('CORE_CATALOG_READ_FAILED');
  return {catalogue:response,profile,state,core};
}
async function p6Preview(router,sender) {
  const result=await p6ReadCandidates(router,sender);
  return {ok:true,apps:p6CoreCandidates(result.catalogue,router,result.profile.apps)};
}
let p6ImportQueue=Promise.resolve();
function p6Import(router,sourceIds,sender) {
  if (!Array.isArray(sourceIds) || !sourceIds.length || sourceIds.length>16 ||
      sourceIds.some(id=>typeof id!=='string' || !/^[mi]_[a-z0-9_-]{2,60}$/i.test(id)) ||
      new Set(sourceIds).size!==sourceIds.length) return Promise.reject(Error('INVALID_SELECTION'));
  // Re-read the authenticated catalogue on every explicit import; never trust
  // caller-supplied URLs, names, source records, or a stale UI preview.
  const action=async()=>{
    const read=await p6ReadCandidates(router,sender);
    const latest=await chrome.storage.local.get(KEY),state=latest[KEY];
    const profile=state?.routers?.[router];
    if (!profile || profile.coreLink!==read.core || !Array.isArray(profile.apps)) throw Error('CORE_LINK_CHANGED');
    const allowed=p6CoreCandidates(read.catalogue,router,profile.apps);
    const ids=new Set(sourceIds);
    const selected=allowed.filter(item=>ids.has(item.coreSourceId));
    if(selected.length!==ids.size) throw Error('SELECTION_STALE_OR_DUPLICATE');
    if(profile.apps.length+selected.length>100) throw Error('ROUTER_APP_LIMIT_100');
    for(const item of selected) {
      const id='c_'+item.coreSourceId;
      if(profile.apps.some(app=>app.id===id)) throw Error('APP_ID_COLLISION');
      profile.apps.push({id,...item,enabled:true,favorite:false,layoutWidth:'native'});
    }
    await chrome.storage.local.set({[KEY]:state});
    return {ok:true,added:selected.length};
  };
  p6ImportQueue=p6ImportQueue.catch(()=>{}).then(action);
  return p6ImportQueue;
}

chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (msg?.type === 'P6_CORE_PREVIEW') {
    p6Preview(msg.router,sender).then(respond,err=>respond({ok:false,error:String(err?.message||err)}));
    return true;
  }
  if (msg?.type === 'P6_CORE_IMPORT') {
    p6Import(msg.router,msg.sourceIds,sender).then(respond,err=>respond({ok:false,error:String(err?.message||err)}));
    return true;
  }
  if (msg?.type === 'OPEN_EMBEDDED_APP') {
    openEmbeddedApp(msg.router,msg.id).then(respond,err=>respond({ok:false,error:String(err?.message||err)}));
    return true;
  }
  if (msg?.type === 'SYNC') {
    queueSync().then(count => respond({ ok: true, count }), err => respond({ ok: false, error: String(err) }));
    return true;
  }
  if (msg?.type === 'OPEN_PORTAL_CENTER') {
    (async () => {
      if (!sender.tab?.id || !sender.tab?.url) throw Error('ROUTER_TAB_REQUIRED');
      const sourceOrigin=new URL(sender.tab.url).origin;
      const {kbridgeState:state}=await chrome.storage.local.get('kbridgeState');
      if (!state?.routers?.[sourceOrigin]) throw Error('UNTRUSTED_ROUTER_TAB');
      const path=msg.view==='servers'?'portal-center.html?view=servers':'portal-center.html?view=apps';
      await chrome.tabs.create({url:chrome.runtime.getURL(path),active:true});
      respond({ok:true});
    })().catch(error=>respond({ok:false,error:String(error.message||error)}));
    return true;
  }
  if (msg?.type === 'OPEN_OPTIONS') {
    chrome.runtime.openOptionsPage().then(() => respond({ ok: true }), error => respond({ ok: false, error: String(error) }));
    return true;
  }
  if (msg?.type === 'OPEN_APP') {
    (async () => {
      if (!sender.tab?.url || !sender.tab?.id) throw Error('Only from a router tab');
      const origin = new URL(sender.tab.url).origin;
      const { [KEY]: state } = await chrome.storage.local.get(KEY);
      const app = state?.routers?.[origin]?.apps?.find(a => a.id === msg.id && a.enabled !== false);
      if (!app) throw Error('Unknown app');
      const url = new URL(app.url);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw Error('Unsafe URL');
      await chrome.tabs.create({ url: url.href, openerTabId: sender.tab.id, active: true });
      respond({ ok: true });
    })().catch(error => respond({ ok: false, error: String(error) }));
    return true;
  }
});
