// Read-only, fixed endpoint allowlist. Never use admin/client/inbound APIs.
export const ADAPTER_ID='3xui';
export function panelBasePath(app,activeUrl){
  // The complete app URL is the only source of truth. Older basePath overrides
  // remain readable in registry v1 but must NEVER redirect API away from this URL.
  const path=new URL(activeUrl).pathname||'/';
  // Strip only known panel/login routes, never guess a custom secret prefix.
  const cleaned=path.replace(/\/(?:panel(?:\/.*)?|login)\/?$/,'')||'/';
  if(!cleaned.startsWith('/')||cleaned.startsWith('//')||/[?#\\]/.test(cleaned))throw Error('INVALID_3XUI_BASE_PATH');
  return cleaned.endsWith('/')?cleaned:cleaned+'/';
}
export function statusUrl(app,activeUrl){
  const origin=new URL(activeUrl).origin;
  const base=panelBasePath(app,activeUrl);
  if(!base.startsWith('/')||base.startsWith('//')||/[?#\\]/.test(base))throw Error('INVALID_3XUI_BASE_PATH');
  const path=base.replace(/\/+$/,'')+'/panel/api/server/status';
  return new URL(path,origin).href;
}
const finite=(x,min=0,max=Number.MAX_SAFE_INTEGER)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max?x:null;
const memory=x=>x&&typeof x==='object'?{current:finite(x.current),total:finite(x.total)}:null;
export function parseStatus(response){
  if(!response||response.success!==true||!response.obj||typeof response.obj!=='object')throw Error('UNSUPPORTED_3XUI_RESPONSE');
  const d=response.obj;
  return {state:'OK',checkedAt:new Date().toISOString(),source:'3xui/status',
    cpu:finite(d.cpu,0,100),mem:memory(d.mem),disk:memory(d.disk),netIO:d.netIO&&typeof d.netIO==='object'?{up:finite(d.netIO.up),down:finite(d.netIO.down)}:null,
    xray:d.xray&&typeof d.xray==='object'?{state:String(d.xray.state||'unknown').slice(0,30),version:String(d.xray.version||'').slice(0,64)}:null};
}
export async function read3xui(app,url,{token='',useSession=false,timeoutMs=8000,fetcher=fetch}={}){
  const target=new URL(statusUrl(app,url));
  if(target.origin!==new URL(url).origin)throw Error('CROSS_ORIGIN_BLOCKED');
  if(token && target.protocol!=='https:')return {state:'BLOCKED',reason:'TOKEN_REQUIRES_HTTPS'};
  const started=performance.now();const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const headers={'Accept':'application/json','X-Requested-With':'XMLHttpRequest'};
    if(token)headers.Authorization='Bearer '+token;
    const r=await fetcher(target.href,{method:'GET',headers,credentials:useSession?'include':'omit',redirect:'error',cache:'no-store',signal:controller.signal});
    if(r.status===401)return {state:'API_AUTH_REQUIRED',reason:'HTTP_401'};
    if(r.status===403)return {state:'API_FORBIDDEN',reason:'HTTP_403'};
    if(r.status===429)return {state:'RATE_LIMIT',reason:'HTTP_429'};
    if(r.status===404)return {state:'UNSUPPORTED',reason:'PATH_OR_VERSION_404'};
    if(!r.ok)return {state:'UNKNOWN',reason:'HTTP_'+r.status};
    const raw=await r.text();if(raw.length>128000)throw Error('OVERSIZED_STATUS');
    return {...parseStatus(JSON.parse(raw)),rttMs:Math.round(performance.now()-started)};
  }catch(e){return {state:e?.name==='AbortError'?'TIMEOUT':'NETWORK_ERROR',reason:e?.name==='AbortError'?'TIMEOUT':'NETWORK_OR_TLS',rttMs:null};}
  finally{clearTimeout(timer);}
}

// Explicit administrator operations: separate token; NEVER invoked by the background monitor.
export function apiEndpoint(app,url,tail){
 if(!/^\/(?:inbounds\/list|server\/restartXrayService)$/.test(tail))throw Error('ENDPOINT_NOT_ALLOWED');
 const base=statusUrl(app,url).replace(/server\/status$/,'');
 return base+tail.slice(1);
}
export async function adminRequest(app,url,token,operation,{fetcher=fetch}={}){
 if(typeof token!=='string'||!token||new URL(url).protocol!=='https:')throw Error('ADMIN_AUTH_REQUIRED');
 const spec=operation==='inbounds'?{path:'/inbounds/list',method:'GET'}:operation==='restart-xray'?{path:'/server/restartXrayService',method:'POST'}:null;
 if(!spec)throw Error('UNKNOWN_ADMIN_OPERATION');
 const api=apiEndpoint(app,url,spec.path);const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),8000);
 try{
  const r=await fetcher(api,{method:spec.method,headers:{Accept:'application/json',Authorization:'Bearer '+token},credentials:'omit',redirect:'error',cache:'no-store',signal:ctrl.signal});
  if(r.status===401||r.status===403)return {state:'ADMIN_AUTH_REQUIRED',reason:'HTTP_'+r.status};
  if(!r.ok)return {state:'ERROR',reason:'HTTP_'+r.status};
  const raw=await r.text();if(raw.length>250000)throw Error('RESPONSE_TOO_LARGE');
  const data=JSON.parse(raw);if(data.success!==true)return {state:'ERROR',reason:'API_REJECTED'};
  if(operation==='restart-xray')return {state:'OK',action:'restart-xray'};
  if(!Array.isArray(data.obj))return {state:'UNSUPPORTED',reason:'INBOUNDS_SCHEMA'};
  return {state:'OK',inbounds:data.obj.slice(0,250).map(x=>({id:Number.isInteger(x.id)?x.id:null,remark:String(x.remark||'').slice(0,64),port:Number.isInteger(x.port)?x.port:null,protocol:String(x.protocol||'').slice(0,24),enabled:x.enable===true,up:typeof x.up==='number'?x.up:null,down:typeof x.down==='number'?x.down:null,clients:Array.isArray(x.clientStats)?x.clientStats.length:null}))};
 }catch(e){return {state:e?.name==='AbortError'?'TIMEOUT':'NETWORK_ERROR',reason:'ADMIN_REQUEST_FAILED'};}
 finally{clearTimeout(timer);}
}
