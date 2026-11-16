import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const popup=source('popup.js'), html=source('popup.html');

test('Module panel belongs to Core card and requires explicit click',()=>{
  for(const id of ['core-modules-btn','core-modules-status','core-modules-list'])assert.ok(html.includes(`id="${id}"`));
  assert.match(popup,/core-modules-btn'\)\.addEventListener\('click'/);
  assert.match(popup,/chrome\.tabs\.query\(\{\}\)/);
  assert.match(popup,/new URL\(item\.url\)\.origin===endpoint\.origin/);
  assert.match(popup,/func:readCoreCatalogInTab,args:\[endpoint\.origin\]/);
  assert.match(popup,/modulesRequestSerial\+\+/);
});

test('Module permission is requested synchronously before awaits',()=>{
  const start=popup.indexOf('async function checkSelectedModules()');
  const end=popup.indexOf('async function diagnoseBridge()',start);
  assert.ok(start>=0 && end>start);
  const method=popup.slice(start,end);
  assert.ok(method.indexOf('chrome.permissions.request(') < method.indexOf('await '));
  assert.doesNotMatch(method, /post\(|put\(|delete\(|\.innerHTML\s*=/);
  assert.match(method,/CORE_LOGIN_REQUIRED/);
});
