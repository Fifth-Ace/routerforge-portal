// Manifest V3 service-worker feature. This is intentionally classic JS for importScripts.
// No credential is ever written to storage.local, logs, or history.
(()=>{
if(!chrome?.alarms?.onAlarm || !chrome?.storage?.session || !chrome?.runtime?.getURL)return; // unsupported legacy runtime
const CFG='rfPortalR5MonitorConfig',SNAP='rfPortalR5Snapshots',SESSION='rfPortalR5TransientAuth',REG='rfPortal2Registry',ALARM='rf-portal-r5-monitor';
const MAX=72,MAX_BODY=128000,PERIODS=[1,2,5,10,15,30,60],PERIOD_KEY='rfPortalR5PollingMinutes';
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
async function reconcile(){const cfg=(await chrome.storage.local.get(CFG))[CFG]||{};
 const auth=(await chrome.storage.session.get(SESSION))[SESSION]||{};
 // Keep user consent on lock/restart, but never wake a polling alarm when
 // no unlocked credential is available. ENABLE/RESUME calls reconcile again.
 const ready=Object.entries(cfg).some(([id,v])=>v?.enabled&&typeof auth[id]?.token==='string'&&auth[id].token.length>0);
 if(ready){
  if(!await chrome.alarms.get(ALARM))await chrome.alarms.create(ALARM,{periodInMinutes:1});
 }else await chrome.alarms.clear(ALARM);
}
async function runCycle(forceId=''){
 if(busy)return {state:'BUSY'};busy=true;
 try{const local=await chrome.storage.local.get([REG,CFG]),session=await chrome.storage.session.get(SESSION),reg=local[REG],cfg=local[CFG]||{},auth=session[SESSION]||{};
  const targets=(reg?.apps||[]).filter(a=>a.adapter==='3xui'&&cfg[a.id]?.enabled&&(!forceId||forceId===a.id));
  const now=Date.now(),out=[];let index=0;
  async function worker(){for(;;){const a=targets[index++];if(!a)return;const c=cfg[a.id],k=auth[a.id];
    if(!k||!k.token){if(!c.needsAuth){c.needsAuth=true;}continue;}
    if(!forceId&&(now-(c.lastAttempt||0)<Math.max(1,c.period||1)*60000-5000||now<(c.nextDue||0)))continue; // Keep last good snapshot; require explicit Vault unlock after browser restart.
    if(c.needsAuth)c.needsAuth=false;
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
   // CLEAR_AUTH revokes plaintext session tokens but preserves the user's
   // previously enabled monitoring preference. After Vault unlock the page
   // may rehydrate only those already consented-to monitors. CLEAR_ALL still
   // removes config/snapshots during explicitly confirmed profile replacement.
   if(all){await chrome.storage.local.set({[CFG]:{},[SNAP]:{}});}
   else{
    const cfg=(await chrome.storage.local.get(CFG))[CFG]||{};
    for(const v of Object.values(cfg))if(v?.enabled)v.needsAuth=true;
    await chrome.storage.local.set({[CFG]:cfg});
   }
   await chrome.storage.session.set({[SESSION]:{}});
   await reconcile();
   return {ok:true,cleared:all?'all':'auth'};
  }
  if(msg.type==='PORTAL_R5_MONITOR_SET_PERIOD'){
   const period=Number(msg.period);if(!PERIODS.includes(period))throw Error('INVALID_PERIOD');
   const cfg=(await chrome.storage.local.get(CFG))[CFG]||{};
   for(const v of Object.values(cfg))if(v?.enabled){v.period=period;v.lastAttempt=0;v.nextDue=0;}
   await chrome.storage.local.set({[CFG]:cfg,[PERIOD_KEY]:period});return {ok:true,period};
  }
  if(msg.type==='PORTAL_R5_MONITOR_REFRESH_DUE'){
   // Popup is a trusted extension page. Never accept an arbitrary URL or token.
   return {ok:true,...await runCycle()};
  }
  if(msg.type==='PORTAL_R5_MONITOR_STATUS'){
   const cfg=(await chrome.storage.local.get(CFG))[CFG]||{},auth=(await chrome.storage.session.get(SESSION))[SESSION]||{};
   return {ok:true,panels:Object.fromEntries(Object.entries(cfg).filter(([,v])=>v?.enabled).map(([id,v])=>[id,{enabled:true,needsAuth:!auth[id]?.token,period:v.period||1}]))};
  }
  const id=msg.appId;if(!/^[a-zA-Z0-9_-]{4,80}$/.test(id||''))throw Error('INVALID_APP');
  const reg=(await chrome.storage.local.get(REG))[REG],app=reg?.apps?.find(a=>a.id===id&&a.adapter==='3xui');if(!app)throw Error('APP_NOT_FOUND');
  const config=(await chrome.storage.local.get(CFG))[CFG]||{};
  if(msg.type==='PORTAL_R5_MONITOR_DISABLE'){
   delete config[id];await chrome.storage.local.set({[CFG]:config});const saved=(await chrome.storage.session.get(SESSION))[SESSION]||{};delete saved[id];await chrome.storage.session.set({[SESSION]:saved});await reconcile();return {ok:true};
  }
  if(msg.type!=='PORTAL_R5_MONITOR_ENABLE'&&msg.type!=='PORTAL_R5_MONITOR_RUN')throw Error('INVALID_OPERATION');
  const token=msg.token,period=Number(msg.period||1);if(typeof token!=='string'||!token||token.length>8192)throw Error('TOKEN_REQUIRED');
  if(!PERIODS.includes(period))throw Error('INVALID_PERIOD');
  const url=urlFor(app);endpoint(url);const u=new URL(url);
  if(!(await chrome.permissions.contains({origins:[u.protocol+'//'+u.hostname+'/*']})))throw Error('SITE_PERMISSION_DENIED');
  if(msg.type==='PORTAL_R5_MONITOR_ENABLE'){
   const existing=(await chrome.storage.session.get(SESSION))[SESSION]||{};existing[id]={token};await chrome.storage.session.set({[SESSION]:existing});
   config[id]={enabled:true,needsAuth:false,period,lastAttempt:0};await chrome.storage.local.set({[CFG]:config});await reconcile();
  }
  if(msg.type==='PORTAL_R5_MONITOR_RUN')return {ok:true,result:await test(app,token)};
  return {ok:true,result:await runCycle(id)};
 })().then(respond).catch(e=>respond({ok:false,error:String(e.message||'FAILED').slice(0,80)}));return true;
});
reconcile().catch(()=>{});
})();
