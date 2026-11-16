
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
