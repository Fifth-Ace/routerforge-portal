import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../content/bridge.css',import.meta.url),'utf8');
const js=readFileSync(new URL('../content/bridge.js',import.meta.url),'utf8');
const tm=readFileSync(new URL('../userscript/runtime.template.js',import.meta.url),'utf8');
test('P12 corrected typography uses valid CSS declarations',()=>{
  assert.match(css,/font-family:Arial,"Segoe UI",system-ui,sans-serif!important/);
  assert.match(css,/font-size:14px!important;font-weight:400!important;line-height:1\.5!important/);
  assert.doesNotMatch(css,/font:400 13px\/1\.45 inherit/);
});
test('P12 light theme replaces the entire content background, not only cards',()=>{
  assert.match(css,/--kb-page:#eff3f8/);
  assert.match(css,/background:var\(--kb-page\)!important/);
  assert.match(css,/--kb-card:#ffffff/);
  assert.match(css,/color-scheme:light!important/);
});
test('P12 native sidebar always follows router theme, separate from workspace',()=>{
  assert.match(js,/function detectHostTheme\(\)/);
  assert.match(js,/entry\.dataset\.kbTheme = hostTheme/);
  assert.match(js,/workspace\.dataset\.kbTheme = next/);
});
test('userscript creates HTTP-safe IDs with secure random bytes, not randomUUID',()=>{
  assert.match(tm,/crypto\.getRandomValues\(new Uint8Array\(16\)\)/);
  assert.doesNotMatch(tm,/crypto\.randomUUID/);
});
