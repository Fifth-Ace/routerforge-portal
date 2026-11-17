import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('portal-center.html'),js=read('portal-center.js'),css=read('portal-center.css'),popup=read('popup.js'),popupHTML=read('popup.html');
test('R5.2 one Server add, one three-tab workspace and no footer Vault strip',()=>{
 assert.equal((html.match(/id="add-server"/g)||[]).length,1);
 assert.equal((html.match(/id="add-server-main"/g)||[]).length,0);
 for(const id of ['nav-servers','nav-apps','nav-settings','settings-view','tools-panel'])assert.ok(html.includes('id="'+id+'"'));
 assert.match(html,/id="nav-apps"[^>]+>Панели/);
 assert.match(html,/<section id="settings-view"[^>]*hidden>/);
 assert.doesNotMatch(html,/<details class="tools"/);
 assert.match(js,/function showVaultSettings\(/);
 assert.match(js,/\$\('master'\)/);
});
test('R5.2 compact cards do not show secret path, do not probe while rendering',()=>{
 const part=js.slice(js.indexOf('function renderServerDashboard(){'),js.indexOf('const metricPercentage='));
 assert.match(part,/compact-metrics/);assert.match(part,/compact-open/);assert.match(part,/HTTP RTT/);
 assert.match(part,/monitorSnapshot\(a\)/);assert.match(part,/openApp\(a\)/);
 assert.doesNotMatch(part,/fetch\(|read3xui\(|ensureOrigin\(|appUrl\(a\)/);
 assert.match(css,/\.compact-metrics/);
});
test('R5.2 popup last-known metrics, exact full URL and unique management link',()=>{
 assert.match(popup,/chrome\.storage\.local\.get\(\['rfPortal2Registry','rfPortalR5Snapshots','rfPortalR5MonitorConfig'\]\)/);
 assert.match(popup,/url=miniOpenUrl\(app\)/);assert.match(popup,/chrome\.tabs\.create\(\{url\}\)/);
 assert.match(popup,/&server='\+encodeURIComponent\(serverId\)/);
 assert.match(popup,/portal-mini-metrics/);assert.match(popup,/portal-mini-rtt/);
 assert.doesNotMatch(popup,/fetch\(|read3xui\(|chrome\.alarms\./);
 assert.equal((popupHTML.match(/id="portal-popup-open"/g)||[]).length,0);
 assert.equal((popupHTML.match(/id="portal2-center"/g)||[]).length,1);
});
test('R5.2 monitor, Vault and security operations continue to be opt-in',()=>{
 assert.match(js,/PORTAL_R5_MONITOR_ENABLE/);assert.match(js,/PORTAL_R5_MONITOR_DISABLE/);
 assert.match(js,/PORTAL_R5_MONITOR_CLEAR_ALL/);assert.match(js,/adminExecute\('restart-xray'\)/);
 assert.match(js,/prompt\('Для перезапуска Xray/);
 assert.match(js,/showVaultSettings\(\);throw Error/);
});

import {attachStandalonePanels,cleanRegistry} from '../shared/portal2_registry.js';
const panel=(id,url='https://vps.example:11361/secret-abc/panel/')=>({id,name:'3x-ui',urlRemote:url,addressMode:'remote',adapter:'3xui'});
test('R5.3 existing 3x-ui remains byte-for-byte bound to Vault key, full URL, ID and secret path',()=>{
 const before=cleanRegistry({version:1,servers:[],apps:[panel('existing_app')]});
 const result=attachStandalonePanels(before);
 assert.equal(result.created,1);assert.equal(result.registry.apps[0].id,'existing_app');
 assert.equal(result.registry.apps[0].urlRemote,before.apps[0].urlRemote);
 assert.equal(result.registry.apps[0].serverId,result.registry.servers[0].id);
 assert.equal(result.registry.servers[0].name,'vps.example');
 assert.equal(attachStandalonePanels(result.registry).changed,false);
 assert.deepEqual(attachStandalonePanels(result.registry).registry,result.registry);
});
test('R5.3 existing only empty server gets linked instead of duplicated',()=>{
 const before=cleanRegistry({version:1,servers:[{id:'existing_server',name:'Qwer'}],apps:[panel('panel_a')]});
 const next=attachStandalonePanels(before);
 assert.equal(next.registry.servers.length,1);
 assert.equal(next.registry.apps[0].serverId,'existing_server');
 assert.equal(next.created,0);
});
test('R5.3 two distinct panels on one hostname share server; independent host gets another',()=>{
 const before=cleanRegistry({version:1,servers:[],apps:[panel('app_a'),panel('app_b','https://vps.example:443/other/'),panel('app_c','https://other.example/private/')]});
 const next=attachStandalonePanels(before).registry;
 assert.equal(next.servers.length,2);
 assert.equal(next.apps[0].serverId,next.apps[1].serverId);
 assert.notEqual(next.apps[0].serverId,next.apps[2].serverId);
});
test('R5.3 ambiguous existing server matching does not silently reassign',()=>{
 const before=cleanRegistry({version:1,servers:[{id:'server_a',name:'One'},{id:'server_b',name:'Two'}],apps:[
 {...panel('app_a'),serverId:'server_a'}, {...panel('app_b'),serverId:'server_b'},panel('app_c')]});
 const next=attachStandalonePanels(before).registry;
 assert.equal(next.servers.length,3);
 assert.notEqual(next.apps[2].serverId,'server_a');
 assert.notEqual(next.apps[2].serverId,'server_b');
});
test('R5.3 app editor no Standalone choice, creates a server and keeps existing credentials',()=>{
 assert.doesNotMatch(js,/\+ Создать сервер/);
 assert.match(js,/Создать автоматически по адресу/);
 assert.match(js,/const bound=attachStandalonePanels/);
 assert.match(js,/registry=linked.registry;if\(linked.changed\)registry=await saveRegistry\(registry\)/);
 assert.match(js,/const nextApps=a\?registry.apps.map/);
});

import {prepareProfileImport} from '../shared/portal2_registry.js';
test('R5.3.2 exported/redacted 3x-ui preserves known local secret URL and Vault app ID',()=>{
 const prior=cleanRegistry({version:1,servers:[],apps:[{id:'app_xyz',name:'3x-ui',urlRemote:'https://mail.example:11361/secret-abc/',adapter:'3xui'}]});
 const imported={version:1,servers:[],apps:[{id:'app_xyz',name:'3x-ui',urlRemote:'https://mail.example:11361/',adapter:'3xui'}]};
 const next=prepareProfileImport(imported,prior);
 assert.equal(next.servers.length,1);assert.equal(next.apps[0].id,'app_xyz');
 assert.equal(next.apps[0].urlRemote,'https://mail.example:11361/secret-abc/');
 assert.equal(prior.apps[0].urlRemote,'https://mail.example:11361/secret-abc/');
});
test('R5.3.2 import rejects malformed files without modifying prior state and refuses cross-origin secret reuse',()=>{
 const prior=cleanRegistry({version:1,servers:[{id:'srv_main',name:'Qwer'}],apps:[{id:'app_xyz',name:'3x-ui',serverId:'srv_main',urlRemote:'https://mail.example:11361/secret/',adapter:'3xui'}]});
 assert.throws(()=>prepareProfileImport({routers:{}},prior),/INVALID_REGISTRY/);
 assert.equal(prior.servers.length,1);
 const next=prepareProfileImport({version:1,servers:[],apps:[{id:'app_xyz',name:'Other',urlRemote:'https://attacker.example/',adapter:'3xui'}]},prior);
 assert.equal(next.apps[0].urlRemote,'https://attacker.example/');
 assert.equal(prior.apps[0].urlRemote,'https://mail.example:11361/secret/');
});
test('R5.4 import checks profile before mutation and stores encrypted Vault only for secure backups',()=>{
 const parsed=js.slice(js.indexOf("$('import-file').onchange="),js.indexOf("$('server-filter').oninput="));
 const transactional=js.slice(js.indexOf('async function applyImportedProfile('),js.indexOf("$('import-file').onchange="));
 assert.match(parsed,/prepareProfileImport\(parsed,registry,storedVault\?\.entries\|\|\{\}\)/);
 assert.match(parsed,/isSecureBackup\(parsed\)/);
 assert.match(transactional,/old\.adapter===app\.adapter&&appUrl\(old\)===appUrl\(app\)/);
 assert.match(transactional,/const stopped=await chrome\.runtime\.sendMessage/);
 assert.match(transactional,/if\(secure\)\{stored\.rfPortal2VaultEncrypted=encryptedVault/);
 assert.match(transactional,/await chrome\.storage\.local\.set\(stored\)/);
 assert.doesNotMatch(transactional,/dropEncrypted|removeServer\(/);
});
