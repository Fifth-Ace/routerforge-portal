import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {suggestCoreWebApps} from '../shared/core_suggestions.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const router='http://192.168.10.1';
const app={id:'manual_123',url:'http://192.168.10.1:8090/',name:'User service',mode:'auto',enabled:true};
function mockBackground({tabs=[{id:55,windowId:7,url:router+'/',active:true,status:'complete'}],permission=true,reply={ok:true},appMode='auto'}={}) {
  let handler;
  const events=[];
  const state={version:1,routers:{[router]:{label:'Home',apps:[{...app,mode:appMode}]}}};
  const event=fn=>({addListener:cb=>{if(fn==='message')handler=cb;},removeListener:()=>{}});
  const chrome={
    runtime:{onInstalled:event(),onStartup:event(),onMessage:event('message')},
    permissions:{onAdded:event(),onRemoved:event(),contains:async()=>permission},
    storage:{local:{get:async()=>({kbridgeState:state})},onChanged:event()},
    scripting:{getRegisteredContentScripts:async()=>[],unregisterContentScripts:async()=>{},registerContentScripts:async()=>{},insertCSS:async()=>{events.push('inject-css')},executeScript:async()=>{events.push('inject-js')}},
    tabs:{query:async()=>tabs,get:async id=>({id,status:'complete'}),onUpdated:event(),
      create:async spec=>{events.push(['create',spec]);return {id:99,windowId:7,url:router,status:'complete'};},
      sendMessage:async(id,msg)=>{events.push(['message',id,msg]);return reply;},
      update:async(id,spec)=>{events.push(['update',id,spec]);return {}}},
    windows:{update:async(id,spec)=>{events.push(['focus',id,spec]);return {}}}
  };
  vm.runInNewContext(read('background.js'),{chrome,URL,console,setTimeout,clearTimeout});
  return {events,send:(message)=>new Promise(resolve=>handler(message,{},resolve))};
}
test('Imported Core module and third-party apps use embedded mode by default',()=>{
  const list=suggestCoreWebApps({kind:'ok',modules:[{id:'dns-router',name:'DNS Router',installed:true,web:{scheme:'http',port:2233,path:'/'}}],integrations:[{id:'third',name:'Third',installed:true,web:{scheme:'http',port:8888,path:'/'}}]},router);
  assert.equal(list.length,2);
  assert.ok(list.every(item=>item.mode==='auto'));
});
test('Existing Keenetic tab receives SHOW_APP, never app URL',async()=>{
  const b=mockBackground();const result=await b.send({type:'OPEN_EMBEDDED_APP',router,id:app.id});
  assert.equal(result.ok,true);assert.equal(result.tabId,55);
  assert.equal(b.events.filter(e=>Array.isArray(e)&&e[0]==='create').length,0);
  assert.equal(b.events.filter(e=>Array.isArray(e)&&e[0]==='message').length,1);
  assert.equal(b.events.find(e=>Array.isArray(e)&&e[0]==='message')[2].type,'SHOW_APP');
});
test('Other active tab triggers Keenetic WebUI tab rather than app origin',async()=>{
  const b=mockBackground({tabs:[{id:33,url:'https://example.org/',active:true}]});
  const result=await b.send({type:'OPEN_EMBEDDED_APP',router,id:app.id});
  assert.equal(result.ok,true);
  const create=b.events.find(e=>Array.isArray(e)&&e[0]==='create');
  assert.equal(create[1].url,router);
  assert.notEqual(create[1].url,app.url);
});
test('No cross-router apps, no external-mode bypass, no revoked permission',async()=>{
  for(const [change,error] of [[{appMode:'external'},'EXPLICIT_EXTERNAL_MODE'],[{permission:false},'ROUTER_SITE_PERMISSION_REQUIRED']]){
    const b=mockBackground(change);const result=await b.send({type:'OPEN_EMBEDDED_APP',router,id:app.id});
    assert.equal(result.ok,false);assert.equal(result.error,error);
    assert.ok(!b.events.some(e=>Array.isArray(e)&&e[0]==='create'));
  }
  const b=mockBackground();const result=await b.send({type:'OPEN_EMBEDDED_APP',router,id:'other_router_app'});
  assert.equal(result.ok,false);assert.equal(result.error,'APP_NOT_IN_SELECTED_ROUTER');
});
test('If iframe bridge is not ready, never silently open the external app URL',async()=>{
  const b=mockBackground({reply:{ok:false}});
  const result=await b.send({type:'OPEN_EMBEDDED_APP',router,id:app.id});
  assert.equal(result.ok,false);assert.equal(result.error,'KEENETIC_LOGIN_OR_BRIDGE_REQUIRED');
  assert.ok(!b.events.some(e=>Array.isArray(e)&&e[0]==='create'));
});
test('Popup requests router site permission in click gesture and delegates native launch',()=>{
  const source=read('popup.js');
  const section=source.slice(source.indexOf('function renderApps('),source.indexOf('async function refresh()'));
  assert.match(section,/const grant=chrome\.permissions\.request/);
  assert.match(section,/type:'OPEN_EMBEDDED_APP'/);
  assert.match(section,/if \(app\.mode === 'external'\)/);
  assert.doesNotMatch(section,/catch\s*\{\s*chrome\.tabs\.create\(\{\s*url:\s*app\.url/);
  const native=read('content/bridge.js');
  assert.match(native,/if \(appMode\(app\) === 'external'\)/);
});
