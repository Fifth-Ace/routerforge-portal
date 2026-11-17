import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = p => readFileSync(new URL('../'+p, import.meta.url), 'utf8');
const bridge = read('content/bridge.js');

test('P8 global hotkeys are absent, native search button remains',()=>{
  assert.doesNotMatch(bridge,/p7Key|p7Editable|Alt\+Shift\+K|Ctrl\/Cmd\+K/);
  assert.match(bridge,/function openAppSearch\(\)/);
  assert.match(bridge,/find\.addEventListener\('click'.*openAppSearch\(\)/);
  assert.match(bridge,/drawerSearchField\.addEventListener\('keydown'/);
});
test('P8 search keyboard controls are local, and Escape preserves embedded workspace',()=>{
  const start=bridge.indexOf("drawerSearchField.addEventListener('keydown'");
  const end=bridge.indexOf('const p7Hint=',start);
  const search=bridge.slice(start,end);
  assert.match(search,/ArrowDown/);assert.match(search,/ArrowUp/);
  assert.match(search,/p7LaunchSelected/);assert.match(search,/event\.stopPropagation\(\);dismiss\(\)/);
  const global=bridge.slice(bridge.indexOf("listen(document, 'keydown'"),bridge.indexOf("listen(window, 'popstate'"));
  assert.doesNotMatch(global,/openAppSearch|event\.key\.toLowerCase|event\.ctrlKey|event\.altKey/);
  assert.match(global,/if\(drawer&&!drawer\.hidden\)/);
});
test('P8 manual and authenticated Core imports remain independent and embedded by default',()=>{
  assert.match(bridge,/function openNativeAdd\(\)/);
  assert.match(bridge,/function nativeEditForm\(parent,app\)/);
  assert.match(bridge,/function p6RenderCoreImport\(panel\)/);
  assert.match(bridge,/if \(appMode\(app\) === 'external'\)/);
  assert.match(bridge,/p7RecentIds=\[\];p7Selection=0;drawerSearch='';/);
});
test('P8 three distribution channels share exact version with no new permissions',()=>{
  const m=JSON.parse(read('manifest.json'));
  assert.equal(m.version,'1.0.0');
  assert.deepEqual(m.permissions,['storage','scripting','activeTab','alarms']);
  assert.deepEqual(m.optional_host_permissions,['http://*/*','https://*/*']);
  assert.equal(m.host_permissions,undefined);
  assert.ok(read('userscript/runtime.template.js').includes("const VERSION='"+m.version+"'"));
  assert.ok(bridge.includes("BRIDGE_VERSION = '"+m.version+"'"));
});
