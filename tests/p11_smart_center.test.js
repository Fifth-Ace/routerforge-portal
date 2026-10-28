import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cleanApp,cleanState,appGroup,orderedApps,moveApp,newState} from '../shared/model.js';
import {makeCatalogApp} from '../shared/catalog.js';
const origin='http://192.168.1.1';
const app=(id,more={})=>cleanApp({id,name:id,url:'http://192.168.1.1:2222/',...more});
test('P11 migrates old profiles with safe default favorites/groups',()=>{
  const state=newState();state.routers[origin]={label:'NETCRAZE',apps:[app('man_one'),makeCatalogApp(origin,'routerforge'),makeCatalogApp(origin,'awg-manager'),makeCatalogApp(origin,'adguard-home')]};
  const out=cleanState(state).routers[origin].apps;
  assert.deepEqual(out.map(a=>a.group),['other','routerforge','network','security']);
  assert.ok(out.every(a=>a.favorite===false));
});
test('P11 favorites display before group order, disabled items stay hidden',()=>{
  const items=[app('other_1'),app('net_1',{group:'network'}),app('fav_1',{favorite:true}),app('rf_one',{group:'routerforge'}),app('hidden',{favorite:true,enabled:false})];
  const display=orderedApps(items).map(a=>a.id);
  assert.deepEqual(display,['fav_1','rf_one','net_1','other_1']);
  assert.equal(items.length,5,'display sorting must not mutate stored config');
});
test('P11 ↑↓ moves within a group, does not cross favorite/disabled boundary',()=>{
  const items=[app('net_1',{group:'network'}),app('other_1'),app('net_2',{group:'network'}),app('net_3',{group:'network',enabled:false}),app('net_fav',{group:'network',favorite:true})];
  assert.equal(moveApp(items,'net_2',-1),true);
  assert.deepEqual(orderedApps(items).map(x=>x.id),['net_fav','net_2','net_1','other_1']);
  assert.equal(moveApp(items,'net_2',-1),false);
  assert.equal(moveApp(items,'net_fav',1),false);
  assert.equal(moveApp(items,'missing',1),false);
});
test('P11 catalog edits preserve favorite/group/order',()=>{
  const old=makeCatalogApp(origin,'awg-manager',{favorite:true,group:'other',port:2345});
  const next=makeCatalogApp(origin,'awg-manager',{port:2323},true,old);
  assert.equal(next.favorite,true);assert.equal(next.group,'other');assert.equal(next.url,'http://192.168.1.1:2323/');assert.equal(next.id,old.id);
});
test('P11 sanitizes imported group names and favorite flags, no injection',()=>{
  const old=app('safe_id',{group:'<script>',favorite:'yes'});
  assert.equal(appGroup(old),'other');assert.equal(old.favorite,false);
  assert.equal(cleanApp({...old,group:'security',favorite:true}).favorite,true);
});
test('P11 native bridge and Tampermonkey runtime retain same UI group IDs',()=>{
  const b=readFileSync(new URL('../content/bridge.js',import.meta.url),'utf8');
  const u=readFileSync(new URL('../userscript/runtime.template.js',import.meta.url),'utf8');
  for(const group of ['routerforge','network','security','other'])assert.ok(b.includes(group)&&u.includes(group),group);
  assert.match(b,/P14-PRODUCTION/);
  assert.match(u,/const moveApp=/);
  assert.match(u,/__BRIDGE_JS__/);
});
