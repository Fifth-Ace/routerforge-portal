import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const get=p=>readFileSync(new URL(p,root),'utf8');
const userscript=get('userscript/runtime.template.js');
const bridge=get('content/bridge.js');
test('P17 Tampermonkey normal settings use same live native UI as Chromium',()=>{
 assert.match(userscript,/function openSettings\(advanced=false\)/);
 assert.match(userscript,/document\.querySelector\('#kbridge-entry \.kb-nav-settings'\)/);
 assert.match(userscript,/nativeSettings\.click\(\)/);
 assert.match(userscript,/OPEN_OPTIONS'\)\{openSettings\(true\)/);
 assert.match(bridge,/function openNativeSettings\(/);
 assert.match(bridge,/\.addEventListener\('click', ev => \{[\s\S]*?openNativeSettings\(\)/);
});
test('P17 catalogue advanced configuration is collapsed; no visible obsolete 85 percent field',()=>{
 assert.match(userscript,/node\('details','catalog-advanced'\)/);
 assert.match(userscript,/advanced\.append\(foot\)/);
 assert.doesNotMatch(userscript,/field\(fields,language==='en'\?'Native max width/);
 assert.doesNotMatch(userscript,/field\(form,language==='en'\?'Native max width/);
 assert.match(userscript,/old\?\.nativeWidthPct \?\? 85/); // migration only
});
test('P17 version label follows manifest and does not present fake local test',()=>{
 const m=JSON.parse(get('manifest.json'));
 assert.equal(m.version,'0.10.3');
 assert.match(bridge,/make\('span','kb-build-tag','v'\+BRIDGE_VERSION\)/);
 assert.ok(userscript.includes("const VERSION='"+m.version+"'"), 'userscript version must match manifest.json');
 assert.match(userscript,/P17: current native Portal visual scale/);
});
