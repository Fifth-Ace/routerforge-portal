import test from 'node:test';
import assert from 'node:assert/strict';
import { readCoreCatalogInTab, summarizeCoreModules } from '../shared/core_catalog.js';

const reply = (x) => ({ok:true,status:200,headers:{get:k=>k==='content-type'?'application/json; charset=utf-8':null},text:async()=>JSON.stringify(x)});
async function simulate(expectedOrigin, handler) {
  const previousLocation=globalThis.location, previousFetch=globalThis.fetch;
  globalThis.location={origin:'http://192.168.10.1:2233',protocol:'http:',port:'2233'};
  globalThis.fetch=handler;
  try {return await readCoreCatalogInTab(expectedOrigin);} finally {globalThis.location=previousLocation;globalThis.fetch=previousFetch;}
}

test('Core tab probe makes one same-origin GET and never submits credentials or mutations',async()=>{
  let calls=0;
  const r=await simulate('http://192.168.10.1:2233',async(url,opts)=>{
    calls++;assert.equal(url,'http://192.168.10.1:2233/api/catalog');assert.equal(opts.method,'GET');assert.equal(opts.credentials,'same-origin');
    assert.equal(opts.redirect,'error');assert.equal(opts.cache,'no-store');
    return reply({modules:[{id:'dns',name:'DNS',installed:true,service_running:true,version:'1.2.3'}]});
  });
  assert.equal(calls,1); assert.equal(r.kind,'ok');
  assert.deepEqual(summarizeCoreModules(r),{total:1,running:1,items:[{name:'DNS',version:'1.2.3',status:'running'}]});
});

test('Core module check fails closed for wrong tab (never fetches)',async()=>{
 const r=await simulate('http://192.168.10.2:2233',async()=>{throw Error('MUST_NOT_FETCH')});
 assert.equal(r.kind,'wrong_tab');
});

test('401/403 prompt sign-in and no auth bypass',async()=>{
 for(const status of [401,403]){
   const r=await simulate('http://192.168.10.1:2233',async()=>({ok:false,status}));
   assert.deepEqual(r,{kind:'auth_required'});
 }
});

test('installed module summaries are bounded, sanitised and distinguish stopped/running',()=>{
 const data={kind:'ok',modules:[
  {id:'dns',name:'DNS',installed:true,service_running:true,version:'1.0'},
  {id:'nfqws-manager',name:'NFQWS',installed:true,service_running:false,version:'1.1'},
  {id:'monitoring',name:'Monitoring',installed:true,service_running:false,disabled:true},
  {id:'not-installed',name:'Available',installed:false,service_running:false},
  {id:'malicious<script>',name:'Bad',installed:true},
 ]};
 const result=summarizeCoreModules(data);
 assert.equal(result.total,3);assert.equal(result.running,1);
 assert.deepEqual(result.items.map(x=>x.status),['running','installed','disabled']);
 assert.throws(()=>summarizeCoreModules({kind:'ok',modules:Array(81).fill({})}),/CORE_CATALOG_UNAVAILABLE/);
});

test('unexpected/oversize/non-json responses are never accepted as catalogue',async()=>{
 const x=await simulate('http://192.168.10.1:2233',async()=>({ok:true,status:200,headers:{get:k=>k==='content-type'?'text/html':null}}));
 assert.deepEqual(x,{kind:'not_json'});
 const y=await simulate('http://192.168.10.1:2233',async()=>reply({hello:'world'}));
 assert.deepEqual(y,{kind:'bad_catalog'});
});
