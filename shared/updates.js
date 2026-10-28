// RouterForge Portal: read-only, fail-closed GitHub Releases discovery.
// This module never downloads or executes code, and never changes extension files.
export const RELEASE_REPO = 'Fifth-Ace/routerforge-portal';
export const RELEASE_API = 'https://api.github.com/repos/Fifth-Ace/routerforge-portal/releases/latest';
export const RELEASES_PAGE = 'https://github.com/Fifth-Ace/routerforge-portal/releases';
const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:\.(0|[1-9]\d*))?$/;
const HASH = /^sha256:([a-fA-F0-9]{64})$/;
const MAX_ASSET_BYTES = 8 * 1024 * 1024;
export function compareVersions(a,b) {
  const pa=String(a).match(VERSION), pb=String(b).match(VERSION);
  if (!pa || !pb) throw Error('INVALID_VERSION');
  for(let i=1;i<=4;i++){
    const diff=Number(pa[i]||0)-Number(pb[i]||0);
    if(diff) return Math.sign(diff);
  }
  return 0;
}
export function parseRelease(data,current) {
  if(!data || typeof data!=='object' || data.draft || data.prerelease) throw Error('NOT_STABLE_RELEASE');
  if(data.immutable !== true) throw Error('RELEASE_NOT_IMMUTABLE');
  if(typeof data.tag_name!=='string' || !/^v\d+\.\d+\.\d+(?:\.\d+)?$/.test(data.tag_name)) throw Error('INVALID_RELEASE_TAG');
  const version=data.tag_name.slice(1);
  compareVersions(version,current);
  const expected=`routerforge-portal-chromium-v${version}.zip`;
  const list=Array.isArray(data.assets)?data.assets:[];
  const asset=list.find(a=>a?.name===expected);
  if(!asset) throw Error('INSTALL_ASSET_NOT_PUBLISHED');
  if(!Number.isSafeInteger(asset.size)||asset.size<1000||asset.size>MAX_ASSET_BYTES) throw Error('UNSAFE_ASSET_SIZE');
  const hash=String(asset.digest||'').match(HASH);
  if(!hash) throw Error('ASSET_SHA256_UNAVAILABLE');
  const target=`https://github.com/${RELEASE_REPO}/releases/download/${data.tag_name}/${expected}`;
  if(asset.browser_download_url!==target) throw Error('UNEXPECTED_ASSET_URL');
  const releasePage=`https://github.com/${RELEASE_REPO}/releases/tag/${data.tag_name}`;
  if(data.html_url!==releasePage) throw Error('UNEXPECTED_RELEASE_URL');
  return Object.freeze({version,tag:data.tag_name,releasePage,assetUrl:target,assetName:expected,sha256:hash[1].toLowerCase(),size:asset.size,hasUpdate:compareVersions(version,current)>0});
}
export async function checkForUpdates(current,fetcher=fetch) {
  if(!VERSION.test(current)) throw Error('INVALID_INSTALLED_VERSION');
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),10000);
  try{
    const response=await fetcher(RELEASE_API,{
      method:'GET',mode:'cors',cache:'no-store',credentials:'omit',redirect:'error',signal:controller.signal,
      headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}
    });
    if(response.status===404) throw Error('REPOSITORY_OR_RELEASE_NOT_FOUND');
    if(response.status===403||response.status===429) throw Error('GITHUB_RATE_LIMIT');
    if(!response.ok) throw Error(`GITHUB_HTTP_${response.status}`);
    const length=Number(response.headers?.get?.('content-length')||0);
    if(length>512*1024)throw Error('METADATA_TOO_LARGE');
    const raw=await response.text();
    if(raw.length>512*1024)throw Error('METADATA_TOO_LARGE');
    return parseRelease(JSON.parse(raw),current);
  }catch(err){
    if(err?.name==='AbortError')throw Error('NETWORK_TIMEOUT');
    throw err;
  }finally { clearTimeout(timer); }
}
