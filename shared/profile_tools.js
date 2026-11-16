// P4: profile UX operations. Pure functions + explicit per-browser preference.
// No network access, credentials, router writes, or silent data migrations.
import {cleanState} from './model.js';
import {routerProfileKeys} from './router_overview.js';

export const DEFAULT_ROUTER_KEY='rfPortalDefaultRouterV1';

export function cleanRouterLabel(input) {
  if (typeof input !== 'string') throw Error('ROUTER_LABEL_INVALID');
  const value=input.trim();
  if (!value || value.length>70 || /[\u0000-\u001f\u007f]/.test(value)) throw Error('ROUTER_LABEL_INVALID');
  return value;
}

export function renameRouterProfile(source, origin, label) {
  const state=cleanState(source);
  if (!Object.prototype.hasOwnProperty.call(state.routers,origin)) throw Error('ROUTER_NOT_SAVED');
  state.routers[origin].label=cleanRouterLabel(label);
  return cleanState(state);
}

export function mergeRouterProfiles(current, incoming) {
  const original=cleanState(current);
  const added=cleanState(incoming);
  const existing=new Set(Object.keys(original.routers));
  let count=0, skipped=0;
  for(const [origin,profile] of Object.entries(added.routers)) {
    if(existing.has(origin)) { skipped++; continue; }
    if(Object.keys(original.routers).length>=32) throw Error('ROUTER_LIMIT_32');
    original.routers[origin]=profile;
    existing.add(origin);
    count++;
  }
  return {state:cleanState(original),added:count,skipped};
}

export function preferredRouter(state, preferred, activeTab=null, previouslySelected=null) {
  const keys=routerProfileKeys(state);
  // A manually chosen router for the current popup takes precedence. An already
  // open device tab takes precedence over the default for initial popup opening.
  for(const candidate of [previouslySelected,activeTab,preferred]) {
    if(typeof candidate==='string' && keys.includes(candidate)) return candidate;
  }
  return keys[0] || null;
}

export async function readDefaultRouter(storage=chrome.storage.local) {
  const result=await storage.get(DEFAULT_ROUTER_KEY);
  const value=result?.[DEFAULT_ROUTER_KEY];
  return typeof value==='string' && value.length<=2048 ? value : '';
}

export async function saveDefaultRouter(state,origin,storage=chrome.storage.local) {
  if(typeof origin!=='string' || !routerProfileKeys(state).includes(origin)) throw Error('ROUTER_NOT_SAVED');
  await storage.set({[DEFAULT_ROUTER_KEY]:origin});
  return origin;
}
