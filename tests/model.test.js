import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanApp, cleanState, hostMatch, parseAddress, routerOrigin, newState } from '../shared/model.js';

test('accept router addresses with custom ports', () => {
  assert.equal(routerOrigin('http://192.168.10.1:8888/path'), 'http://192.168.10.1:8888');
  assert.equal(hostMatch('http://192.168.10.1:8888'), 'http://192.168.10.1/*');
  assert.equal(routerOrigin('https://my.keenetic.net/'), 'https://my.keenetic.net');
});
test('reject dangerous navigation and credentials', () => {
  for (const url of ['javascript:alert(1)','file:///etc/passwd','data:text/html,ok','http://user:pass@host.local/','https://']) {
    assert.throws(() => parseAddress(url), url);
  }
});
test('normalize modes, icon and IDs without HTML', () => {
  const app = cleanApp({name:' RouterForge ',url:'http://192.168.1.1:9090',mode:'unknown',icon:'<svg>'});
  assert.equal(app.name,'RouterForge');
  assert.equal(app.url,'http://192.168.1.1:9090/');
  assert.equal(app.mode,'auto');
  assert.equal(app.icon,'▣');
  assert.ok(app.id);
});
test('strict import with router limits and unique IDs', () => {
  const base=newState();
  base.routers['http://192.168.1.1']={label:'Keenetic',apps:[{id:'valid_one',name:'Test',url:'http://127.0.0.1:8080',mode:'external'}]};
  const out=cleanState(base);
  assert.equal(out.routers['http://192.168.1.1'].apps[0].mode,'external');
  assert.throws(()=>cleanState({version:2,routers:{}}));
  assert.throws(()=>cleanState({version:1,routers:{'javascript:abc':{apps:[]}}}));
  base.routers['http://192.168.1.1'].apps.push({...base.routers['http://192.168.1.1'].apps[0]});
  assert.throws(()=>cleanState(base));
});


test('theme profiles migrate from P0 and preserve explicit choice', () => {
  const old = newState();
  old.routers['http://192.168.1.1'] = {label:'Netcraze', apps:[]};
  assert.equal(cleanState(old).routers['http://192.168.1.1'].theme, 'auto');
  old.routers['http://192.168.1.1'].theme = 'dark';
  assert.equal(cleanState(old).routers['http://192.168.1.1'].theme, 'dark');
  old.routers['http://192.168.1.1'].theme = 'unsupported';
  assert.equal(cleanState(old).routers['http://192.168.1.1'].theme, 'auto');
});
