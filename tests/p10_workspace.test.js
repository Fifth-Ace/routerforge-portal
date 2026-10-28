import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const script=readFileSync(new URL('../content/bridge.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../content/bridge.css',import.meta.url),'utf8');
test('P10 caches at most three frames and unloads evicted DOM',()=>{
  assert.match(script,/MAX_WORKSPACE_FRAMES = 3/);
  assert.match(script,/while \(frames\.size > MAX_WORKSPACE_FRAMES\) forgetFrame/);
  assert.match(script,/item\.frame\.removeAttribute\('src'\)/);
  assert.match(script,/item\.frame\.remove\(\)/);
  assert.match(script,/const frames = new Map\(\)/);
});
test('P10 cross-origin frames are isolated and native navigation clears them',()=>{
  assert.match(script,/item\.frame\.toggleAttribute\('inert', !active\)/);
  assert.match(script,/item\.frame\.setAttribute\('aria-hidden', String\(!active\)\)/);
  assert.match(script,/function destroyAllFrames\(/);
  assert.match(script,/function closeWorkspace\(\) \{[\s\S]*?destroyAllFrames\(\)/);
  assert.match(script,/function unmount\(\) \{[\s\S]*?destroyAllFrames\(\)/);
  assert.match(css,/\.kb-frame-stack iframe\[hidden\]\{display:none!important;\}/);
  assert.doesNotMatch(script,/history\.(pushState|replaceState)\s*=/);
});
