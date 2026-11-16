import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source = file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const router='http://192.168.10.1',core='http://192.168.10.1:2233';
const cat=(modules,integrations=[])=>({kind:'ok',modules,integrations});
const item=(id,name,port,opts={})=>({id,name,installed:opts.installed!==false,web:{scheme:opts.scheme||'http',port,path:opts.path||'/'}});
function harness({linked=true,permit=true,coreTab=true,kind='ok',existing=[]}={}) {
  let handler;
  const calls={reads:0,writes:0,injected:0,permission:0};
  let state={version:1,routers:{[router]:{label:'My router',apps:[
    {id:'manual_custom',name:'My custom app',url:'http://192.168.10.1:7000/path',mode:'external',enabled:true,favorite:true,group:'other'},
    ...existing
  ],...(linked?{coreLink:core}:{})}}};
  const catalogue=cat([item('dns-router','DNS Router',55223),item('nfqws-manager','NFQWS',2230),item('not-installed','Not there',9000,{installed:false})],
    [item('third-party','Third Party UI',8044,{path:'/home'})]);
  const event={addListener:()=>{}};
  const chrome={
    runtime:{onMessage:{addListener:fn=>{handler=fn}},onInstalled:event,onStartup:event,openOptionsPage:async()=>{}},
    permissions:{contains:async()=>{calls.permission++;return permit},onAdded:event,onRemoved:event},
    storage:{local:{get:async()=>({kbridgeState:structuredClone(state)}),set:async obj=>{calls.writes++;state=structuredClone(obj.kbridgeState)}},onChanged:event},
    tabs:{query:async()=>coreTab?[{id:35,url:core+'/',active:true}]:[],get:async()=>{},sendMessage:async()=>{},onUpdated:event},
    scripting:{getRegisteredContentScripts:async()=>[],unregisterContentScripts:async()=>{},registerContentScripts:async()=>{},executeScript:async arg=>{calls.injected++; assert.equal(arg.args[0],core);return [{result:kind==='ok'?catalogue:{kind}}];}},
    windows:{update:async()=>{}}
  };
  vm.runInNewContext(source('background.js'),{chrome,URL,console,Promise,setTimeout,clearTimeout}, {filename:'background.js'});
  const sender={tab:{id:20,url:router+'/home'}};
  const send=(type,extra={},identity=sender)=>new Promise(resolve=>handler({type,router,...extra},identity,resolve));
  return {send,calls,getState:()=>state};
}
test('P6 read requires linked physical router, granted Core origin and open Core tab',async()=>{
  for(const [options,expected] of [[{linked:false},'CORE_LINK_REQUIRED'],[{permit:false},'CORE_SITE_PERMISSION_REQUIRED'],[{coreTab:false},'CORE_TAB_REQUIRED'],[{kind:'auth_required'},'CORE_LOGIN_REQUIRED']]){
    const h=harness(options);const result=await h.send('P6_CORE_PREVIEW');
    assert.equal(result.ok,false);assert.equal(result.error,expected);
    assert.equal(h.calls.writes,0);
  }
  const h=harness();
  const wrong=await h.send('P6_CORE_PREVIEW',{}, {tab:{id:19,url:'https://evil.example/'}});
  assert.equal(wrong.error,'ROUTER_TAB_REQUIRED');
  assert.equal(h.calls.injected,0);
});
test('P6 shows installed modules and third-party UIs, embedded by default and no writes on preview',async()=>{
  const h=harness(), r=await h.send('P6_CORE_PREVIEW');
  assert.equal(r.ok,true);
  assert.equal(r.apps.length,3);
  assert.ok(r.apps.every(x=>x.mode==='auto'));
  assert.equal(r.apps.find(x=>x.coreSourceId==='i_third-party').url,'http://192.168.10.1:8044/home');
  assert.equal(h.calls.injected,1);assert.equal(h.calls.writes,0);
});
test('P6 imports only selected catalogue entries and preserves manually configured apps',async()=>{
  const h=harness();
  const result=await h.send('P6_CORE_IMPORT',{sourceIds:['i_third-party','m_dns-router']});
  assert.equal(result.ok,true);assert.equal(result.added,2);
  assert.equal(h.calls.writes,1);
  const apps=h.getState().routers[router].apps;
  assert.equal(apps.length,3);
  assert.equal(apps[0].id,'manual_custom');assert.equal(apps[0].favorite,true);
  assert.equal(apps[0].mode,'external');assert.equal(apps[0].url,'http://192.168.10.1:7000/path');
  assert.equal(apps[1].mode,'auto');assert.equal(apps[2].mode,'auto');
  const duplicate=await h.send('P6_CORE_IMPORT',{sourceIds:['m_dns-router']});
  assert.equal(duplicate.ok,false);assert.equal(duplicate.error,'SELECTION_STALE_OR_DUPLICATE');
  assert.equal(h.calls.writes,1);
});
test('P6 never trusts caller supplied URL or unsupported selection',async()=>{
  const h=harness();
  for(const x of [[],['bad'],['m_dns-router','m_dns-router'],Array(17).fill('m_dns-router')]){
    const result=await h.send('P6_CORE_IMPORT',{sourceIds:x});
    assert.equal(result.ok,false);
  }
  const bad=await h.send('P6_CORE_IMPORT',{sourceIds:['m_fake'],url:'https://evil.example',name:'Owned'});
  assert.equal(bad.ok,false);assert.equal(h.calls.writes,0);
});
test('P6 native UI exposes user-click preview and import; no Core dependency for manual editor',()=>{
  const bridge=source('content/bridge.js'),bg=source('background.js'),css=source('content/bridge.css');
  assert.match(bridge,/function p6RenderCoreImport\(panel\)/);
  assert.match(bridge,/type:'P6_CORE_PREVIEW'/);
  assert.match(bridge,/type:'P6_CORE_IMPORT'/);
  assert.match(bridge,/p6RenderCoreImport\(panel\)/);
  assert.match(bridge,/function nativeEditForm\(parent,app\)/);
  assert.match(bridge,/function validNativeUrl\(value\)/);
  assert.match(bg,/credentials:'same-origin'/);
  assert.match(bg,/fetch\(expectedOrigin\+'\/api\/catalog'/);
  assert.doesNotMatch(bg,/\/api\/catalog\/(refresh|install|action)/);
  assert.match(css,/\.kb-p6-core/);
  const manifest=JSON.parse(source('manifest.json'));
  assert.deepEqual(manifest.permissions,['storage','scripting','activeTab']);
  assert.ok(!('host_permissions' in manifest));
  assert.equal(manifest.version,'0.10.11');
});
