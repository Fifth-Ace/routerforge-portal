import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const popup=read('popup.js');
const html=read('popup.html');

test('Core UI is opt-in, per saved router and read-only',()=>{
  for(const id of ['core-card','core-status','core-check-btn','core-open-btn']) assert.ok(html.includes(`id="${id}"`));
  assert.match(popup,/coreProfileShown !== chosen\) resetCoreStatus\(chosen\)/);
  assert.match(popup,/const router=chosen;/);
  assert.match(popup,/probeCore\(router\)/);
  assert.doesNotMatch(popup,/\/api\/(?:snapshot|admin|modules\/)/);
});
test('Permission request stays in click gesture, before any await',()=>{
  const begin=popup.indexOf('async function checkSelectedCore()');
  const end=popup.indexOf('async function diagnoseBridge()',begin);
  assert.ok(begin>=0 && end>begin);
  const func=popup.slice(begin,end);
  const grant=func.indexOf('chrome.permissions.request(');
  const firstAwait=func.indexOf('await ');
  assert.ok(grant>=0 && firstAwait>=0 && grant<firstAwait);
  assert.match(func,/const permission=chrome\.permissions\.request/);
});
