import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cleanApp} from '../shared/model.js';
import {makeCatalogApp} from '../shared/catalog.js';
const options=readFileSync(new URL('../options.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../ui.css',import.meta.url),'utf8');
test('P13 cards show only essential fields until details is opened',()=>{
 assert.match(options,/node\('details','catalog-advanced'\)/);
 assert.match(options,/node\('div','catalog-fields catalog-primary'\)/);
 assert.match(css,/\.catalog-fields\.catalog-primary/);
 assert.doesNotMatch(options,/catalog-width-pct|catalog-left-trim|catalog-right-trim/);
});
test('legacy manual calibration stays round-trip safe even if excluded from cards',()=>{
 const old=cleanApp({id:'preset_awg-manager',name:'AWG Manager',url:'http://192.168.1.1:2222/',mode:'external',presetId:'awg-manager',manualBounds:true,nativeLeftTrimPx:4,nativeRightTrimPx:22,nativeWidthPct:85});
 const modified=makeCatalogApp('http://192.168.1.1','awg-manager',{hostname:'192.168.1.1',port:3333,mode:'auto',layoutWidth:'native'},true,old);
 assert.equal(modified.nativeRightTrimPx,22);assert.equal(modified.nativeLeftTrimPx,4);assert.equal(modified.manualBounds,true);assert.equal(modified.url,'http://192.168.1.1:3333/');
});
