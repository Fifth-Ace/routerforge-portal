import test from 'node:test';
import assert from 'node:assert/strict';
import {coreOriginForRouter, suggestCoreWebApps} from '../shared/core_suggestions.js';
const router='http://192.168.10.1';
const cat=(entries, integrations=[])=>({kind:'ok',modules:entries,integrations});
const app=(id,name,port,path='/',scheme='http')=>({id,name,installed:true,web:{scheme,port,path}});
test('Core link origin must belong to exactly the selected saved router host',()=>{
  assert.equal(coreOriginForRouter(router),'http://192.168.10.1:2233');
  assert.equal(coreOriginForRouter('https://router.lan:8443'),'http://router.lan:2233');
  assert.throws(()=>coreOriginForRouter('http://evil.test/path'));
});
test('Only installed local web metadata creates suggestions; no scanning or guessed ports',()=>{
  const suggestions=suggestCoreWebApps(cat([app('dns-router','DNS Router',55358,'/ui'),{id:'nfqws-manager',name:'NFQWS',installed:true},{id:'missing',name:'Absent',installed:false,web:{port:8080}}],[app('third-party','Third-party',8282,'/console','https')]),router);
  assert.equal(suggestions.length,2);
  assert.equal(suggestions[0].url,'http://192.168.10.1:55358/ui');
  assert.equal(suggestions[1].url,'https://192.168.10.1:8282/console');
  assert.equal(suggestions[0].mode,'auto');
  assert.equal(suggestions[1].mode,'auto');
});
test('Rejects unsafe web paths, protocols and off-router targets',()=>{
  const entries=[app('evil1','Evil',3000,'//evil.test/p'),app('evil2','Evil',3001,'/../admin'),app('evil3','Evil',3002,'/x\\evil'),app('evil4','Evil',3003,'/ok','javascript'),app('evil5','Evil',3004,'/bad#hash')];
  assert.deepEqual(suggestCoreWebApps(cat(entries),router),[]);
});
test('Does not overwrite existing URLs, core references or duplicate entries',()=>{
  const entries=[app('dns-router','DNS',3000),app('nfqws','NFQWS',4000)];
  const out=suggestCoreWebApps(cat(entries),router,[{url:'http://192.168.10.1:3000/'},{coreSourceId:'m_nfqws'}]);
  assert.deepEqual(out,[]);
});
test('Malformed catalog fails closed',()=>{
  assert.deepEqual(suggestCoreWebApps({kind:'ok',modules:[]},router),[]);
  assert.deepEqual(suggestCoreWebApps({kind:'auth_required'},router),[]);
});
