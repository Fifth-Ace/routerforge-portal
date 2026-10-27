import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../background.js',import.meta.url),'utf8');
function harness() {
  const callbacks={}, calls={ registered:[],unregistered:[],opened:[] };
  const state={version:1,routers:{'http://192.168.1.1':{label:'Home',apps:[{id:'my_app_1',name:'Test',url:'http://192.168.1.1:8080',mode:'external'},{id:'preset_awg-manager',presetId:'awg-manager',enabled:false,name:'AWG Manager',url:'http://192.168.1.1:2222',mode:'external'}]}}};
  let registration=[];
  const chrome={
    scripting:{getRegisteredContentScripts:async()=>registration,
      unregisterContentScripts:async ({ids})=>{registration=registration.filter(s=>!ids.includes(s.id));calls.unregistered.push(...ids)},
      registerContentScripts:async scripts=>{registration.push(...scripts);calls.registered.push(...scripts)}},
    permissions:{contains:async ({origins})=>origins[0]==='http://192.168.1.1/*',
      onAdded:{addListener:f=>callbacks.permissionAdded=f},onRemoved:{addListener:f=>callbacks.permissionRemoved=f}},
    storage:{local:{get:async()=>({kbridgeState:state})},onChanged:{addListener:f=>callbacks.changed=f}},
    tabs:{create:async arg=>calls.opened.push(arg)},
    runtime:{onStartup:{addListener:f=>callbacks.startup=f},onInstalled:{addListener:f=>callbacks.installed=f},
      onMessage:{addListener:f=>callbacks.message=f},openOptionsPage:async()=>{}}
  };
  vm.runInNewContext(source,{chrome,console,URL,Promise}, {filename:'background.js'});
  return {calls,callbacks};
}
function message(callbacks,msg,sender={tab:{url:'http://192.168.1.1',id:9}}) {
  return new Promise(resolve=>callbacks.message(msg,sender,resolve));
}
test('sync registers only approved router origin',async()=>{
  const {callbacks,calls}=harness();
  const result=await message(callbacks,{type:'SYNC'});
  assert.equal(result.ok,true);
  assert.equal(result.count,1);
  assert.equal(calls.registered[0].matches[0],'http://192.168.1.1/*');
  const second=await message(callbacks,{type:'SYNC'});
  assert.equal(second.count,1);
  assert.equal(calls.unregistered.length,1);
});
test('app open requires configured ID and router tab origin',async()=>{
  const {callbacks,calls}=harness();
  assert.equal((await message(callbacks,{type:'OPEN_APP',id:'my_app_1'})).ok,true);
  assert.equal(calls.opened[0].url,'http://192.168.1.1:8080/');
  assert.equal((await message(callbacks,{type:'OPEN_APP',id:'nope'})).ok,false);
  assert.equal((await message(callbacks,{type:'OPEN_APP',id:'preset_awg-manager'})).ok,false);
  assert.equal((await message(callbacks,{type:'OPEN_APP',id:'my_app_1'},{tab:{url:'https://evil.example',id:8}})).ok,false);
  assert.equal(calls.opened.length,1);
});
