import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {collectWorkspace,validateWorkspace,restoreWorkspaceChanges} from '../shared/portal57_unified.js';
import {secureBackup,openBackup,isSecureBackup} from '../shared/portal2_bundle.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const server='server_test',app='app_test',router='http://192.168.1.1';
const registry={version:1,servers:[{id:server,name:'Mail'}],apps:[{id:app,serverId:server,name:'3x-ui',adapter:'3xui',addressMode:'remote',urlRemote:'https://node.example:1234/very-secret-path/',tokenRole:'monitor'}]};
const seed={kbridgeState:{version:1,routers:{[router]:{label:'Keenetic',apps:[{id:'native_app',name:'Core',url:'http://192.168.1.1:2233'}]}}},rfPortalDefaultRouterV1:router,rfPortalSelectedRouterV1:router,rfPortalLanguage:'ru',rfPortalPopupLastTab:'servers',rfPortalR5MonitorConfig:{[app]:{enabled:true,period:5,needsAuth:false,failures:5,lastAttempt:23}}};

test('R5.7 full workspace exports Keenetic apps, servers, monitor and presentation preferences',()=>{
 const workspace=collectWorkspace(seed,registry);
 assert.equal(workspace.keenetic.routers[router].apps[0].url,'http://192.168.1.1:2233/');
 assert.equal(workspace.monitor[app].enabled,true);
 assert.equal(workspace.monitor[app].period,5);
 assert.equal(workspace.monitor[app].needsAuth,true);
 assert.equal(workspace.preferences.rfPortalPopupLastTab,'servers');
 const restore=restoreWorkspaceChanges(workspace);
 assert.equal(restore.kbridgeState.routers[router].label,'Keenetic');
 assert.equal(restore.rfPortalR5MonitorConfig[app].needsAuth,true);
 assert.equal(restore.rfPortalLanguage,'ru');
 assert.equal(workspace.monitor[app].lastAttempt,0);
});

test('R5.7 protected backup round-trip keeps full secret URL and Keenetic profile inside ciphertext',async()=>{
 const workspace=collectWorkspace(seed,registry);const password='very-long-synthetic-passphrase';
 const secure=await secureBackup(registry,null,password,{period:5,workspace});
 assert.ok(isSecureBackup(JSON.parse(secure)));
 assert.ok(!secure.includes('very-secret-path'));
 assert.ok(!secure.includes('192.168.1.1'));
 const result=await openBackup(secure,password);
 assert.equal(result.registry.apps[0].urlRemote,'https://node.example:1234/very-secret-path/');
 assert.equal(result.settings.workspace.keenetic.routers[router].apps.length,1);
 assert.equal(result.settings.workspace.monitor[app].needsAuth,true);
 await assert.rejects(openBackup(secure,'wrong-but-long-enough'),/BACKUP_PASSWORD_OR_INTEGRITY_FAILED/);
});

test('R5.7 fail-closed corrupt preferences and monitor config',()=>{
 const workspace=collectWorkspace(seed,registry);
 assert.throws(()=>validateWorkspace({...workspace,preferences:{rfPortalPopupLastTab:'evil'}},registry),/UNIFIED_POPUP_TAB_INVALID/);
 assert.throws(()=>validateWorkspace({...workspace,preferences:{unknown:'value'}},registry),/UNIFIED_PREFERENCE_UNKNOWN/);
 assert.throws(()=>validateWorkspace({...workspace,monitor:{evil:{enabled:true,period:5}}},registry),/UNIFIED_MONITOR_INVALID/);
 assert.throws(()=>validateWorkspace({...workspace,monitor:{[app]:{enabled:true,period:0}}},registry),/UNIFIED_MONITOR_INVALID/);
});

test('R5.7 old encrypted backup still imports without overwriting Keenetic settings',async()=>{
 const encrypted=await secureBackup(registry,null,'old-backup-passphrase',{period:10});
 const decoded=await openBackup(encrypted,'old-backup-passphrase');
 assert.equal(decoded.settings.workspace,undefined);
 assert.equal(decoded.settings.period,10);
});

test('R5.7 new native settings and web UI do not inject tokens in Keenetic DOM',()=>{
 const bridge=read('content/bridge.js');const options=read('options.html');
 assert.match(bridge,/function rf57NativeServers\(panel\)/);
 assert.match(bridge,/rf57SettingsTab==='servers'/);
 assert.match(bridge,/\['rfPortal2Registry','rfPortalR5Snapshots','rfPortalR5MonitorConfig'\]/);
 assert.ok(!bridge.slice(bridge.indexOf('async function rf57NativeServers'),bridge.indexOf('function renderNativeSettings()')).includes('rfPortal2VaultEncrypted'));
 assert.match(options,/id="rf57-tab-apps"/);
 assert.match(options,/id="rf57-tab-servers"/);
 assert.match(read('shared/portal57_settings_nav.js'),/portal-center\.html\?embedded=1/);
 assert.match(read('portal-center.js'),/collectWorkspace\(saved,registry\)/);
 assert.match(read('portal-center.js'),/restoreWorkspaceChanges\(restoredWorkspace\)/);
});
