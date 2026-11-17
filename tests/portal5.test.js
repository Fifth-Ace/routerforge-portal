import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {safeSnapshot,apparentState,deriveRate,withoutSecretPath} from '../shared/portal2_monitor.js';
import {cleanRegistry,portableExport} from '../shared/portal2_registry.js';
import {adminRequest} from '../shared/portal2_3xui.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const app={id:'app_main',name:'3x-ui',adapter:'3xui',addressMode:'remote',urlRemote:'https://vps.example:8443/secret-48731/'};
test('R5 export redacts webBasePath; native registry still has original path',()=>{
 const r=cleanRegistry({version:1,servers:[],apps:[app]});const portable=portableExport(r);
 assert.ok(!portable.includes('secret-48731'));assert.equal(JSON.parse(portable).apps[0].urlRemote,'https://vps.example:8443/');
 assert.equal(r.apps[0].urlRemote,app.urlRemote);
});
test('R5 snapshot never includes URL, auth or UUID and preserves checkedAt',()=>{
 const t='2026-11-17T10:00:00.000Z',previous={checkedAt:'2026-11-17T09:59:00.000Z',netIO:{up:1000,down:500}};
 const s=safeSnapshot('app_main',{state:'OK',checkedAt:t,cpu:10,mem:{current:1,total:2},disk:{current:3,total:4},netIO:{up:1600,down:800},xray:{state:'running'},token:'secret-token',url:'https://vps.example/secret-48731',uuid:'private-uuid'},previous);
 assert.equal(s.rate.up,10);assert.equal(s.rate.down,5);assert.equal(s.rttMs,null);
 assert.ok(!JSON.stringify(s).includes('secret-48731'));assert.ok(!JSON.stringify(s).includes('secret-token'));
 assert.equal(apparentState(s,1,Date.parse(t)+200000),'STALE');assert.equal(apparentState(s,1,Date.parse(t)+10000),'OK');
});
test('R5 rate rejects counter resets and first readings',()=>{
 assert.equal(deriveRate(null,{netIO:{up:10,down:20}}),null);
 assert.equal(deriveRate({checkedAt:'2026-01-01T00:00:00Z',netIO:{up:100,down:100}},{checkedAt:'2026-01-01T00:01:00Z',netIO:{up:10,down:200}}),null);
 assert.equal(withoutSecretPath('https://vps.example/secret/'),'vps.example');
});
test('R5 admin API is explicit fixed allowlist, read-only inbound summary',async()=>{
 const calls=[];
 const response={success:true,obj:[{id:2,remark:'VLESS',port:443,protocol:'vless',enable:true,up:10,down:20,clientStats:[{uuid:'private-id',email:'private@example.com'}],settings:{secret:'NO_EXPORT'}}]};
 const x=await adminRequest(app,app.urlRemote,'admin-token','inbounds',{fetcher:async(u,o)=>{calls.push([u,o]);return {ok:true,status:200,text:async()=>JSON.stringify(response)};}});
 assert.equal(x.inbounds[0].clients,1);assert.equal(x.inbounds[0].port,443);assert.ok(!JSON.stringify(x).includes('private-id'));assert.ok(!JSON.stringify(x).includes('NO_EXPORT'));
 assert.equal(calls[0][0],'https://vps.example:8443/secret-48731/panel/api/inbounds/list');assert.equal(calls[0][1].method,'GET');
 await assert.rejects(adminRequest(app,app.urlRemote,'admin-token','delete-all'),/UNKNOWN_ADMIN_OPERATION/);
});
test('R5 restart uses only POST, separate admin token, no redirects',async()=>{
 const calls=[];const x=await adminRequest(app,app.urlRemote,'admin-token','restart-xray',{fetcher:async(u,o)=>{calls.push([u,o]);return {ok:true,status:200,text:async()=>JSON.stringify({success:true})};}});
 assert.equal(x.state,'OK');assert.match(calls[0][0],/\/server\/restartXrayService$/);assert.equal(calls[0][1].method,'POST');assert.equal(calls[0][1].redirect,'error');assert.equal(calls[0][1].credentials,'omit');
 assert.equal(calls[0][1].headers.Authorization,'Bearer admin-token');
});
test('R5 components feature ownership, host-only UI and no duplicated Keenetic items',()=>{
 const html=read('portal-center.html'),center=read('portal-center.js'),worker=read('shared/portal2_monitor_worker.js');
 assert.match(html,/monitor-period/);assert.match(html,/management-dialog/);
 assert.match(center,/PORTAL_R5_MONITOR_ENABLE/);assert.match(center,/PORTAL_R5_MONITOR_CLEAR_ALL/);
 assert.match(worker,/chrome\.alarms\.onAlarm/);assert.match(worker,/chrome\.storage\.session/);
 assert.match(center,/withoutSecretPath\(appUrl\(a\)\)/);
 assert.doesNotMatch(worker,/restartXrayService|inbounds\/list/);
});
test('R5 worker opt-in: schedule, authenticated status, bounded local snapshots, revoke on disable',async()=>{
 const local={rfPortal2Registry:{version:1,servers:[],apps:[app]}},session={};let responseMessage;
 const listeners={};let seen=[],alarm=null;
 const makeStore=data=>({async get(keys){const names=Array.isArray(keys)?keys:[keys];return Object.fromEntries(names.map(k=>[k,structuredClone(data[k])]));},async set(items){Object.assign(data,structuredClone(items));}});
 const chrome={runtime:{id:'mock-id',getURL:path=>'chrome-extension://mock-id/'+path,onMessage:{addListener:f=>listeners.message=f},onStartup:{addListener:f=>{}},onInstalled:{addListener:f=>{}}},alarms:{async get(){return alarm;},async create(id,info){alarm={name:id,...info};},async clear(){alarm=null;},onAlarm:{addListener:f=>listeners.alarm=f}},storage:{local:makeStore(local),session:makeStore(session)},permissions:{async contains(){return true;}}};
 const sandbox={chrome,URL,Date,Math,AbortController,performance,JSON,console,setTimeout,clearTimeout,fetch:async (u,o)=>{seen.push({url:u,opts:o});return {status:200,ok:true,async text(){return JSON.stringify({success:true,obj:{cpu:17,mem:{current:2,total:4},disk:{current:3,total:5},netIO:{up:100,down:200},xray:{state:'running'}}});}};}};
 vm.runInNewContext(read('shared/portal2_monitor_worker.js'),sandbox);
 const send=(type,args={})=>new Promise(resolve=>{const acknowledged=listeners.message({type,appId:app.id,...args},{id:'mock-id',url:'chrome-extension://mock-id/portal-center.html'},resolve);assert.equal(acknowledged,true);});
 const enabled=await send('PORTAL_R5_MONITOR_ENABLE',{period:1,token:'transient-mon'});
 assert.equal(enabled.ok,true);assert.equal(alarm.name,'rf-portal-r5-monitor');assert.equal(local.rfPortalR5MonitorConfig.app_main.enabled,true);
 assert.equal(local.rfPortalR5Snapshots.app_main.latest.state,'OK');assert.equal(seen[0].opts.headers.Authorization,'Bearer transient-mon');
 assert.equal(seen[0].opts.credentials,'omit');assert.ok(!JSON.stringify(local).includes('transient-mon'));assert.ok(!JSON.stringify(local.rfPortalR5Snapshots).includes('secret-48731'));
 const disabled=await send('PORTAL_R5_MONITOR_DISABLE');assert.equal(disabled.ok,true);assert.equal(alarm,null);assert.equal(session.rfPortalR5TransientAuth.app_main,undefined);
});

// R5.3.2 regression: import/lock are GLOBAL commands, never app-scoped.
test('R5.3.2 global monitor clear/all and lock are authenticated, appId-free and do not erase Vault',async()=>{
 const current={rfPortalR5MonitorConfig:{app_main:{enabled:true}},rfPortalR5Snapshots:{app_main:{latest:{state:'OK'}}},rfPortal2VaultEncrypted:{protected:'keep'}};
 const session={rfPortalR5TransientAuth:{app_main:{token:'sensitive'}}};
 const handlers={};let alarm={name:'rf-portal-r5-monitor'};
 const mk=(data)=>({async get(keys){const names=Array.isArray(keys)?keys:[keys];return Object.fromEntries(names.map(k=>[k,structuredClone(data[k])]));},async set(entries){Object.assign(data,structuredClone(entries));}});
 const chrome={runtime:{id:'mock-id',getURL:x=>'chrome-extension://mock-id/'+x,onMessage:{addListener:fn=>handlers.message=fn},onStartup:{addListener(){}},onInstalled:{addListener(){}}},alarms:{onAlarm:{addListener(){}},async get(){return alarm},async clear(){alarm=null;return true},async create(){alarm={name:'rf-portal-r5-monitor'}}},storage:{local:mk(current),session:mk(session)},permissions:{async contains(){return true}}};
 vm.runInNewContext(read('shared/portal2_monitor_worker.js'),{chrome,URL,Date,Math,AbortController,performance,JSON,console,setTimeout,clearTimeout});
 const send=(type,sender={id:'mock-id',url:'chrome-extension://mock-id/portal-center.html'})=>new Promise(resolve=>{
  const ret=handlers.message({type},sender,resolve);assert.equal(ret,sender.id==='mock-id');
 });
 let r=await send('PORTAL_R5_MONITOR_CLEAR_AUTH');assert.equal(r.ok,true);
 assert.deepEqual(session.rfPortalR5TransientAuth,{});
 assert.deepEqual(current.rfPortalR5MonitorConfig,{app_main:{enabled:true,needsAuth:true}});
 assert.equal(alarm,null); // no unauthenticated alarm while Vault is locked
 assert.ok(current.rfPortalR5Snapshots.app_main);assert.deepEqual(current.rfPortal2VaultEncrypted,{protected:'keep'});
 current.rfPortalR5MonitorConfig={app_main:{enabled:true}};current.rfPortalR5Snapshots={app_main:{latest:{state:'OK'}}};
 r=await send('PORTAL_R5_MONITOR_CLEAR_ALL');assert.equal(r.ok,true);assert.deepEqual(current.rfPortalR5Snapshots,{});assert.deepEqual(current.rfPortalR5MonitorConfig,{});
 assert.deepEqual(current.rfPortal2VaultEncrypted,{protected:'keep'});
});
