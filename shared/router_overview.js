// P3: local multi-router overview. No network requests, health guesses, telemetry or passwords.
// The active tab is a browser fact; Core linking is stored configuration, not reachability.
export const SELECTED_ROUTER_KEY = 'rfPortalSelectedRouterV1';

// Core runs on 2233; it is a *service*, not another Keenetic device.
// Do not mutate legacy storage: a pre-existing empty Core profile stays in
// backups, but disappears from router selectors when the real router exists.
// Profiles with apps are retained visibly until the owner can move them.
export function isCoreServiceOrigin(origin) {
  try {
    const url = new URL(origin);
    return url.protocol === 'http:' && url.port === '2233' && url.origin === origin;
  } catch { return false; }
}

export function coreParentRouter(state, coreOrigin) {
  if (!isCoreServiceOrigin(coreOrigin)) return null;
  const routers = state?.routers;
  if (!routers || typeof routers !== 'object' || Array.isArray(routers)) return null;
  const core = new URL(coreOrigin);
  const matches = Object.keys(routers).filter(origin => {
    if (origin === coreOrigin || isCoreServiceOrigin(origin)) return false;
    try { return new URL(origin).hostname === core.hostname; } catch { return false; }
  });
  // Canonical WebUI origins win over non-standard management ports.
  const http = new URL(coreOrigin); http.port='';
  const https = new URL(coreOrigin); https.protocol='https:'; https.port='';
  return matches.find(x => x === http.origin) || matches.find(x => x === https.origin) || matches[0] || null;
}

export function routerProfileKeys(state) {
  const routers = state?.routers;
  if (!routers || typeof routers !== 'object' || Array.isArray(routers)) return [];
  return Object.keys(routers).slice(0, 32).filter(origin => {
    if (!isCoreServiceOrigin(origin) || !coreParentRouter(state,origin)) return true;
    // Preserve access to any legacy Core profile that contains user apps.
    return Array.isArray(routers[origin]?.apps) && routers[origin].apps.length > 0;
  });
}

export function routerOverview(state, currentTabOrigin = null) {
  const routers = state?.routers;
  if (!routers || typeof routers !== 'object' || Array.isArray(routers)) return [];
  return routerProfileKeys(state).map(origin => {
    const profile=routers[origin];
    const apps = Array.isArray(profile?.apps) ? profile.apps.filter(a => a?.enabled !== false) : [];
    const core = new URL(origin);
    core.protocol = 'http:';
    core.port = '2233';
    const coreLinked = profile?.coreLink === core.origin;
    return Object.freeze({
      origin,
      label: isCoreServiceOrigin(origin) && coreParentRouter(state,origin)
        ? 'RouterForge Core (legacy)' : String(profile?.label || new URL(origin).host).slice(0, 70),
      activeTab: origin === currentTabOrigin,
      selected: false,
      apps: apps.length,
      favorites: apps.filter(a => a?.favorite === true).length,
      coreLinked,
      coreURL: core.origin + '/'
    });
  });
}

export function chooseRouter(state, preferred, activeTabOrigin, persisted) {
  const keys=routerProfileKeys(state);
  for (const value of [preferred, activeTabOrigin, persisted]) {
    if (typeof value === 'string' && keys.includes(value)) return value;
    // A saved or currently open Core tab resolves to the same physical router.
    const parent=typeof value === 'string' ? coreParentRouter(state,value) : null;
    if (parent && keys.includes(parent)) return parent;
  }
  return keys[0] || null;
}

export async function readSelectedRouter(storage = chrome.storage.local) {
  const result = await storage.get(SELECTED_ROUTER_KEY);
  const value = result?.[SELECTED_ROUTER_KEY];
  return typeof value === 'string' && value.length <= 2048 ? value : '';
}

export async function saveSelectedRouter(state, origin, storage = chrome.storage.local) {
  if (typeof origin !== 'string' || !routerProfileKeys(state).includes(origin)) {
    throw Error('ROUTER_NOT_SAVED');
  }
  await storage.set({[SELECTED_ROUTER_KEY]: origin});
  return origin;
}
