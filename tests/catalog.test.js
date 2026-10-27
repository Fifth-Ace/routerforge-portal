import test from 'node:test';
import assert from 'node:assert/strict';
import { CATALOG, catalogUrl, makeCatalogApp, validatePort } from '../shared/catalog.js';
import { cleanState, newState } from '../shared/model.js';
const ROUTER = 'http://192.168.1.1';
test('7 Keenetic integrations are opt-in and have unique names/IDs',()=>{
  assert.equal(CATALOG.length, 7);
  assert.equal(new Set(CATALOG.map(i=>i.id)).size, CATALOG.length);
  assert.equal(CATALOG.find(i=>i.id==='routerforge').port, 2233);
  assert.equal(CATALOG.find(i=>i.id==='awg-manager').port, 2222);
  assert.equal(CATALOG.find(i=>i.id==='nfqws-web').port, 90);
});
test('preset URLs use exact configured port and preserve service path',()=>{
  assert.equal(catalogUrl(ROUTER,'xkeen-ui'), 'http://192.168.1.1:8089/');
  assert.equal(catalogUrl(ROUTER,'routerforge',{hostname:'192.168.10.5',port:3333,protocol:'https:'}), 'https://192.168.10.5:3333/');
  assert.equal(catalogUrl(ROUTER,'nfqws2-ui'), 'http://192.168.1.1:8090/');
});
test('preset URL rejects dangerous or invalid host/port',()=>{
  for (const value of ['0','65536','-1','abcd','','1.2']) assert.throws(()=>validatePort(value),value);
  for (const host of ['evil.test/path','admin@evil.test','example.com:2222','http://test','foo bar']) assert.throws(()=>catalogUrl(ROUTER,'awg-manager',{hostname:host}),host);
  assert.throws(()=>catalogUrl(ROUTER,'routerforge',{protocol:'javascript:'}));
});
test('disabled preset keeps user port, custom apps and display mode across legacy state migrations',()=>{
  const state=newState();
  const manual={id:'manual_123',name:'123',url:'http://192.168.1.1:2222/',mode:'auto',icon:'▣'};
  const preset=makeCatalogApp(ROUTER,'awg-manager',{hostname:'192.168.1.1',port:2223,mode:'external'},false);
  state.routers[ROUTER]={label:'Ultra',theme:'dark',apps:[manual,preset]};
  const cleaned=cleanState(state);
  const [old, p]=cleaned.routers[ROUTER].apps;
  assert.equal(old.name,'123');assert.equal(old.enabled,true);assert.equal(old.presetId,undefined);
  assert.equal(p.presetId,'awg-manager');assert.equal(p.enabled,false);assert.equal(p.url,'http://192.168.1.1:2223/');assert.equal(p.mode,'external');
  assert.equal(makeCatalogApp(ROUTER,'awg-manager',{hostname:'192.168.1.1',port:2223,mode:'external'},true,p).id,p.id);
});

test('removed generic presets stay in old configs but never return to the Keenetic catalog',()=>{
  for(const id of ['transmission','qbittorrent','home-assistant','synology']) assert.ok(!CATALOG.some(x=>x.id===id));
  const st=newState();st.routers[ROUTER]={label:'Ultra',theme:'auto',apps:[{id:'preset_transmission',name:'Transmission',url:'http://192.168.1.1:9091/transmission/web/',icon:'▣',mode:'external',enabled:true,presetId:'transmission'}]};
  assert.equal(cleanState(st).routers[ROUTER].apps[0].name,'Transmission');
});
