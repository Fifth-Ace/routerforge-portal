// R5.7: one encrypted, allowlisted configuration snapshot for the whole extension.
// No bearer token or secret URL is ever exposed outside the encrypted backup.
import {cleanState,newState} from './model.js';
export const LEGACY='kbridgeState';
export const PREF_KEYS=Object.freeze(['rfPortalDefaultRouterV1','rfPortalSelectedRouterV1','rfPortalLanguage','rfPortalPopupLastTab']);
export const CONFIG='rfPortalR5MonitorConfig';
export const PERIOD='rfPortalR5PollingMinutes';
const PERIODS=[1,2,5,10,15,30,60];
const plain=o=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.getPrototypeOf(o)===Object.prototype;

export function validateWorkspace(input,registry){
 if(!plain(input)||input.version!==1||!Object.hasOwn(input,'keenetic'))throw Error('UNIFIED_WORKSPACE_INVALID');
 const keenetic=cleanState(input.keenetic);
 const prefs=plain(input.preferences)?input.preferences:{};
 for(const key of Object.keys(prefs))if(!PREF_KEYS.includes(key))throw Error('UNIFIED_PREFERENCE_UNKNOWN');
 const cleaned={};
 for(const key of PREF_KEYS){
  const v=prefs[key];if(v===undefined)continue;
  if(typeof v!=='string'||v.length>2048)throw Error('UNIFIED_PREFERENCE_INVALID');
  if(key==='rfPortalLanguage'&&!['ru','en'].includes(v))throw Error('UNIFIED_LANGUAGE_INVALID');
  if(key==='rfPortalPopupLastTab'&&!['apps','servers'].includes(v))throw Error('UNIFIED_POPUP_TAB_INVALID');
  if((key==='rfPortalDefaultRouterV1'||key==='rfPortalSelectedRouterV1')&&v&&!(v in keenetic.routers))throw Error('UNIFIED_ROUTER_PREFERENCE_INVALID');
  cleaned[key]=v;
 }
 const raw=input.monitor;
 if(!plain(raw)||Object.keys(raw).length>500)throw Error('UNIFIED_MONITOR_INVALID');
 const ids=new Set((registry.apps||[]).filter(a=>a.adapter==='3xui').map(a=>a.id));
 const monitor={};
 for(const [id,value] of Object.entries(raw)){
  if(!ids.has(id)||!plain(value)||typeof value.enabled!=='boolean'||!PERIODS.includes(value.period))throw Error('UNIFIED_MONITOR_INVALID');
  monitor[id]={enabled:value.enabled,period:value.period,needsAuth:Boolean(value.enabled),failures:0,lastAttempt:0,nextDue:0};
 }
 return {version:1,keenetic,preferences:cleaned,monitor};
}
export function collectWorkspace(storage,registry){
 const legacy=storage?.[LEGACY];
 const prefs={};for(const k of PREF_KEYS){const v=storage?.[k];if(v===undefined)continue;
  if((k==='rfPortalDefaultRouterV1'||k==='rfPortalSelectedRouterV1')&&v&&!(v in (legacy?.routers||{})))continue;
  prefs[k]=v;}
 const source=storage?.[CONFIG]||{},monitor={};
 const ids=new Set((registry.apps||[]).filter(a=>a.adapter==='3xui').map(a=>a.id));
 for(const [id,v] of Object.entries(source))if(ids.has(id)&&v&&typeof v.enabled==='boolean')monitor[id]={enabled:v.enabled,period:PERIODS.includes(v.period)?v.period:1};
 return validateWorkspace({version:1,keenetic:legacy||newState(),preferences:prefs,monitor},registry);
}
export function restoreWorkspaceChanges(workspace){
 if(!workspace)return {};
 const out={[LEGACY]:workspace.keenetic,[CONFIG]:workspace.monitor};
 for(const k of PREF_KEYS)if(Object.hasOwn(workspace.preferences,k))out[k]=workspace.preferences[k];
 return out;
}
