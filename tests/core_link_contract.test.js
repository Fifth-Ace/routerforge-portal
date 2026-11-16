import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const popup=read('popup.js'), html=read('popup.html'), model=read('shared/model.js');
test('P2 local Core linking requires an explicit user action, never weakens Core auth',()=>{
 for(const id of ['core-link-btn','core-link-state','core-suggestions-list']) assert.ok(html.includes(`id="${id}"`));
 assert.match(popup,/confirmCoreAssociation\(\)/);
 assert.match(popup,/coreCatalogRouter !== router/);
 assert.match(popup,/profile\.coreLink=coreEndpoint\(router\)\.origin/);
 assert.match(model,/coreLink/);
 const linkBody=popup.slice(popup.indexOf('async function confirmCoreAssociation()'),popup.indexOf('async function renderCoreSuggestions()'));
 assert.doesNotMatch(linkBody,/\/api\/auth\/login|password|cookie/i);
});
test('P2 add suggestion is user-click-only, read-only on Core and never overwrites existing applications',()=>{
 assert.match(popup,/suggestCoreWebApps\(/);
 assert.match(popup,/async function addCoreSuggestion\(/);
 assert.match(popup,/state\.routers\[router\]\.apps\.push\(app\)/);
 assert.match(popup,/writeState\(state\)/);
 assert.match(model,/coreSourceId/);
});
