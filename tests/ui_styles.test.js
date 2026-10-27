import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sheet = readFileSync(new URL('../ui.css', import.meta.url), 'utf8');

test('popup and options use an actual stylesheet (not JavaScript)', () => {
  assert.ok(sheet.length > 2000);
  assert.match(sheet,/body\.popup\s*\{/);
  assert.match(sheet,/\.dashboard\s*\{/);
  assert.match(sheet,/\.panel\s*\{/);
  assert.match(sheet,/\.entry\s*\{/);
  assert.doesNotMatch(sheet,/^\s*import\s+\{/m);
  assert.doesNotMatch(sheet,/function\s+initialize\(/);
});
test('HTML references stylesheet included in the package', () => {
  for(const filename of ['popup.html','options.html']) {
    const html = readFileSync(new URL('../'+filename,import.meta.url), 'utf8');
    assert.match(html,/<link rel="stylesheet" href="ui\.css">/);
  }
});

test('default text and form controls are legible at FHD and QHD',()=>{
  assert.match(sheet,/catalog-fields input,\.catalog-fields select\{height:40px/);
  assert.match(sheet,/body\{font:15px/);
  assert.match(sheet,/dashboard\{max-width:1920px/);
  assert.match(sheet,/max-width:2020px/);
});
