import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {cleanRegistry,portableExport,prepareProfileImport} from '../shared/portal2_registry.js';
import {secureBackup,openBackup} from '../shared/portal2_bundle.js';
import {PERIODS} from '../shared/portal2_monitor.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const url='https://vps.example:11361/hidden-panel-key/';
const app={id:'app_main',serverId:'server_main',name:'3x-ui',urlRemote:url,addressMode:'remote',adapter:'3xui'};
const reg=cleanRegistry({version:1,servers:[{id:'server_main',name:'mail'}],apps:[app]});
function fakeWorker(seed={}){
 const local={rfPortal2Registry:reg,...seed};const session={};const listeners={};let alarm=null;let attempts=0;
 const store=state=>({async get(keys){return Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,structuredClone(state[k])]));},async set(o){Object.assign(state,structuredClone(o));}});
 const chrome={runtime:{id:'id-123',getURL:p=>'chrome-extension://id-123/'+p,onMessage:{addListener:f=>listeners.message=f},onStartup:{addListener:f=>listeners.startup=f},onInstalled:{addListener:f=>listeners.installed=f}},alarms:{onAlarm:{addListener:f=>listeners.alarm=f},async get(){return alarm},async create(name,info){alarm={name,...info}},async clear(){alarm=null}},storage:{local:store(local),session:store(session)},permissions:{async contains(){return true}}};
 const sandbox={chrome,Date,Math,URL,AbortController,performance,setTimeout,clearTimeout,console,fetch:async(url,opts)=>{attempts++;return {ok:true,status:200,text:async()=>JSON.stringify({success:true,obj:{cpu:7,mem:{current:1,total:2},disk:{current:3,total:4},netIO:{up:1,down:2},xray:{state:'running'}}})};}};
 vm.runInNewContext(read('shared/portal2_monitor_worker.js'),sandbox);
 const send=(type,o={})=>new Promise(resolve=>{assert.equal(listeners.message({type,appId:app.id,...o},{id:'id-123',url:'chrome-extension://id-123/popup.html'},resolve),true);});
 return {local,session,listeners,send,get alarm(){return alarm},get attempts(){return attempts}};
}
test('R5.5 interval offers 1..60 min and never stores an expiry for a session token',async()=>{
 assert.deepEqual(PERIODS,[1,2,5,10,15,30,60]);
 const h=fakeWorker(); const x=await h.send('PORTAL_R5_MONITOR_ENABLE',{period:60,token:'secret-runtime-token'});
 assert.equal(x.ok,true);assert.equal(h.local.rfPortalR5MonitorConfig.app_main.period,60);
 assert.equal(h.local.rfPortalR5MonitorConfig.app_main.enabled,true);assert.equal(h.session.rfPortalR5TransientAuth.app_main.until,undefined);
 assert.equal(h.session.rfPortalR5TransientAuth.app_main.token,'secret-runtime-token');assert.ok(!JSON.stringify(h.local).includes('secret-runtime-token'));
 assert.equal(h.attempts,1);
 await h.send('PORTAL_R5_MONITOR_REFRESH_DUE');assert.equal(h.attempts,1,'popup must not bypass interval');
 const y=await h.send('PORTAL_R5_MONITOR_SET_PERIOD',{period:10});assert.equal(y.ok,true);
 assert.equal(h.local.rfPortalR5PollingMinutes,10);assert.equal(h.local.rfPortalR5MonitorConfig.app_main.period,10);
 await h.send('PORTAL_R5_MONITOR_REFRESH_DUE');assert.equal(h.attempts,2,'changing poll interval allows immediate due refresh');
 assert.equal((await h.send('PORTAL_R5_MONITOR_SET_PERIOD',{period:0})).ok,false);
 assert.equal(h.local.rfPortalR5PollingMinutes,10);
});
test('R5.5 restart without in-memory token does not erase last good server snapshot',async()=>{
 const h=fakeWorker({rfPortalR5MonitorConfig:{app_main:{enabled:true,period:5,lastAttempt:0}},rfPortalR5Snapshots:{app_main:{latest:{state:'OK',checkedAt:'2026-11-17T10:00:00Z'}}}});
 await h.listeners.startup(); await h.send('PORTAL_R5_MONITOR_REFRESH_DUE');
 assert.equal(h.attempts,0);assert.equal(h.local.rfPortalR5MonitorConfig.app_main.needsAuth,true);
 assert.equal(h.local.rfPortalR5Snapshots.app_main.latest.state,'OK');
 const state=await h.send('PORTAL_R5_MONITOR_STATUS');assert.equal(state.panels.app_main.needsAuth,true);
 const resume=await h.send('PORTAL_R5_MONITOR_ENABLE',{period:5,token:'restored-runtime-token'});assert.equal(resume.ok,true);
 assert.equal(h.local.rfPortalR5MonitorConfig.app_main.needsAuth,false);assert.equal(h.attempts,1);
});
test('R5.5 ordinary redacted profile safely restores original 3x-ui full URL from same ID and Vault binding',()=>{
 const redacted=JSON.parse(portableExport(reg));
 assert.equal(redacted.apps[0].urlRemote,'https://vps.example:11361/');
 assert.equal(prepareProfileImport(redacted,reg).apps[0].urlRemote,url);
 const blank=cleanRegistry({version:1,servers:[],apps:[]});
 assert.equal(prepareProfileImport(redacted,blank,{tok_app_main:{appId:'tok_app_main',origin:'https://vps.example:11361',path:'/hidden-panel-key/'}}).apps[0].urlRemote,url);
 assert.throws(()=>prepareProfileImport(redacted,blank),/SECRET_PATH_NOT_IN_BACKUP_USE_ENCRYPTED_BACKUP/);
 assert.throws(()=>prepareProfileImport(redacted,blank,{tok_app_main:{appId:'tok_wrong',origin:'https://vps.example:11361',path:'/untrusted/'}}),/SECRET_PATH_NOT_IN_BACKUP_USE_ENCRYPTED_BACKUP/);
});
test('R5.5 protected backup preserves full 3x-ui URL and chosen interval, including older v1 without settings',async()=>{
 const p=await secureBackup(reg,null,'strong-backup-password-2026',{period:30});
 assert.ok(!p.includes('hidden-panel-key'));
 const recovered=await openBackup(p,'strong-backup-password-2026');
 assert.equal(recovered.registry.apps[0].urlRemote,url);assert.equal(recovered.settings.period,30);
 const older=await openBackup(await secureBackup(reg,null,'strong-backup-password-2026'),'strong-backup-password-2026');
 assert.equal(older.settings.period,1);
 await assert.rejects(secureBackup(reg,null,'strong-backup-password-2026',{period:0}),/BACKUP_PERIOD_INVALID/);
});
test('R5.5 extension UI uses due-only popup refresh and persistent interval without background key persistence',()=>{
 const js=read('portal-center.js'),html=read('portal-center.html'),popup=read('popup.js'),worker=read('shared/portal2_monitor_worker.js');
 assert.match(js,/PORTAL_R5_MONITOR_SET_PERIOD/);
 assert.match(js,/SECRET_PATH_NOT_IN_BACKUP_USE_ENCRYPTED_BACKUP|prepareProfileImport\(parsed,registry,storedVault/);
 assert.match(html,/<option value="60">60 минут<\/option>/);
 assert.match(popup,/PORTAL_R5_MONITOR_REFRESH_DUE/);
 assert.doesNotMatch(worker,/SESSION_EXPIRED|const TTL=60\*60/);
 assert.doesNotMatch(worker,/\[SESSION\]:.*local/);
});
