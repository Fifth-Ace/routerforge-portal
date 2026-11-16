import test from 'node:test';
import assert from 'node:assert/strict';
import {coreEndpoint, readCoreHealth, probeCore} from '../shared/core_probe.js';

test('Core URL stays pinned to the chosen router hostname and Core HTTP port 2233', () => {
  assert.deepEqual(coreEndpoint('http://192.168.10.1'), {origin:'http://192.168.10.1:2233',health:'http://192.168.10.1:2233/api/health',page:'http://192.168.10.1:2233/'});
  assert.equal(coreEndpoint('https://my.keenetic.net').health,'http://my.keenetic.net:2233/api/health');
  assert.equal(coreEndpoint('http://192.168.10.1:8080').origin,'http://192.168.10.1:2233');
  for (const bad of ['https://user:pass@example.net','file:///etc/passwd','http://example.net/path','http://example.net/','https://example.net?x=1']) {
    assert.throws(() => coreEndpoint(bad), /INVALID_ROUTER_ORIGIN/);
  }
});

test('Only real RouterForge health schema is treated as online', () => {
  assert.deepEqual(readCoreHealth({ok:true,version:'0.15.0~beta.5',module_abi:'v1'}), {online:true,version:'0.15.0~beta.5',moduleAbi:'v1'});
  for (const bad of [{ok:true,version:'1.2.3'},{ok:false,version:'1.2.3',module_abi:'v1'},{ok:true,version:'<script>',module_abi:'v1'},[],null]) {
    assert.throws(()=>readCoreHealth(bad));
  }
});

test('Probe is GET-only, credential-free and follows neither redirects nor remote code', async () => {
  const calls=[];
  const fake=async (url,opts) => {
    calls.push([url,opts]);
    return {ok:true,status:200,headers:{get:()=>null},text:async()=>JSON.stringify({ok:true,version:'1~dev.r1234.abcdef',module_abi:'v1'})};
  };
  const result=await probeCore('http://192.168.10.1',fake);
  assert.equal(result.version,'1~dev.r1234.abcdef');
  assert.equal(calls.length,1);
  assert.equal(calls[0][0],'http://192.168.10.1:2233/api/health');
  assert.equal(calls[0][1].method,'GET');
  assert.equal(calls[0][1].credentials,'omit');
  assert.equal(calls[0][1].redirect,'error');
  assert.equal(calls[0][1].cache,'no-store');
  assert.equal(calls[0][1].mode,'cors');
});

test('Rejects invalid JSON, unexpected service, huge replies and HTTP failures', async()=>{
  const answer=(body,status=200,headers={get:()=>null})=>async()=>({ok:status===200,status,headers,text:async()=>body});
  await assert.rejects(probeCore('http://192.168.10.1',answer('<html>')));
  await assert.rejects(probeCore('http://192.168.10.1',answer('{"ok":true,"version":"1","module_abi":"other"}')),/NOT_ROUTERFORGE_CORE/);
  await assert.rejects(probeCore('http://192.168.10.1',answer('',401)),/CORE_HTTP_401/);
  await assert.rejects(probeCore('http://192.168.10.1',answer('{}',200,{get:()=> '10000'})),/CORE_RESPONSE_TOO_LARGE/);
});
