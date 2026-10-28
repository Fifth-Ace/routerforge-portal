import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src = readFileSync(new URL('../content/bridge.js', import.meta.url), 'utf8');

test('P9 native geometry never takes ownership of Keenetic main/sidebar DOM', () => {
  assert.match(src, /function nativeContentBounds\(/);
  assert.match(src, /workspace\.dataset\.kbPlacement = wide \? 'wide' : \(native \? 'native' : 'fallback'\)/);
  assert.match(src, /Math\.max\(topBoundary\(\), Math\.ceil\(rootRect\.top\)\)/);
  assert.match(src, /Math\.ceil\(railRight \+ \(closeToRail \? leftGutter : 0\)\)/);
  assert.match(src, /function nativeShellRight\(/);
  assert.doesNotMatch(src, /(?:main|nativeMain)\.replaceChildren\(/);
  assert.doesNotMatch(src, /(?:main|nativeMain)\.innerHTML\s*=/);
  assert.doesNotMatch(src, /(?:main|nativeMain)\.remove\(/);
});

test('P9 routes are observed without modifying History API', () => {
  assert.match(src, /function reconcileNativeRoute\(/);
  assert.match(src, /listen\(window, 'popstate', reconcileNativeRoute\)/);
  assert.match(src, /listen\(window, 'hashchange', reconcileNativeRoute\)/);
  assert.match(src, /listen\(window\.navigation, 'currententrychange', reconcileNativeRoute\)/);
  assert.doesNotMatch(src, /history\.(?:pushState|replaceState)\s*=/);
  assert.doesNotMatch(src, /document\.cookie/);
});
