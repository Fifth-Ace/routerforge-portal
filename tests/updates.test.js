import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRelease,compareVersions,checkForUpdates,RELEASE_API} from '../shared/updates.js';
const sha='a'.repeat(64);
function release(version='0.9.1') {
  const tag='v'+version, name=`routerforge-portal-chromium-v${version}.zip`;
  return {tag_name:tag,draft:false,prerelease:false,immutable:true,html_url:`https://github.com/Fifth-Ace/routerforge-portal/releases/tag/${tag}`,assets:[{name, size:45223,digest:'sha256:'+sha,browser_download_url:`https://github.com/Fifth-Ace/routerforge-portal/releases/download/${tag}/${name}`}]};
}
test('semantic versions are compared numerically, not as strings',()=>{
  assert.equal(compareVersions('0.8.10','0.8.9'),1);
  assert.equal(compareVersions('0.9.0','0.9.0'),0);
  assert.equal(compareVersions('0.7.0','0.9.0'),-1);
  assert.throws(()=>compareVersions('0.9.0-beta','0.9.0'));
});
test('only official immutable-looking GitHub release paths and a digest are accepted',()=>{
  let info=parseRelease(release(),'0.9.0');
  assert.equal(info.hasUpdate,true); assert.equal(info.sha256,sha); assert.match(info.assetUrl,/routerforge-portal-chromium-v0\.9\.1\.zip$/);
  assert.equal(parseRelease(release('0.7.0'),'0.9.0').hasUpdate,false);
  for(const mutation of [
    r=>r.prerelease=true,
    r=>r.immutable=false,
    r=>delete r.immutable,
    r=>r.draft=true,
    r=>r.tag_name='v0.8.1-beta',
    r=>r.assets[0].browser_download_url='https://evil.example/update.zip',
    r=>r.assets[0].digest='',
    r=>r.assets[0].size=100000000,
    r=>r.html_url='https://evil.example/releases',
    r=>r.assets[0].name='untrusted.zip'
  ]){const r=release(); mutation(r); assert.throws(()=>parseRelease(r,'0.9.0'));}
});
test('fetch omits cookies, redirects, and never runs remote code',async()=>{
  const seen=[];
  const fake=async (url,opts)=>{seen.push([url,opts]); return {ok:true,status:200,headers:{get:()=>null},text:async()=>JSON.stringify(release())};};
  const out=await checkForUpdates('0.9.0',fake);
  assert.equal(out.hasUpdate,true); assert.equal(seen[0][0],RELEASE_API);
  assert.equal(seen[0][1].credentials,'omit');assert.equal(seen[0][1].redirect,'error');
});
test('unpublished repo is reported, not silently considered up to date',async()=>{
  await assert.rejects(checkForUpdates('0.9.0',async()=>({status:404,ok:false,headers:{get:()=>null}})),/REPOSITORY_OR_RELEASE_NOT_FOUND/);
});
