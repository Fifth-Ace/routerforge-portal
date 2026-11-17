// R5 shared, deterministic monitoring model. No authentication material is persisted here.
export const SNAPSHOT_KEY='rfPortalR5Snapshots';
export const CONFIG_KEY='rfPortalR5MonitorConfig';
export const PERIODS=[1,2,5,10,15,30,60];
export const metricPercent=x=>x&&x.total>0&&Number.isFinite(x.current)&&Number.isFinite(x.total)?Math.round(100*x.current/x.total)+'%':'—';
export function deriveRate(previous,next){
 const a=previous?.netIO,b=next?.netIO;
 const seconds=(Date.parse(next?.checkedAt||'')-Date.parse(previous?.checkedAt||''))/1000;
 if(!a||!b||!(seconds>=1)||seconds>1800)return null;
 const up=b.up-a.up,down=b.down-a.down;
 return Number.isFinite(up)&&Number.isFinite(down)&&up>=0&&down>=0?{up:up/seconds,down:down/seconds}:null;
}
export function safeSnapshot(appId,result,previous=null){
 if(!/^[a-zA-Z0-9_-]{4,80}$/.test(appId))throw Error('BAD_APP_ID');
 const allowed=['OK','XRAY_STOPPED','API_AUTH_REQUIRED','API_FORBIDDEN','UNSUPPORTED','NETWORK_ERROR','TIMEOUT','RATE_LIMIT','VAULT_LOCKED','PERMISSION_REQUIRED','TLS_ERROR','UNKNOWN'];
 const state=result.state==='OK'&&result.xray?.state==='stopped'?'XRAY_STOPPED':result.state;
 const snap={appId,state:allowed.includes(state)?state:'UNKNOWN',checkedAt:new Date(result.checkedAt||Date.now()).toISOString(),source:'CHROME',reason:String(result.reason||'').replace(/https?:\/\/\S+/ig,'[redacted]').slice(0,90),rttMs:Number.isFinite(result.rttMs)?Math.round(result.rttMs):null};
 if(result.state==='OK'){
  snap.cpu=Number.isFinite(result.cpu)?result.cpu:null;
  for(const key of ['mem','disk']){const m=result[key];snap[key]=m?{current:Number.isFinite(m.current)?m.current:null,total:Number.isFinite(m.total)?m.total:null}:null;}
  snap.netIO=result.netIO?{up:result.netIO.up,down:result.netIO.down}:null;
  snap.xray={state:String(result.xray?.state||'unknown').slice(0,20),version:String(result.xray?.version||'').slice(0,30)};
  snap.rate=deriveRate(previous,result);
 }
 return snap;
}
export function apparentState(snapshot,periodMinutes=1,now=Date.now()){
 if(!snapshot)return 'NOT_CHECKED';
 const age=now-Date.parse(snapshot.checkedAt);
 return !Number.isFinite(age)||age<0||age>Math.max(3*periodMinutes*60*1000,180000)?'STALE':snapshot.state;
}
export function withoutSecretPath(raw){
 try{const u=new URL(raw);return u.host;}catch{return '—';}
}
