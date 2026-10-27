
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
chrome.runtime.onMessage.addListener((msg, sender, respond) => {
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
