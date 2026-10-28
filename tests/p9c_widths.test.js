import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cleanApp, cleanState, newState} from '../shared/model.js';
import {makeCatalogApp} from '../shared/catalog.js';
const bridge=readFileSync(new URL('../content/bridge.js',import.meta.url),'utf8');
const user=readFileSync(new URL('../userscript/runtime.template.js',import.meta.url),'utf8');
test('P9C width is opt-in and defaults safely for legacy profiles',()=>{
  const x=cleanApp({name:'AWG',url:'http://192.168.1.1:2222',mode:'auto'});
  assert.equal(x.layoutWidth,'native');
  assert.equal(cleanApp({...x,layoutWidth:'wide'}).layoutWidth,'wide');
  assert.equal(cleanApp({...x,layoutWidth:'bad'}).layoutWidth,'native');
  const state=newState();state.routers['http://192.168.1.1']={label:'Keenetic',apps:[x]};
  assert.equal(cleanState(state).routers['http://192.168.1.1'].apps[0].layoutWidth,'native');
});
test('P9C catalog preserves width when changing ports and modes',()=>{
 const old=makeCatalogApp('http://192.168.1.1','awg-manager',{layoutWidth:'wide'});
 const next=makeCatalogApp('http://192.168.1.1','awg-manager',{port:2223},true,old);
 assert.equal(old.layoutWidth,'wide');assert.equal(next.layoutWidth,'wide');
});
test('P9C width selection uses common bridge, no router service and no history patch',()=>{
 assert.match(bridge,/function nativeContentColumn\(/);
 assert.match(bridge,/function toggleWorkspaceWidth\(/);
 assert.match(bridge,/workspace\.dataset\.kbWidth = wide \? 'wide' : 'native'/);
 assert.match(bridge,/updated\.layoutWidth = nextWidth/);
 assert.match(user,/__BRIDGE_JS__/);
 assert.doesNotMatch(bridge,/history\.(pushState|replaceState)\s*=/);
});

test('P9C FIX1: width cap migrates and validates per app',()=>{
  const legacy=cleanApp({name:'Core',url:'http://192.168.1.1:2233',mode:'embedded'});
  assert.equal(legacy.nativeWidthPct,85);
  assert.equal(cleanApp({...legacy,nativeWidthPct:90}).nativeWidthPct,90);
  assert.equal(cleanApp({...legacy,nativeWidthPct:101}).nativeWidthPct,85);
  assert.equal(cleanApp({...legacy,nativeWidthPct:65}).nativeWidthPct,65);
  const next=makeCatalogApp('http://192.168.1.1','awg-manager',{port:2223},true,makeCatalogApp('http://192.168.1.1','awg-manager',{nativeWidthPct:92}));
  assert.equal(next.nativeWidthPct,92);
  assert.match(bridge,/LOCAL_FIX_ID = 'P14-PRODUCTION'/);
  assert.doesNotMatch(bridge,/const capInset/);
  assert.match(bridge,/manualBounds === true/);
});

test('P9C FIX3 persists validated left and right trims per application',()=>{
 const x=cleanApp({name:'AWG',url:'http://192.168.1.1:2222'});
 assert.equal(x.nativeLeftTrimPx,0);assert.equal(x.nativeRightTrimPx,0);
 assert.equal(cleanApp({...x,nativeLeftTrimPx:32,nativeRightTrimPx:48}).nativeRightTrimPx,48);
 assert.equal(cleanApp({...x,nativeLeftTrimPx:999,nativeRightTrimPx:-8}).nativeLeftTrimPx,0);
 const prev=makeCatalogApp('http://192.168.1.1','awg-manager',{nativeLeftTrimPx:16,nativeRightTrimPx:24});
 const next=makeCatalogApp('http://192.168.1.1','awg-manager',{port:2223},true,prev);
 assert.equal(next.nativeLeftTrimPx,16);assert.equal(next.nativeRightTrimPx,24);
 assert.match(bridge,/function adjustFit\(/);
 assert.match(bridge,/workspace\.dataset\.kbNativeRightTrim/);
});

test('P9C FIX4: precise 22px offsets are legal and calibration uses 1px input',()=>{
 const app=cleanApp({name:'AWG',url:'http://192.168.1.1:2222',nativeRightTrimPx:22});
 assert.equal(app.nativeRightTrimPx,22);
 assert.match(bridge,/function setFitValue\(/);
 assert.match(bridge,/amount\.step='1'/);
 assert.match(bridge,/adjustFit\(field,2\)/);
 assert.match(bridge,/fitSaveQueue/);
});

test('P13: obsolete percent and manual inset inputs absent from options, calibration retained in overlay',()=>{
 const html=readFileSync(new URL('../options.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../options.js',import.meta.url),'utf8');
 assert.doesNotMatch(html,/id="native-(?:width-pct|left-trim|right-trim)"/);
 assert.match(html,/id="save" class="primary"/);
 assert.doesNotMatch(js,/catalog-width-pct|catalog-left-trim|catalog-right-trim/);
 assert.match(bridge,/function setFitValue\(/);
});
