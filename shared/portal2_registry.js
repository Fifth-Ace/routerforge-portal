// Portal 2: new registry is intentionally separate from legacy kbridgeState v1.
export const REGISTRY_KEY='rfPortal2Registry';
export const REGISTRY_VERSION=1;
const uid=()=>crypto.randomUUID();
const idOk=x=>typeof x==='string' && /^[a-zA-Z0-9_-]{4,80}$/.test(x);
const str=(x,max=100)=>String(x??'').trim().slice(0,max);
const assert=(ok,why)=>{if(!ok)throw Error(why);};
export function urlOf(raw){
  if(!raw)return '';
  assert(typeof raw==='string' && raw.length<=2048,'INVALID_URL_LENGTH');
  let u;try{u=new URL(raw.trim());}catch{throw Error('INVALID_URL');}
  assert(['http:','https:'].includes(u.protocol) && !!u.hostname && !u.username && !u.password,'INVALID_URL');
  assert(!u.hash,'FRAGMENT_NOT_ALLOWED');
  return u.href;
}
export function cleanServer(s){
  assert(s && typeof s==='object','INVALID_SERVER');
  const name=str(s.name,80);assert(name,'SERVER_NAME_REQUIRED');
  const id=idOk(s.id)?s.id:uid();
  const tags=Array.isArray(s.tags)?[...new Set(s.tags.map(x=>str(x,24)).filter(Boolean))].slice(0,12):[];
  return {id,name,tags,locationLabel:str(s.locationLabel,80)};
}
export function cleanApp(s,servers){
  assert(s && typeof s==='object','INVALID_APP');
  const name=str(s.name,80);assert(name,'APP_NAME_REQUIRED');
  const serverId=str(s.serverId,80);assert(!serverId || servers.some(v=>v.id===serverId),'UNKNOWN_SERVER');
  const urlLocal=urlOf(s.urlLocal),urlRemote=urlOf(s.urlRemote);
  assert(urlLocal||urlRemote,'APP_URL_REQUIRED');
  const addressMode=s.addressMode==='local'?'local':s.addressMode==='remote'?'remote':(urlLocal?'local':'remote');
  assert(addressMode==='local'?!!urlLocal:!!urlRemote,'ADDRESS_MODE_UNAVAILABLE');
  const authMethod=['browser','manual','vault'].includes(s.authMethod)?s.authMethod:'browser';
  const adapter=['none','3xui'].includes(s.adapter)?s.adapter:'none';
  const mode=['external','embedded','auto'].includes(s.mode)?s.mode:'external';
  const basePath=str(s.basePath,300);
  assert(!basePath || (basePath.startsWith('/') && !basePath.startsWith('//') && !/[?#\\]/.test(basePath)),'INVALID_BASE_PATH');
  return {id:idOk(s.id)?s.id:uid(),name,serverId,urlLocal,urlRemote,addressMode,mode,
    authMethod,adapter,basePath,tokenRole:adapter==='3xui'&&s.tokenRole==='admin'?'admin':'monitor',favorite:s.favorite===true,group:str(s.group,48)||'other',
    autosubmit:s.autosubmit===true && adapter==='3xui'};
}
export function newRegistry(){return {version:REGISTRY_VERSION,servers:[],apps:[]};}
export function cleanRegistry(src){
  assert(src && src.version===REGISTRY_VERSION && Array.isArray(src.servers) && Array.isArray(src.apps),'INVALID_REGISTRY');
  assert(src.servers.length<=100 && src.apps.length<=500,'REGISTRY_LIMIT');
  const servers=src.servers.map(cleanServer),apps=src.apps.map(a=>cleanApp(a,servers));
  assert(new Set(servers.map(x=>x.id)).size===servers.length,'DUPLICATE_SERVER_ID');
  assert(new Set(apps.map(x=>x.id)).size===apps.length,'DUPLICATE_APP_ID');
  return {version:REGISTRY_VERSION,servers,apps};
}
export const appUrl=a=>a.addressMode==='local'?a.urlLocal:a.urlRemote;
/**
 * Restore the one-server / many-panels invariant without touching the panel's
 * id, full URL, 3x-ui secret path or Vault entries. Read/write of this registry
 * is local; there are no permission requests or network probes here.
 *
 * A unique same-host server can be reused; ambiguous matches are deliberately
 * NOT guessed. A single empty server is treated as the user's existing server
 * only when it is the sole server. Repeated calls are idempotent.
 */
export function attachStandalonePanels(input){
  const state=cleanRegistry(input);
  let changed=false,created=0,attached=0;
  const hosts=a=>[a.urlLocal,a.urlRemote].filter(Boolean).map(url=>new URL(url).hostname.toLowerCase());
  for(const app of state.apps){
    if(app.serverId)continue;
    const ownHosts=new Set(hosts(app));
    const matchedIds=new Set(state.apps.filter(a=>a.serverId&&hosts(a).some(host=>ownHosts.has(host))).map(a=>a.serverId));
    // Do not assume two separately configured servers with the same host are identical.
    let target=matchedIds.size===1?[...matchedIds][0]:'';
    if(!target){
      const nameMatch=state.servers.filter(s=>!state.apps.some(a=>a.serverId===s.id)&&(
        ownHosts.has(s.name.toLowerCase())||s.name.toLowerCase()===app.name.toLowerCase()));
      if(nameMatch.length===1)target=nameMatch[0].id;
    }
    if(!target&&state.servers.length===1&&!state.apps.some(a=>a.serverId===state.servers[0].id)){
      target=state.servers[0].id;
    }
    if(!target){
      const host=hosts(app)[0]||'Server';
      const generic=/^(3x-ui|x-ui|webui|web-ui|panel|панель)$/i.test(app.name.trim());
      const server=cleanServer({name:generic?host:app.name});
      if(state.servers.length>=100)throw Error('REGISTRY_LIMIT_SERVER_100');
      state.servers.push(server);target=server.id;created++;
    }else attached++;
    app.serverId=target;changed=true;
  }
  return {registry:changed?cleanRegistry(state):state,changed,created,attached};
}
/**
 * Import from the unencrypted, path-redacted profile backup. Read only.
 * Existing 3x-ui full URLs are restored only for exact app IDs and HTTPS
 * origins already known locally. Vault data is NEVER modified here.
 */
export function prepareProfileImport(source,previous,vaultEntries={}){
  const next=cleanRegistry(source),old=cleanRegistry(previous);
  const byId=new Map(old.apps.filter(a=>a.adapter==='3xui').map(a=>[a.id,a]));
  for(const app of next.apps){
    if(app.adapter!=='3xui')continue;
    const known=byId.get(app.id);
    for(const field of ['urlLocal','urlRemote']){
      if(!app[field])continue;
      const imported=new URL(app[field]);
      if(imported.protocol!=='https:'||imported.pathname!=='/'||imported.search||imported.hash)continue;
      const existing=known?.[field]?new URL(known[field]):null;
      if(existing&&existing.protocol==='https:'&&imported.origin===existing.origin&&existing.pathname!=='/'){
        app[field]=existing.href;continue;
      }
      const saved=vaultEntries?.['tok_'+app.id]||vaultEntries?.['adm_'+app.id];
      const validSaved=saved&&(saved.appId==='tok_'+app.id||saved.appId==='adm_'+app.id);
      if(validSaved&&saved.origin===imported.origin&&typeof saved.path==='string'&&saved.path.startsWith('/')&&!saved.path.startsWith('//')&&!saved.path.includes('\\')&&saved.path!=='/'){
        app[field]=new URL(saved.path,imported.origin).href;continue;
      }
      // The legacy public export explicitly redacted this path. Never import it
      // silently as '/' if we cannot restore it from the local Vault/registry.
      if(typeof source.securityNotice==='string'&&source.securityNotice.includes('3x-ui secret paths'))throw Error('SECRET_PATH_NOT_IN_BACKUP_USE_ENCRYPTED_BACKUP');
    }
  }
  return attachStandalonePanels(next).registry;
}
export const appOrigin=a=>new URL(appUrl(a)).origin;
export function sameBinding(a,origin,path){
  const u=new URL(appUrl(a));return u.origin===origin && path.startsWith(u.pathname);
}
export async function loadRegistry(storage=chrome.storage.local){
  const o=await storage.get(REGISTRY_KEY);
  return cleanRegistry(o[REGISTRY_KEY]||newRegistry());
}
export async function saveRegistry(value,storage=chrome.storage.local){
  const clean=cleanRegistry(value);await storage.set({[REGISTRY_KEY]:clean});return clean;
}
export function removeServer(value,id){
  const next=structuredClone(cleanRegistry(value));
  next.servers=next.servers.filter(s=>s.id!==id);
  next.apps=next.apps.filter(a=>a.serverId!==id);
  return next;
}
// Read-only representation of legacy profiles: no mutation and no credentials.
export function legacyReadOnly(state){
  return Object.entries(state?.routers||{}).flatMap(([origin,profile])=>
    Array.isArray(profile?.apps)?profile.apps.map(a=>({name:a.name,url:a.url,router:origin,source:'legacy'})):[]);
}
export function portableExport(value){
  const data=cleanRegistry(value);
  // 3x-ui webBasePath can be a second factor. Never export its path or query unencrypted.
  for(const a of data.apps){if(a.adapter!=='3xui')continue;
    for(const key of ['urlLocal','urlRemote']){if(!a[key])continue;const u=new URL(a[key]);u.pathname='/';u.search='';u.hash='';a[key]=u.href;}
    a.basePath='';
  }
  return JSON.stringify({...data,securityNotice:'3x-ui secret paths have been removed from this export. Re-enter full URLs after import.'},null,2);
}
