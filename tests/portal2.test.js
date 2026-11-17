import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {newRegistry,cleanRegistry,cleanServer,cleanApp,urlOf,appUrl,removeServer,legacyReadOnly} from '../shared/portal2_registry.js';
import {PortalVault,VAULT_KEY} from '../shared/portal2_vault.js';
import {statusUrl,panelBasePath,parseStatus,read3xui} from '../shared/portal2_3xui.js';
import {diagnose} from '../shared/portal2_doctor.js';
import {ADAPTERS,TEMPLATES} from '../shared/portal2_adapters.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const storage=()=>{const entries={};return {entries,async get(k){return {[k]:structuredClone(entries[k])}},async set(items){Object.assign(entries,structuredClone(items))}}};
const make=(id,base='https://one.example/secret/')=>({id,name:'3x-ui '+id,serverId:'server_1',urlLocal:'',urlRemote:base,addressMode:'remote',adapter:'3xui',basePath:'/secret',authMethod:'vault'});
function registry(n=9){const servers=Array.from({length:n},(_,i)=>({id:'server_'+(i+1),name:'VPS '+i,tags:['production'],locationLabel:'Region '+i}));return cleanRegistry({version:1,servers,apps:servers.map((s,i)=>({...make('app_'+i,'https://s'+i+'.example/secret/'),serverId:s.id}))});}
test('P10 nine distinct servers, 1:N apps, scoped remove',()=>{
 const r=registry();assert.equal(r.servers.length,9);r.apps.push({...make('app_extra'),name:'Portainer',adapter:'none'});
 const clean=cleanRegistry(r);assert.equal(clean.apps.filter(x=>x.serverId==='server_1').length,2);
 const removed=removeServer(clean,'server_1');assert.equal(removed.servers.length,8);assert.equal(removed.apps.length,8);
});
test('P10 explicit LAN/WAN including IPv6, ports, nested paths; no surprise fallback',()=>{
 assert.equal(urlOf('http://[fd00::1]:8080/service/'),'http://[fd00::1]:8080/service/');
 const a=cleanApp({name:'LAN',urlLocal:'http://192.168.1.5:8080/panel/',urlRemote:'https://wan.example/panel/',addressMode:'local'},[]);
 assert.match(appUrl(a),/^http:/);assert.equal(appUrl({...a,addressMode:'remote'}),'https://wan.example/panel/');
 assert.throws(()=>urlOf('https://user:pass@evil.example/'));
 assert.throws(()=>urlOf('javascript:alert(1)'));
});
test('P10 legacy profiles remain read-only without passwords',()=>{
 const state={version:1,routers:{'http://192.168.1.1':{apps:[{name:'Custom',url:'http://192.168.1.1:9090/',favorite:true}]}}};
 assert.equal(legacyReadOnly(state).length,1);
 assert.deepEqual(Object.keys(legacyReadOnly(state)[0]).sort(),['name','router','source','url']);
});
test('P11 Vault KDF/AES-GCM stores ciphertext, locks, binds exact origin/path and exports encrypted',async()=>{
 const store=storage(),v=new PortalVault(store),password='correct horse battery staple';
 await v.create(password);await v.set('app_1234','https://server.example/login/','very-private-test-value');
 assert.ok(!JSON.stringify(store.entries).includes('very-private-test-value'));
 assert.equal(await v.get('app_1234','https://server.example/login/'),'very-private-test-value');
 await assert.rejects(v.get('app_1234','https://evil.example/login/'),/ORIGIN_OR_PATH_MISMATCH/);
 await assert.rejects(v.get('app_1234','https://server.example/login-other'),/ORIGIN_OR_PATH_MISMATCH/);
 v.lock();await assert.rejects(v.get('app_1234','https://server.example/login/'),/VAULT_LOCKED/);
 await assert.rejects(v.unlock('totally-wrong-password'),/BAD_PASSWORD/);
 await v.unlock(password);assert.equal(await v.get('app_1234','https://server.example/login/'),'very-private-test-value');
 const backup=await v.exportEncrypted();assert.ok(!backup.includes('very-private-test-value'));
 await assert.rejects(v.set('app_1234','http://lan.example/','not-allowed'),/VAULT_REQUIRES_HTTPS/);
 await v.dropEncrypted(['app_1234']);assert.ok(!store.entries[VAULT_KEY].entries.app_1234);
});
test('P11 password change preserves encrypted entries; encrypted import requires unlock',async()=>{
 const store=storage(),v=new PortalVault(store);await v.create('a-safe-master-passphrase');
 await v.set('app_1234','https://vps.example/base/','secret');await v.changePassword('a-safe-master-passphrase','another-master-password');
 v.lock();await assert.rejects(v.unlock('a-safe-master-passphrase'));
 await v.unlock('another-master-password');assert.equal(await v.get('app_1234','https://vps.example/base/'),'secret');
 const data=await v.exportEncrypted();const imported=new PortalVault(storage());await imported.importEncrypted(data);
 assert.equal(imported.unlocked,false);await imported.unlock('another-master-password');assert.equal(await imported.get('app_1234','https://vps.example/base/'),'secret');
});
test('P12 3x-ui fixed GET status and checked units',async()=>{
 const a=make('app_123');assert.equal(statusUrl(a,a.urlRemote),'https://one.example/secret/panel/api/server/status');
 const response={success:true,obj:{cpu:12.5,mem:{current:2,total:8},disk:{current:50,total:100},netIO:{up:100,down:200},xray:{state:'running',version:'v26'}}};
 const calls=[];const result=await read3xui(a,a.urlRemote,{token:'mock-token',fetcher:async(url,opts)=>{calls.push({url,opts});return {status:200,ok:true,text:async()=>JSON.stringify(response)}}});
 assert.equal(result.state,'OK');assert.equal(result.cpu,12.5);assert.equal(result.xray.state,'running');
 assert.equal(calls[0].opts.method,'GET');assert.equal(calls[0].opts.redirect,'error');
 assert.equal(calls[0].url,'https://one.example/secret/panel/api/server/status');
 assert.ok(!calls[0].url.includes('/login'));
});
test('P12 3x-ui distinguishes auth, mismatch, invalid schema, no POST',async()=>{
 const a=make('app_123');for(const [code,expected] of [[401,'API_AUTH_REQUIRED'],[403,'API_FORBIDDEN'],[404,'UNSUPPORTED'],[503,'UNKNOWN']]){
 const r=await read3xui(a,a.urlRemote,{fetcher:async()=>({status:code,ok:false})});assert.equal(r.state,expected);
 }
 assert.throws(()=>parseStatus({success:true,obj:null}),/UNSUPPORTED/);
 const r=await read3xui(a,'http://one.example/secret/',{token:'token'});assert.equal(r.state,'BLOCKED');
});
test('P13 WebUI Doctor never sends credentials and never claims iframe compatibility',async()=>{
 let calls=[];const r=await diagnose('https://srv.example/panel/',{fetcher:async(u,o)=>{calls.push(o);return {ok:true,status:200}}});
 assert.equal(r.state,'REACHABLE');assert.equal(r.embedding,'UNKNOWN');assert.equal(calls[0].method,'HEAD');assert.equal(calls[0].credentials,'omit');
 assert.equal((await diagnose('https://srv.example/',{fetcher:async()=>({status:405,ok:false})})).state,'UNKNOWN');
});
test('P13 source and packaging are extension-owned; userscript cannot access Vault UI',()=>{
 const js=read('portal-center.js'),html=read('portal-center.html'),pack=read('tools/package_release.py'),bridge=read('content/bridge.js');
 assert.match(js,/function fillKnownForm/);assert.match(js,/origin!==expectedOrigin/);
 assert.match(js,/allFrames:false/);assert.match(read('shared/portal2_doctor.js'),/credentials:'omit'/u);
 assert.match(html,/portal-center\.js/);assert.match(pack,/portal-center/);
 assert.match(bridge,/OPEN_PORTAL_CENTER/);
 assert.equal(ADAPTERS[0].id,'3xui');assert.ok(TEMPLATES.length>=4);
 const m=JSON.parse(read('manifest.json'));assert.equal(m.version,JSON.parse(read('package.json')).version);
 assert.deepEqual(m.permissions,['storage','scripting','activeTab','alarms']);assert.ok(!m.host_permissions);
});

test('P10 R2 existing standalone entries can be linked without losing app id or credentials',()=>{
 const s=cleanServer({name:'VPS 1'});
 const standalone=cleanApp({name:'3x-ui MAIL',urlRemote:'https://vps.example:8443/secret',adapter:'3xui',addressMode:'remote'},[]);
 const linked=cleanRegistry({version:1,servers:[s],apps:[{...standalone,serverId:s.id}]});
 assert.equal(linked.apps[0].id,standalone.id);
 assert.equal(linked.apps[0].urlRemote,standalone.urlRemote);
 const ui=read('portal-center.js');
 assert.match(ui,/attach\?\.value/);assert.match(ui,/STANDALONE_APP_NOT_FOUND/);
 assert.match(ui,/firstUrl\?\.value\.trim\(\)/);
 assert.match(ui,/SERVER_NAME_REQUIRED|cleanServer/);
});
test('P12 R2 3x-ui base path derives known login or panel routes',()=>{
 const a={basePath:''};
 assert.equal(panelBasePath(a,'https://s.example:8443/secret'),'/secret/');
 assert.equal(panelBasePath(a,'https://s.example:8443/secret/login'),'/secret/');
 assert.equal(panelBasePath(a,'https://s.example:8443/secret/panel/'),'/secret/');
 assert.equal(statusUrl(a,'https://s.example:8443/secret/login'),'https://s.example:8443/secret/panel/api/server/status');
 assert.equal(statusUrl({basePath:'/custom'},'https://s.example:8443/other'),'https://s.example:8443/other/panel/api/server/status');
 assert.equal(panelBasePath({basePath:'//evil'},'https://s.example/secret'),'/secret/'); // obsolete override ignored
});
test('P12 R2 session status is GET only inside signed-in panel tab, not a cross-origin cookie probe',()=>{
 const js=read('portal-center.js');
 const body=js.slice(js.indexOf('async function read3xuiFromSignedInTab('),js.indexOf('async function monitor('));
 assert.match(body,/chrome\.tabs\.query\(\{\}\)/);
 assert.match(body,/chrome\.scripting\.executeScript/);
 assert.match(body,/location\.origin!==expectedOrigin/);
 assert.match(body,/credentials:'same-origin'/);
 assert.match(body,/method:'GET'/);
 assert.match(body,/redirect:'error'/);
 assert.doesNotMatch(body,/method:'POST'|\/login.*fetch/);
 assert.match(js,/result\.state==='SESSION_TAB_REQUIRED'/);
});
test('P11 R2 SPA login fill uses native input setter; unlocked Vault is not panel authentication',()=>{
 const js=read('portal-center.js');
 const body=js.slice(js.indexOf('function fillKnownForm('),js.indexOf('async function openAndFill('));
 assert.match(body,/HTMLInputElement\.prototype/);
 assert.match(body,/const scope=form\|\|document/);
 assert.match(body,/CROSS_ORIGIN_FORM/);
 assert.match(body,/BINDING_MISMATCH/);
 assert.match(body,/one-time-code/);
 assert.match(js,/read3xuiFromSignedInTab\(a,url\)/);
});
test('P13 R2 avoids enormous Vault panel and shows errors beside applications',()=>{
 const html=read('portal-center.html'),css=read('portal-center.css'),js=read('portal-center.js');
 assert.equal((html.match(/id="status"/g)||[]).length,1);
 assert.equal((html.match(/id="vault-state"/g)||[]).length,1);
 assert.match(html,/<section class="tools" id="tools-panel">/);
 assert.match(html,/id="settings-view"/);
 assert.match(html,/id="editor-error"/);
 assert.match(js,/function reportApp\(/);
 assert.match(css,/\.app-note\[data-error="true"\]/);
 assert.match(css,/grid-template-columns:minmax\(210px,256px\)/);
});

test('R3 prevents 3x-ui iframe attempts, no forced CSP bypass, and keeps external app flow',()=>{
 const s=read('portal-center.js');
 assert.match(s,/if\(xui3\(a\)\|\|a\.mode==='external'\)/);
 assert.match(s,/mode\.disabled=is3/);
 assert.match(s,/if\(xui3\(a\)\)return monitor\(a\)/);
 assert.doesNotMatch(s,/removeAttribute\('X-Frame-Options'\)/);
});
test('R5.3 links previous Standalone panels without asking for their URL again',()=>{
 const s=read('portal-center.js');
 assert.doesNotMatch(s,/\+ Создать сервер/);
 assert.match(s,/attachStandalonePanels\(registry\)/);
 assert.match(s,/attachStandalonePanels\(\{\.\.\.registry,apps:nextApps\}\)/);
 assert.match(s,/function openServerEditor\(s=null,attachApp=null\)/);
});
test('R3 status is formatted without full CPU precision or raw byte strings',()=>{
 const s=read('portal-center.js');
 assert.match(s,/n\.toFixed\(1\)/);
 assert.match(s,/const units=\['B','KiB','MiB','GiB','TiB'\]/);
 assert.match(s,/format3xuiStatus\(result,locale\)/);
});
test('R3 normalizes full 3x-ui panel URLs without duplicate /panel',()=>{
 const app={basePath:'/secret/panel/'};
 assert.equal(statusUrl(app,'https://example.com:1234/secret/panel/'),'https://example.com:1234/secret/panel/api/server/status');
});

test('R4 full URL is the only source for 3x-ui API, including old conflicting basePath',()=>{
 const a={basePath:'/wrong/secret/'};
 for(const url of ['https://host.example:2053/real-secret/','https://host.example:2053/real-secret/login','https://host.example:2053/real-secret/panel/']){
  assert.equal(statusUrl(a,url),'https://host.example:2053/real-secret/panel/api/server/status');
 }
 assert.equal(statusUrl(a,'https://host.example:2053/'),'https://host.example:2053/panel/api/server/status');
});
test('R4 first-class servers tab is in popup, Keenetic nav and App Center; no automatic status call',()=>{
 const ui=read('portal-center.js'),html=read('portal-center.html'),popup=read('popup.html'),bridge=read('content/bridge.js');
 for(const id of ['nav-servers','nav-apps','nav-settings','server-cards','server-overview-count','add-server'])assert.ok(html.includes('id="'+id+'"'));
 assert.match(ui,/function renderServerDashboard/);
 assert.match(ui,/appMetrics\.set\(a\.id,result\)/);
 assert.match(ui,/selectedView='servers'/);
 assert.match(ui,/openAppEditor\(null,server\.id\)/);
 assert.match(popup,/id="portal-mode-servers"/);
 assert.match(bridge,/OPEN_PORTAL_CENTER/);
 const render=ui.slice(ui.indexOf('function renderServerDashboard('),ui.indexOf('function renderApps('));
 assert.doesNotMatch(render,/read3xui\(|diagnose\(|fetch\(|ensureOrigin\(/);
 assert.doesNotMatch(html,/3x-ui base path/);
});
