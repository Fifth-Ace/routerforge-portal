import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const manifest = JSON.parse(read('manifest.json'));
const pkg = JSON.parse(read('package.json'));
const escaped = manifest.version.replaceAll('.', String.raw`\.`);

test('manifest, npm metadata, native bridge and userscript template have one exact version', () => {
  assert.equal(manifest.version, pkg.version);
  assert.match(read('content/bridge.js'), new RegExp(`const BRIDGE_VERSION = '${escaped}';`));
  assert.match(read('userscript/runtime.template.js'), new RegExp(`const VERSION='${escaped}';`));
});

test('legacy P14 and P17 guards compare with package version rather than stale constant', () => {
  assert.match(read('tests/p14_chromium_cleanup.test.js'), /JSON\.parse\(read\('\.\.\/package\.json'\)\)\.version/);
  assert.match(read('tests/p17_userscript_parity.test.js'), /JSON\.parse\(get\('package\.json'\)\)\.version/);
});
