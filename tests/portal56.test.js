import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {PortalVault} from '../shared/portal2_vault.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const url='https://node.example:11361/private-3xui/';
function memory(seed={}){
 const data=structuredClone(seed);
 return {data,async get(k){return Object.fromEntries((Array.isArray(k)?k:[k]).map(key=>[key,structuredClone(data[key])]))},async set(o){Object.assign(data,structuredClone(o));}};
}
function worker(){
 const local=memory({rfPortal2Registry:{version:1,servers:[{id:'server_main',name:'Node'}],apps:[{id:'app_main',serverId:'server_main',adapter:'3xui',urlRemote:url,addressMode:'remote'}]}}),session=memory();
 const listeners={};let alarm=null,requests=0;
 const chrome={runtime:{id:'abc',getURL:p=>'chrome-extension://abc/'+p,onMessage:{addListener:f=>listeners.message=f},onStartup:{addListener:f=>listeners.startup=f},onInstalled:{addListener:f=>listeners.installed=f}},alarms:{onAlarm:{addListener:f=>listeners.alarm=f},async get(){return alarm},async create(name,info){alarm={name,...info}},async clear(){alarm=null}},storage:{local,session},permissions:{async contains(){return true}}};
 const sandbox={chrome,Date,Math,URL,AbortController,performance,setTimeout,clearTimeout,console,fetch:async()=>{requests++;return {ok:true,status:200,text:async()=>JSON.stringify({success:true,obj:{cpu:12,mem:{current:1,total:2},disk:{current:2,total:4},netIO:{up:33,down:44},xray:{state:'running'}}})}}};
 vm.runInNewContext(read('shared/portal2_monitor_worker.js'),sandbox);
 const send=(type,options={})=>new Promise(resolve=>{assert.equal(listeners.message({type,appId:'app_main',...options},{id:'abc',url:'chrome-extension://abc/portal-center.html'},resolve),true)});
 return {local,session,send,get requests(){return requests},get alarm(){return alarm}};
}
function popup(storage){
 const listeners={};const elems=new Map();
 const make=()=>({hidden:false,children:[],attributes:{},addEventListener(type,fn){this.listeners??={};this.listeners[type]=fn},setAttribute(k,v){this.attributes[k]=v},append(...x){this.children.push(...x)},prepend(...x){this.children.unshift(...x)},replaceChildren(...x){this.children=x}});
 const element=id=>{if(!elems.has(id))elems.set(id,make());return elems.get(id)};
 const document={getElementById:element,querySelector:()=>element('popup-body'),createElement:()=>make()};
 const chrome={storage:{local:storage,onChanged:{addListener:fn=>listeners.changed=fn}},tabs:{create:async()=>{}},runtime:{getURL:x=>x,sendMessage:async()=>({ok:true})}};
 vm.runInNewContext(read('popup.js').split('// R5.2 compact popup, last-known data only. No network requests or hidden probes.')[1],{chrome,document,URL,Date,console,Number,Math});
 return {element};
}
test('R5.6 encrypted token persists across closing and reopening Vault; wrong endpoint does not decrypt',async()=>{
 const storage=memory();const first=new PortalVault(storage);await first.create('master-password-at-least-12');await first.set('tok_app_main',url,'valid-test-token-001');
 first.lock();const second=new PortalVault(storage);await second.unlock('master-password-at-least-12');assert.equal(await second.get('tok_app_main',url),'valid-test-token-001');
 await assert.rejects(second.get('tok_app_main','https://node.example:11361/other/'),/ORIGIN_OR_PATH_MISMATCH/);
 assert.ok(!JSON.stringify(storage.data).includes('valid-test-token-001'));
});
test('R5.6 explicit Vault lock retains monitoring consent and recent snapshot, clears only plaintext session token',async()=>{
 const h=worker();assert.equal((await h.send('PORTAL_R5_MONITOR_ENABLE',{period:5,token:'secret-token-abc'})).ok,true);
 assert.equal(h.local.data.rfPortalR5Snapshots.app_main.latest.state,'OK');
 assert.equal((await h.send('PORTAL_R5_MONITOR_CLEAR_AUTH')).ok,true);
 assert.equal(h.session.data.rfPortalR5TransientAuth.app_main,undefined);
 assert.equal(h.local.data.rfPortalR5MonitorConfig.app_main.enabled,true);
 assert.equal(h.local.data.rfPortalR5MonitorConfig.app_main.needsAuth,true);
 assert.equal(h.local.data.rfPortalR5Snapshots.app_main.latest.state,'OK');
 assert.ok(!JSON.stringify(h.local.data).includes('secret-token-abc'));
 assert.equal((await h.send('PORTAL_R5_MONITOR_ENABLE',{period:5,token:'secret-token-resumed'})).ok,true);
 assert.equal(h.local.data.rfPortalR5MonitorConfig.app_main.needsAuth,false);
});
test('R5.6 full clear remains explicit and deletes snapshots/config, never changes registry',async()=>{
 const h=worker();await h.send('PORTAL_R5_MONITOR_ENABLE',{period:1,token:'test'});
 assert.equal((await h.send('PORTAL_R5_MONITOR_CLEAR_ALL')).ok,true);
 assert.deepEqual(h.local.data.rfPortalR5Snapshots,{});assert.deepEqual(h.local.data.rfPortalR5MonitorConfig,{});
 assert.equal(h.local.data.rfPortal2Registry.apps[0].id,'app_main');
});
test('R5.6 popup first launch starts Applications, later remembers last explicitly selected tab',async()=>{
 const data=memory({rfPortal2Registry:{servers:[],apps:[]}});
 const p1=popup(data);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(p1.element('popup-body').hidden,false);assert.equal(p1.element('portal-popup-servers').hidden,true);
 p1.element('portal-mode-servers').listeners.click();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(data.data.rfPortalPopupLastTab,'servers');
 const p2=popup(data);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(p2.element('popup-body').hidden,true);assert.equal(p2.element('portal-popup-servers').hidden,false);
 p2.element('portal-mode-apps').listeners.click();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(data.data.rfPortalPopupLastTab,'apps');
 const p3=popup(data);await new Promise(resolve=>setImmediate(resolve));assert.equal(p3.element('popup-body').hidden,false);
});
test('R5.6 token save verifies encrypted round trip and preserves enabled monitoring',()=>{
 const code=read('portal-center.js');
 assert.match(code,/await vault\.get\('tok_'\+a\.id,url\)!==token/);
 assert.match(code,/if\(previousConfig\?\.enabled\)\{/);
 assert.match(code,/await storeManualSnapshot\(a,statusResult\)/);
 assert.doesNotMatch(code,/await chrome\.runtime\.sendMessage\(\{type:'PORTAL_R5_MONITOR_DISABLE',appId:a\.id\}\);\n  if\(!stop\?\.ok\)throw Error\('MONITOR_DISABLE_FAILED'\);\n  await vault\.set/);
 assert.match(code,/if\(tokenFlags\[a\.id\]&&!vault\.unlocked\)/);
 assert.match(code,/await refreshTokenFlags\(\);render\(\)/);
 assert.match(code,/const restored=await resumeEnabledMonitors\(\)/);
 assert.match(code,/VAULT_UNLOCKED_MONITOR_RESUME_FAILED/);
 assert.match(code,/updateVault\(\);\s*status\('Vault разблокирован/);
});
