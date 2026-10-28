import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const root = new URL('../',import.meta.url);
const get = p => readFileSync(new URL(p,root),'utf8');
const manifest = JSON.parse(get('manifest.json'));
test('Portal branding is consistent with runtime version',()=>{
  assert.equal(manifest.name,'RouterForge Portal');
  assert.equal(manifest.version,'0.10.1');
  assert.match(get('content/bridge.js'),/BRIDGE_VERSION = '0\.10\.1'/);
  assert.match(get('popup.html'),/RouterForge <em>Portal<\/em>/);
  assert.match(get('options.html'),/RouterForge <em>Portal<\/em>/);
});
test('bundled local icons and legacy storage preserved',()=>{
  for(const icon of Object.values(manifest.icons)) {
    assert.ok(existsSync(new URL(icon,root)),`Missing ${icon}`);
  }
  assert.match(get('shared/model.js'),/kbridgeState/);
  assert.match(get('Install-RouterForgePortal.ps1'),/Keenetic WebUI Bridge/);
  assert.match(get('Install-RouterForgePortal.ps1'),/RouterForge Portal/);
  assert.match(get('Install-RouterForgePortal.ps1'),/assets\/icon-128\.png/);
});

test('real RouterForge brand and ecosystem links included',()=>{
  assert.ok(existsSync(new URL('assets/routerforge-brand.png',root)));
  for(const page of ['popup.html','options.html']){
    assert.match(get(page),/assets\/routerforge-brand\.png/);
    assert.match(get(page),/https:\/\/github\.com\/Fifth-Ace\/routerforge/);
    assert.match(get(page),/https:\/\/t\.me\/RouterForge/);
  }
  const script=get('content/bridge.js');
  assert.match(script,/isAuthenticatedShell/);
  assert.match(script,/authObserver/);
  assert.match(script,/unmount\(\)/);
});
