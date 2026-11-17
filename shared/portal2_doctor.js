// Intentional, one-shot, anonymous availability test. Never guesses CSP from HTTP alone.
export async function diagnose(url,{fetcher=fetch,timeoutMs=7000}={}){
  const u=new URL(url);
  if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw Error('INVALID_URL');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const r=await fetcher(u.href,{method:'HEAD',credentials:'omit',redirect:'error',cache:'no-store',signal:controller.signal});
    if(r.status===401||r.status===403)return {state:'AUTH_REQUIRED',reason:'HTTP_'+r.status,embedding:'UNKNOWN'};
    if(r.status===405||r.status===501)return {state:'UNKNOWN',reason:'HEAD_UNSUPPORTED',embedding:'UNKNOWN'};
    return {state:r.ok?'REACHABLE':'UNKNOWN',reason:'HTTP_'+r.status,embedding:'UNKNOWN'};
  }catch(e){return {state:'UNKNOWN',reason:e?.name==='AbortError'?'TIMEOUT':'NETWORK_OR_TLS_OR_REDIRECT',embedding:'UNKNOWN'};}
  finally{clearTimeout(timer);}
}
