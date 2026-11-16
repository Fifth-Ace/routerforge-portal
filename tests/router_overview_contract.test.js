import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const popup=read('popup.js'), options=read('options.js'), html=read('popup.html');

test('P3 popup uses same selected device for overview, core and applications',()=>{
  for(const id of ['router-overview','router-overview-list','router-overview-count'])assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(popup,/renderRouterOverview\(state\)/);
  assert.match(popup,/chooseRouter\(state,\s*chosen,\s*origin,\s*savedRouter\)/);
  assert.match(popup,/saveSelectedRouter\(state,\s*target\)/);
  assert.match(popup,/resetCoreStatus\(chosen\)/);
});

test('P3 overview never starts background probes and options uses same persistent selection',()=>{
  const shared=read('shared/router_overview.js');
  assert.doesNotMatch(shared,/\bfetch\s*\(|setInterval|setTimeout|scripting\.executeScript|\.permissions\.request/);
  assert.match(options,/renderDeviceOverview\(\)/);
  assert.match(options,/saveSelectedRouter\(state,\s*target\)/);
  assert.match(options,/readSelectedRouter\(\)/);
});

test('R2: popup and settings use physical router keys, never empty Core port service',()=>{
  assert.match(popup,/const keys = routerProfileKeys\(state\);/);
  assert.match(popup,/isCoreServiceOrigin\(origin\) \|\| Boolean\(state\.routers\[origin\]\)/);
  assert.match(options,/for \(const origin of routerProfileKeys\(state\)\)/);
  assert.match(options,/RouterForge Core \(legacy\)/);
  assert.match(popup,/RouterForge Core \(legacy\)/);
});
