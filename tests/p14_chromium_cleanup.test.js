import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cleanState, newState, cleanApp} from '../shared/model.js';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const bridge=read('../content/bridge.js');
const css=read('../content/bridge.css');
const manifest=JSON.parse(read('../manifest.json'));

test('P14 chromium build uses MV3 and only optional website access',()=>{
  assert.equal(manifest.manifest_version,3);
  assert.deepEqual(manifest.permissions,['storage','scripting','activeTab']);
  assert.ok(!('host_permissions' in manifest));
  assert.equal(manifest.version,'0.10.2');
  assert.ok(!('version_name' in manifest));
});
test('P14 has no SDK handshake and never replaces Keenetic browser history',()=>{
  assert.doesNotMatch(bridge,/postMessage\s*\(|SDK\s*·|SDK\s*✓|history\.(pushState|replaceState)\s*=/);
  assert.match(bridge,/function netcrazeContentBounds\(/);
  assert.match(bridge,/ResizeObserver/);
  assert.doesNotMatch(bridge,/Math\.floor\(usable \* pct/);
});
test('P14 workspace toolbar uses valid font longhands instead of invalid inherit shorthand',()=>{
  assert.doesNotMatch(css,/font:\s*\d+\s+\d+px\s*\/\s*[\d.]+\s+inherit/);
  assert.match(css,/\.kb-build-tag\{font-family:inherit!important;font-size:10px!important;font-weight:650!important/);
  assert.match(css,/\.kb-tab button\{[^\n]*font-size:11px!important;font-weight:500!important/);
});
test('P14 legacy manual trims and width settings survive an offline config upgrade',()=>{
  const s=newState();s.routers['http://192.168.1.1']={label:'NETCRAZE',theme:'light',apps:[
    {id:'awg_live',name:'AWG',url:'http://192.168.1.1:2222/',mode:'auto',favorite:true,group:'network',layoutWidth:'native',nativeWidthPct:85,nativeLeftTrimPx:0,nativeRightTrimPx:22,manualBounds:false},
    {id:'core_live',name:'Core',url:'http://192.168.1.1:2233/',mode:'external',enabled:false,group:'routerforge'}
  ]};
  const cleaned=cleanState(s);
  const apps=cleaned.routers['http://192.168.1.1'].apps;
  assert.equal(apps.length,2);
  assert.equal(apps[0].nativeRightTrimPx,22);
  assert.equal(apps[0].manualBounds,false);
  assert.equal(apps[0].nativeWidthPct,85);
  assert.equal(apps[0].favorite,true);
  assert.equal(apps[1].enabled,false);
  assert.equal(cleaned.routers['http://192.168.1.1'].theme,'light');
  assert.deepEqual(cleanState(cleaned),cleaned);
});
