
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

chrome.runtime.onMessage.addListener((msg, sender, respond) => {
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
