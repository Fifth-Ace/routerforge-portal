import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('R5.8 old standalone server center redirects to canonical settings preserving view and server',()=>{
 const src=read('portal-center.js');
 assert.match(src,/if\(!RF57_EMBEDDED\)/);
 assert.match(src,/location\.replace\(next\.href\)/);
 assert.match(src,/next\.searchParams\.set\('tab','servers'\)/);
 assert.match(src,/next\.searchParams\.set\('serverView',params\.get\('view'\)\)/);
 assert.match(src,/next\.searchParams\.set\('server',savedServer\)/);
});
test('R5.8 all three server workspace functions remain available inside one settings tab',()=>{
 const html=read('portal-center.html'),src=read('portal-center.js'),nav=read('shared/portal57_settings_nav.js');
 for(const id of ['nav-servers','nav-apps','nav-settings','monitor-period','server-cards','add-server','add-app','save-token','admin-inbounds','admin-restart','unlock-vault']){
  const pattern=id==='server-cards'?/id="server-cards"/:new RegExp('id="'+id+'"');
  assert.match(html,pattern);
 }
 assert.match(src,/function setView\(view\)/);
 assert.doesNotMatch(src,/RF57_EMBEDDED&&selectedView==='apps'/);
 assert.match(nav,/portal-center\.html/);
 assert.match(nav,/frameHeight/);
 assert.match(nav,/ResizeObserver/);
 assert.match(read('popup.js'),/options\.html\?tab=servers/);
});
test('R5.8 unified protected backup is the only prominent export/import surface',()=>{
 const options=read('options.html'),ui=read('ui.css'),center=read('portal-center.js');
 for(const id of ['rf57-export-all','rf57-import-all','rf57-tab-apps','rf57-tab-servers'])assert.match(options,new RegExp('id="'+id+'"'));
 assert.match(ui,/\.rf57-hidden-old-backup\{display:none!important\}/);
 assert.match(center,/collectWorkspace\(saved,registry\)/);
 assert.match(center,/secureBackup\(registry,raw,pass,\{period:pollPeriod,workspace\}\)/);
});
test('R5.8 same visual family and no second top bar inside embedded center',()=>{
 const css=read('portal-center.css'),options=read('ui.css');
 assert.match(css,/\.rf57-embedded \.top\{display:none!important\}/);
 assert.match(css,/--panel:#14161a/);
 assert.match(css,/grid-template-columns:minmax\(250px,305px\)/);
 assert.match(options,/\.rf57-server-section/);
});
test('R5.8 retains secure Keenetic view without token injection',()=>{
 const bridge=read('content/bridge.js');
 assert.match(bridge,/function rf57NativeServers\(panel\)/);
 assert.match(bridge,/if\(rf57SettingsTab==='servers'\)/);
});

test('R5.8 retains original Keenetic popup app/router functionality',()=>{
 const js=read('popup.js');
 assert.match(js,/function renderRouterOverview\(state\)/);
 assert.match(js,/async function diagnoseBridge\(\)/);
 assert.match(js,/options\.html\?tab=servers/);
});
