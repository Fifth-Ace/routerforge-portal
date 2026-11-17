import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=(name)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('P100 stable versions synchronized in Chromium and package',()=>{
 const manifest=JSON.parse(src('manifest.json'));
 const pkg=JSON.parse(src('package.json'));
 assert.equal(manifest.version,'1.0.0');assert.equal(pkg.version,'1.0.0');
 assert.match(src('options.html'),/1\.0\.0/);
 assert.match(src('popup.html'),/1\.0\.0/);
});
test('P100 retains full secure backup and monitoring without changing storage format',()=>{
 const center=src('portal-center.js');
 assert.match(center,/secureBackup\(registry,raw,pass,\{period:pollPeriod,workspace\}\)/);
 assert.match(center,/VAULT_UNLOCKED_MONITOR_RESUME_FAILED/);
 assert.match(src('content/bridge.js'),/function rf59AppendServerMenu\(/);
 assert.match(src('options.js'),/rf59ApplyOptionsLocale\(\)/);
 assert.match(center,/rf59ApplyCenterLocale\(\)/);
});
test('P100 release documentation names stable 1.0.0 and requires postbuild acceptance',()=>{
 const notes=src('RELEASE_NOTES.md');
 const doc=src('docs/PORTAL_P100_RELEASE.md');
 assert.match(notes,/1\.0\.0/);
 assert.match(doc,/Human acceptance before release/);
 assert.match(doc,/No publication/);
});
