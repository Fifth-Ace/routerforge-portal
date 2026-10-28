import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
test('P18 compiled userscript guarded against comment swallowing code',()=>{
 const src=read('userscript/runtime.template.js');
 assert.match(src,/const widthPct=\{value:'85'\}; \/\* legacy storage only; hidden from UI \*\/ const group=field\(form,/);
 assert.doesNotMatch(src,/\/\/ legacy storage only; hidden from UIconst group/);
 assert.match(read('tools/build_userscript.py'),/subprocess\.run\(\['node','--check'/);
 assert.equal(read('.github/workflows/ci.yml').split('node --check release/routerforge-portal.user.js').length-1,2,'both CI builds must check bundled JavaScript');
 assert.match(read('.github/workflows/release.yml'),/node --check release\/routerforge-portal\.user\.js/);
});
