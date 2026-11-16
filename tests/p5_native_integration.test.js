import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const bridge=read('content/bridge.js');
const css=read('content/bridge.css');
const popup=read('popup.js');
const html=read('popup.html');

test('P5: native Keenetic menu has direct find and add actions (not extension popup)',()=>{
  for(const mark of ['function openAppSearch()', 'function openNativeAdd()',
    "make('button','kb-nav-item kb-nav-find'", "make('button','kb-nav-item kb-nav-add'",
    "make('input','kb-drawer-search')", "make('button','kb-drawer-add'"])
    assert.ok(bridge.includes(mark),mark);
  assert.match(bridge,/find\.addEventListener\('click'.*openAppSearch\(\)/);
  assert.match(bridge,/add\.addEventListener\('click'.*openNativeAdd\(\)/);
  assert.match(bridge,/drawerSearchField\.addEventListener\('input'/);
  assert.match(css,/#kbridge-drawer \.kb-drawer-search/);
});
test('P5: manual arbitrary HTTP(S) URL remains possible WITHOUT Core',()=>{
  const p=bridge.slice(bridge.indexOf('function openNativeAdd()'), bridge.indexOf('function openExternal(id)'));
  assert.match(p,/openNativeSettings\(\)/);
  assert.match(p,/settingsEditingId='__new__'/);
  assert.doesNotMatch(p,/\/api\/|fetch\(|chrome\.permissions\.request|coreLink|coreOrigin/);
  const edit=bridge.slice(bridge.indexOf('function nativeEditForm('),bridge.indexOf('function nativeMoveApp('));
  assert.match(edit,/validNativeUrl\(address\.value\)/);
  assert.match(edit,/app\?\.url\|\|''/);
  assert.match(edit,/router\.apps\.push/);
  assert.doesNotMatch(edit,/catalogById|isCoreServiceOrigin|presetId:/);
});
test('P5: search filters current saved apps by name, URL and group without mutating storage',()=>{
  const p=bridge.slice(bridge.indexOf('function renderDrawer()'),bridge.indexOf('function renderNav()'));
  assert.match(p,/p11Ordered\(\)\.filter/);
  assert.match(p,/\[app\.name,app\.url,L\('group_'/);
  assert.match(p,/searchNoResults/);
  assert.doesNotMatch(p,/storage\.local\.set|writeState|fetch\(/);
});
test('P5: no dual chooser in popup, unified overview remains intact',()=>{
  assert.match(popup,/\$\('#choose-box'\)\.hidden = true;/);
  assert.match(html,/<details id="router-overview"/);
  assert.match(html,/id="router-overview-list"/);
  assert.match(bridge,/function renderNav\(\)/);
});
test('P5: no added privileged permissions or Core requirement',()=>{
  const m=JSON.parse(read('manifest.json'));
  assert.deepEqual(m.permissions,['storage','scripting','activeTab']);
  assert.ok(!m.host_permissions);
  assert.deepEqual(m.optional_host_permissions,['http://*/*','https://*/*']);
  assert.equal(m.version,'0.10.10');
  assert.match(read('userscript/runtime.template.js'),/const VERSION='0\.10\.10'/);
});
