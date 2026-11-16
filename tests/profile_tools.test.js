import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanRouterLabel,renameRouterProfile,mergeRouterProfiles,preferredRouter,readDefaultRouter,saveDefaultRouter,DEFAULT_ROUTER_KEY} from '../shared/profile_tools.js';
import {newState,cleanState} from '../shared/model.js';
const a='http://192.168.1.1', b='http://192.168.10.1', core='http://192.168.10.1:2233';
function base(){const s=newState();s.routers[a]={label:'Home',theme:'dark',apps:[{id:'manual_1234',name:'DNS',url:'http://192.168.1.1:3000/',mode:'external',favorite:true,icon:'▣'}]};s.routers[b]={label:'Office',theme:'auto',apps:[],coreLink:core};return cleanState(s);}
test('rename changes only label and preserves apps, settings and Core association',()=>{
 const before=base(), after=renameRouterProfile(before,a,'  Дом  ');
 assert.equal(after.routers[a].label,'Дом');assert.equal(after.routers[b].coreLink,core);
 assert.deepEqual(after.routers[a].apps,before.routers[a].apps);
 assert.equal(before.routers[a].label,'Home');
 for(const label of ['', ' '.repeat(4),'x'.repeat(71),'bad\nlabel'])assert.throws(()=>cleanRouterLabel(label),/ROUTER_LABEL_INVALID/);
 assert.throws(()=>renameRouterProfile(before,'http://missing.example','x'),/ROUTER_NOT_SAVED/);
});
test('merge only new devices: existing profiles and apps remain byte-for-byte equivalent',()=>{
 const before=base(), incoming=newState();incoming.routers[a]={label:'Override',apps:[]};incoming.routers['http://10.0.0.1']={label:'New',apps:[]};
 const merged=mergeRouterProfiles(before,incoming);assert.equal(merged.added,1);assert.equal(merged.skipped,1);
 assert.deepEqual(merged.state.routers[a],before.routers[a]);assert.equal(merged.state.routers['http://10.0.0.1'].label,'New');
 assert.equal(Object.keys(before.routers).length,2);
});
test('merge validates 32-router cap before producing saved result',()=>{
 const original=newState();for(let i=1;i<=32;i++)original.routers[`http://10.0.0.${i}`]={label:String(i),apps:[]};
 const imported=newState(); imported.routers['http://10.0.1.1']={label:'Extra',apps:[]};
 assert.throws(()=>mergeRouterProfiles(original,imported),/ROUTER_LIMIT_32/);
});
test('default preference is explicit, local and never overrides active device tab',async()=>{
 const st=base(), data={};const storage={get:async key=>({[key]:data[key]}),set:async patch=>Object.assign(data,patch)};
 assert.equal(preferredRouter(st,b,a,null),a);
 assert.equal(preferredRouter(st,b,null,null),b);
 assert.equal(preferredRouter(st,b,a,b),b);
 assert.equal(preferredRouter(st,'http://not-saved',null,null),a);
 await saveDefaultRouter(st,b,storage);assert.equal(data[DEFAULT_ROUTER_KEY],b);
 assert.equal(await readDefaultRouter(storage),b);
 await assert.rejects(saveDefaultRouter(st,core,storage),/ROUTER_NOT_SAVED/);
});
