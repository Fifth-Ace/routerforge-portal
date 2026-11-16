import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const bridge=read('content/bridge.js'),css=read('content/bridge.css');

test('P7 Ctrl/Cmd+K opens the native Keenetic launcher only when authenticated and not editing',()=>{
  assert.match(bridge,/event\.ctrlKey\|\|event\.metaKey/);
  assert.match(bridge,/event\.key\.toLowerCase\(\)==='k'/);
  assert.match(bridge,/event\.altKey&&event\.shiftKey&&!event\.ctrlKey&&!event\.metaKey/);
  assert.match(bridge,/entry&&isAuthenticatedShell\(\)&&!p7Editable\(event\.target\)/);
  assert.match(bridge,/function openAppSearch\(\)/);
  assert.match(bridge,/if\s*\(!drawer \|\| !profile \|\| !isAuthenticatedShell\(\)\) return;/);
  assert.match(bridge,/function p7Editable\(target\)/);
  assert.match(bridge,/\[contenteditable="true"\]/);
  assert.doesNotMatch(bridge,/history\.(pushState|replaceState)\s*=/);
});
test('P7 input supports arrows, Enter, Escape without closing the active app workspace',()=>{
  assert.match(bridge,/drawerSearchField\.addEventListener\('keydown'/);
  assert.match(bridge,/p7MoveSelection\(event\.key==='ArrowDown'\?1:-1\)/);
  assert.match(bridge,/p7LaunchSelected\(\)/);
  assert.match(bridge,/event\.stopPropagation\(\);dismiss\(\)/);
  assert.match(bridge,/if\(drawer&&!drawer\.hidden\)\{event\.preventDefault\(\);dismiss\(\);return;\}/);
  assert.match(css,/\.kbapp\[data-kb-selected="true"\]/);
});
test('P7 recent applications are session-only with bounded unique LRU order',()=>{
  const body=bridge.match(/  function p7RememberApp\(id\) \{[\s\S]*?\n  \}/)?.[0];
  assert.ok(body,'P7 recent function missing');
  const context=vm.createContext({});
  vm.runInContext('let p7RecentIds=[];\n'+body+'\np7RememberApp("a");p7RememberApp("b");p7RememberApp("a");p7RememberApp("c");p7RememberApp("d");this.result=p7RecentIds;',context);
  assert.deepEqual(Array.from(context.result),['d','c','a']);
  assert.match(bridge,/p7RecentIds=\[\];p7Selection=0;drawerSearch='';/);
  const implementation=bridge.slice(bridge.indexOf('function p7RememberApp('),bridge.indexOf('function openExternal(id)'));
  assert.doesNotMatch(implementation,/chrome\.storage|fetch\(|localStorage/);
});
test('P7 keeps all manual and Core apps, recent list does not duplicate apps',()=>{
  const fragment=bridge.slice(bridge.indexOf('function renderDrawer()'),bridge.indexOf('function renderNav()'));
  assert.match(fragment,/p11Ordered\(\)\.filter/);
  assert.match(fragment,/const recentSet=new Set\(recent\.map\(app=>app\.id\)\)/);
  assert.match(fragment,/if\(recentSet\.has\(app\.id\)\)continue;/);
  assert.match(fragment,/p7HighlightSelection\(\)/);
  assert.match(bridge,/function nativeEditForm\(parent,app\)/);
  assert.match(bridge,/function p6RenderCoreImport\(panel\)/);
  assert.match(bridge,/if \(appMode\(app\) === 'external'\)/);
});
test('P7 Chromium, Firefox and Userscript share the unchanged bridge and permissions',()=>{
  const m=JSON.parse(read('manifest.json'));
  assert.equal(m.version,'0.10.12');
  assert.deepEqual(m.permissions,['storage','scripting','activeTab']);
  assert.ok(!m.host_permissions);
  assert.ok(read('userscript/runtime.template.js').includes('__BRIDGE_JS__'));
  assert.match(bridge,/P14-PRODUCTION/);
  assert.match(css,/#kbridge-drawer \.kb-p7-hint/);
  assert.match(bridge,/quickHint:'↑ ↓ выбор/);
  assert.match(bridge,/quickHint:'↑ ↓ select/);
});
