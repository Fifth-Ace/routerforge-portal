import test from 'node:test';
import assert from 'node:assert/strict';
import {routerOverview,routerProfileKeys,isCoreServiceOrigin,coreParentRouter,chooseRouter,readSelectedRouter,saveSelectedRouter,SELECTED_ROUTER_KEY} from '../shared/router_overview.js';
const A='http://192.168.10.1', B='https://second.keenetic.net';
const sample={version:1,routers:{
  [A]:{label:'Home',apps:[{enabled:true,favorite:true},{enabled:false},{enabled:true}] ,coreLink:'http://192.168.10.1:2233'},
  [B]:{label:'Office',apps:[{enabled:true}],coreLink:''}
}};

test('P3 overview is bounded, local and respects active, disabled and linked status',()=>{
  const list=routerOverview(sample,B);
  assert.equal(list.length,2);
  assert.deepEqual(list.map(x=>[x.origin,x.apps,x.favorites,x.activeTab,x.coreLinked]),[
    [A,2,1,false,true], [B,1,0,true,false]
  ]);
  assert.equal(list[0].coreURL,'http://192.168.10.1:2233/');
  assert.equal(list[1].coreURL,'http://second.keenetic.net:2233/');
  assert.equal(routerOverview(null).length,0);
  assert.ok(Object.isFrozen(list[0]));
});

test('P3 selection retains chosen router, prefers active tab, and falls back safely',()=>{
  assert.equal(chooseRouter(sample,B,A,A),B);
  assert.equal(chooseRouter(sample,null,B,A),B);
  assert.equal(chooseRouter(sample,null,null,B),B);
  assert.equal(chooseRouter(sample,'http://untrusted.invalid',null,'also missing'),A);
  assert.equal(chooseRouter({routers:{}},null,null,null),null);
});

test('P3 remembers only an explicitly selected, already-saved origin',async()=>{
  const data={}; const storage={get:async()=>({...data}),set:async o=>{Object.assign(data,o)}};
  assert.equal(await readSelectedRouter(storage),'');
  assert.equal(await saveSelectedRouter(sample,B,storage),B);
  assert.equal(await readSelectedRouter(storage),B);
  assert.deepEqual(Object.keys(data),[SELECTED_ROUTER_KEY]);
  await assert.rejects(saveSelectedRouter(sample,'http://evil.example',storage),/ROUTER_NOT_SAVED/);
});

test('P3 does not change existing imported router state',()=>{
  const before=JSON.stringify(sample);
  routerOverview(sample,A);chooseRouter(sample,A,B,B);
  assert.equal(JSON.stringify(sample),before);
});

const CORE='http://192.168.10.1:2233';
test('P3 R2 filters empty Core 2233 alias while retaining storage and resolving selection',()=>{
  const state=structuredClone(sample);
  state.routers[CORE]={label:'192.168.10.1:2233',apps:[],theme:'dark'};
  const before=JSON.stringify(state);
  assert.equal(isCoreServiceOrigin(CORE),true);
  assert.equal(coreParentRouter(state,CORE),A);
  assert.deepEqual(routerProfileKeys(state),[A,B]);
  assert.deepEqual(routerOverview(state,CORE).map(x=>x.origin),[A,B]);
  assert.equal(chooseRouter(state,CORE,CORE,CORE),A);
  assert.equal(chooseRouter(state,null,CORE,null),A);
  assert.equal(JSON.stringify(state),before,'no migration, delete or mutation');
});

test('P3 R2 keeps non-empty legacy Core profile accessible and correctly labeled',()=>{
  const state=structuredClone(sample);
  state.routers[CORE]={label:'Old port profile',apps:[{id:'a',enabled:true}]};
  assert.equal(routerProfileKeys(state).includes(CORE),true);
  assert.match(routerOverview(state).find(x=>x.origin===CORE).label,/Core.*legacy/);
  assert.equal(chooseRouter(state,CORE,A,null),CORE);
});

test('P3 R2 does not hide distinct devices, ports, or IPv6 and cannot connect service as router',async()=>{
  const only={routers:{[CORE]:{label:'Orphan',apps:[]}}};
  assert.deepEqual(routerProfileKeys(only),[CORE]);
  assert.equal(coreParentRouter(only,CORE),null);
  assert.equal(isCoreServiceOrigin('http://192.168.10.1:8080'),false);
  assert.equal(isCoreServiceOrigin('https://192.168.10.1:2233'),false);
  const v6={routers:{'http://[fd00::1]':{apps:[]},'http://[fd00::1]:2233':{apps:[]}}};
  assert.equal(coreParentRouter(v6,'http://[fd00::1]:2233'),'http://[fd00::1]');
  assert.deepEqual(routerProfileKeys(v6),['http://[fd00::1]']);
  const storage={set:async()=>{throw Error('MUST_NOT_WRITE')}};
  await assert.rejects(saveSelectedRouter(sample,CORE,storage),/ROUTER_NOT_SAVED/);
});
