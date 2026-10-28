export const KEY = 'kbridgeState';
export const VERSION = 1;
export const MODES = ['auto', 'embedded', 'external'];
export const THEMES = ['auto', 'dark', 'light'];
export const WIDTHS = ['native', 'wide'];
export const GROUPS = ['routerforge','network','security','other'];
export function presetGroup(id) { return id==='routerforge'?'routerforge':id==='adguard-home'?'security':(['awg-manager','nfqws-web','nfqws2-ui','neofit','xkeen-ui'].includes(id)?'network':'other'); }
export const appGroup = app => GROUPS.includes(app.group)?app.group:presetGroup(app.presetId);
export function orderedApps(apps) {
  const rank = g => GROUPS.indexOf(g);
  return apps.filter(a=>a.enabled!==false).slice().sort((a,b)=>Number(Boolean(b.favorite))-Number(Boolean(a.favorite)) || rank(appGroup(a))-rank(appGroup(b)));
}
export function moveApp(apps,id,delta) {
  const at=apps.findIndex(a=>a.id===id);
  if(at<0 || ![-1,1].includes(delta))return false;
  const current=apps[at];
  const peers=apps.map((a,i)=>({a,i})).filter(({a})=>a.enabled!==false && Boolean(a.favorite)===Boolean(current.favorite) && appGroup(a)===appGroup(current));
  const index=peers.findIndex(x=>x.i===at);const next=peers[index+delta];
  if(!next)return false;
  [apps[at],apps[next.i]]=[apps[next.i],apps[at]];return true;
}
export const newState = () => ({ version: VERSION, routers: {} });

export function parseAddress(input) {
  if (typeof input !== 'string' || input.length > 2048 || !input.trim()) throw Error('Укажи адрес HTTP или HTTPS.');
  let url;
  try { url = new URL(input.trim()); } catch { throw Error('Некорректный адрес.'); }
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) {
    throw Error('Разрешены только HTTP/HTTPS без логина и пароля в URL.');
  }
  return url;
}

export function routerOrigin(value) { return parseAddress(value).origin; }

export function hostMatch(value) {
  const u = parseAddress(value);
  return `${u.protocol}//${u.hostname}/*`;
}

export function cleanApp(src) {
  if (!src || typeof src !== 'object') throw Error('Некорректное приложение.');
  const name = String(src.name || '').trim();
  if (!name || name.length > 70) throw Error('Название: от 1 до 70 символов.');
  const url = parseAddress(src.url).href;
  const mode = MODES.includes(src.mode) ? src.mode : 'auto';
  const id = /^[a-zA-Z0-9_-]{4,64}$/.test(String(src.id || '')) ? src.id : crypto.randomUUID();
  const icon = ['▣', '⚡', '🛡', '⚙', '🌐', '📡', '📦', '🔧'].includes(src.icon) ? src.icon : '▣';
  const enabled = src.enabled !== false;
  const favorite = src.favorite === true;
  const group = GROUPS.includes(src.group) ? src.group : presetGroup(src.presetId);
  const layoutWidth = WIDTHS.includes(src.layoutWidth) ? src.layoutWidth : 'native';
  const value = Number(src.nativeWidthPct);
  const nativeWidthPct = Number.isInteger(value) && value >= 65 && value <= 98 ? value : 85;
  const manualBounds = src.manualBounds === true;
  const nativeLeftTrimPx = Number.isInteger(Number(src.nativeLeftTrimPx)) && Number(src.nativeLeftTrimPx) >= 0 && Number(src.nativeLeftTrimPx) <= 160 ? Number(src.nativeLeftTrimPx) : 0;
  const nativeRightTrimPx = Number.isInteger(Number(src.nativeRightTrimPx)) && Number(src.nativeRightTrimPx) >= 0 && Number(src.nativeRightTrimPx) <= 160 ? Number(src.nativeRightTrimPx) : 0;
  const presetId = /^[a-z0-9-]{2,35}$/.test(String(src.presetId || '')) ? src.presetId : undefined;
  return { id, name, url, mode, icon, enabled, favorite, group, layoutWidth, nativeWidthPct, nativeLeftTrimPx, nativeRightTrimPx, manualBounds, ...(presetId ? {presetId} : {}) };
}

export function cleanState(src) {
  if (!src || src.version !== VERSION || !src.routers || typeof src.routers !== 'object' || Array.isArray(src.routers)) {
    throw Error('Неподдерживаемый формат конфигурации.');
  }
  const out = newState();
  const entries = Object.entries(src.routers);
  if (entries.length > 32) throw Error('Максимум 32 роутера.');
  for (const [key, value] of entries) {
    if (routerOrigin(key) !== key) throw Error('Некорректный адрес роутера.');
    if (!value || !Array.isArray(value.apps) || value.apps.length > 100) throw Error('Максимум 100 приложений на роутер.');
    const label = String(value.label || '').trim().slice(0, 70) || new URL(key).host;
    const apps = value.apps.map(cleanApp);
    if (new Set(apps.map(a => a.id)).size !== apps.length) throw Error('Повторяющиеся ID приложений.');
    const presets=apps.filter(a=>a.presetId).map(a=>a.presetId);
    if (new Set(presets).size !== presets.length) throw Error('Повторяющиеся интеграции каталога.');
    out.routers[key] = { label, apps, theme: THEMES.includes(value.theme) ? value.theme : 'auto' };
  }
  return out;
}

export async function readState() {
  const result = await chrome.storage.local.get(KEY);
  try { return cleanState(result[KEY] || newState()); } catch { return newState(); }
}
export async function writeState(state) {
  const cleaned = cleanState(state);
  await chrome.storage.local.set({ [KEY]: cleaned });
  return cleaned;
}
