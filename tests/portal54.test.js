import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {cleanRegistry} from '../shared/portal2_registry.js';
import {PortalVault} from '../shared/portal2_vault.js';
import {secureBackup,openBackup} from '../shared/portal2_bundle.js';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const url='https://vps.example:11361/secret-panel/';
const registry=cleanRegistry({version:1,servers:[{id:'server_main',name:'Mail'}],apps:[{id:'app_main',serverId:'server_main',name:'3x-ui',adapter:'3xui',urlRemote:url,addressMode:'remote',tokenRole:'admin'}]});
function storage(){const x={};return {async get(k){return {[k]:structuredClone(x[k])}},async set(data){Object.assign(x,structuredClone(data))}};}
test('R5.4 role is preserved or fail-closed',()=>{assert.equal(cleanRegistry(registry).apps[0].tokenRole,'admin');assert.equal(cleanRegistry({...registry,apps:[{...registry.apps[0],tokenRole:'superuser'}]}).apps[0].tokenRole,'monitor');});
test('R5.4 encrypted profile + Vault preserves full URL and one token',async()=>{
 const v=new PortalVault(storage());await v.create('original-master-password-123');await v.set('tok_app_main',url,'admin-secret-token-xx');
 const data=await secureBackup(registry,await v.data(),'backup-passphrase-safe-123');
 for(const sensitive of ['/secret-panel/','admin-secret-token-xx','server_main'])assert.ok(!data.includes(sensitive));
 const decoded=await openBackup(data,'backup-passphrase-safe-123');assert.deepEqual(decoded.registry,registry);
 const storage2=storage();await storage2.set({rfPortal2VaultEncrypted:decoded.vault});const restored=new PortalVault(storage2);await restored.unlock('original-master-password-123');assert.equal(await restored.get('tok_app_main',url),'admin-secret-token-xx');
});
test('R5.4 wrong password and ciphertext corruption are rejected',async()=>{
 const data=await secureBackup(registry,null,'backup-passphrase-safe-123');
 await assert.rejects(openBackup(data,'wrong-backup-passphrase'),/BACKUP_PASSWORD_OR_INTEGRITY_FAILED/);
 const parsed=JSON.parse(data);parsed.data=parsed.data.slice(0,-6)+'AAAAAA';await assert.rejects(openBackup(parsed,'backup-passphrase-safe-123'),/BACKUP_PASSWORD_OR_INTEGRITY_FAILED/);
});
test('R5.4 reject malformed vault before export',async()=>{await assert.rejects(secureBackup(registry,{entries:{bad:{plain:'secret'}}},'backup-passphrase-safe-123'),/BACKUP_VAULT_INVALID/);});
test('R5.4 UI has only one token editor, read-only scope detection and optional migration',()=>{
 const html=source('portal-center.html'),js=source('portal-center.js');
 assert.match(html,/id="migrate-legacy-admin"/);assert.doesNotMatch(html,/id="admin-token"/);
 assert.match(js,/adminRequest\(a,url,token,'inbounds'\)/);assert.match(js,/read3xui\(a,url,\{token\}\)/);assert.match(js,/vault\.get\('tok_'\+a.id,url\)/);
 assert.match(js,/openBackup\(pendingBackup.source,pass\)/);
 assert.match(js,/collectWorkspace\(saved,registry\)/);
 assert.match(js,/secureBackup\(registry,raw,pass,\{period:pollPeriod,workspace\}\)/);
});
test('R5.4 popup reads last snapshot without fetching',()=>{const js=source('popup.js');assert.match(js,/portal-mini-metrics/);assert.match(js,/portal-mini-open/);assert.doesNotMatch(js,/fetch\(/);});
