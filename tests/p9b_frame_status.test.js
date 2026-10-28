import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src = readFileSync(new URL('../content/bridge.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../content/bridge.css', import.meta.url), 'utf8');
test('P9B status is bilingual and not a false claim of iframe failure', () => {
  assert.match(src, /loading:'Загрузка панели…'/);
  assert.match(src, /loading:'Loading panel…'/);
  assert.match(src, /slow:'Панель загружается дольше обычного'/);
  assert.match(src, /Cross-origin iframe events cannot reliably establish CSP\/X-Frame-Options success/);
  assert.match(src, /status\.dataset\.kbState/);
});
test('P9B reload and lifecycle cleanup are isolated from Keenetic DOM', () => {
  assert.match(src, /function reloadCurrentFrame\(/);
  assert.match(src, /clearFrameTimer\(\)/);
  assert.match(src, /if \(isNew\)/);
  assert.match(src, /MAX_WORKSPACE_FRAMES = 3/);
  assert.match(css, /\.kb-frame-status\[hidden\]\{display:none!important;\}/);
  assert.doesNotMatch(src, /history\.(?:pushState|replaceState)\s*=/);
});
