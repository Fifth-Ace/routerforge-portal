import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const popup=read('popup.js'),popupHTML=read('popup.html'),options=read('options.js'),optionsHTML=read('options.html');
test('Core and router overview are collapsible without removing persistent child controls',()=>{
 assert.match(popupHTML,/<details id="router-overview"/);
 assert.match(popupHTML,/<details class="core-status-card" id="core-card"/);
 for(const id of ['core-check-btn','core-open-btn','core-modules-btn','core-link-btn','core-suggestions-list','router-overview-list'])assert.ok(popupHTML.includes(`id="${id}"`));
 assert.match(optionsHTML,/<details class="router-overview-settings"/);
});
test('popup favorite filter never modifies stored app objects',()=>{
 assert.match(popup,/const activeApps=favoritesOnly\?allApps\.filter/);
 assert.match(popup,/popup-favorite-btn'\)\.addEventListener\('click'/);
 assert.doesNotMatch(popup.slice(popup.indexOf('function renderApps('),popup.indexOf('async function refresh()')),/writeState\(/);
});
test('rename, default profile and import mode require explicit UI interactions',()=>{
 for(const id of ['router-label-edit','router-rename-btn','router-default-btn','import-mode'])assert.ok(optionsHTML.includes(`id="${id}"`));
 assert.match(options,/renameRouterProfile\(state,target/);
 assert.match(options,/saveDefaultRouter\(state,selected\)/);
 assert.match(options,/mergeRouterProfiles\(state,next\)/);
 assert.match(options,/if\(preview\.added===0\)throw/);
 assert.match(options,/if\(!confirm\(/);
});
