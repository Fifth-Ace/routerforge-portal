// P2.2: read-only Core catalog inspection from a *user-opened* Core tab.
// This function is intentionally self-contained for chrome.scripting.executeScript.
// Never reads cookies, storage, credentials or mutable Core endpoints.
export async function readCoreCatalogInTab(expectedOrigin) {
  if (typeof expectedOrigin !== 'string' || location.origin !== expectedOrigin ||
      location.protocol !== 'http:' || location.port !== '2233') {
    return {kind:'wrong_tab'};
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5500);
  try {
    const response = await fetch(expectedOrigin + '/api/catalog', {
      method:'GET', credentials:'same-origin', redirect:'error', cache:'no-store',
      signal:controller.signal, headers:{Accept:'application/json'}
    });
    if (response.status === 401 || response.status === 403) return {kind:'auth_required'};
    if (!response.ok) return {kind:'http_error',status:response.status};
    const length = Number(response.headers?.get?.('content-length') || 0);
    if (length > 2 * 1024 * 1024) return {kind:'too_large'};
    const contentType = String(response.headers?.get?.('content-type') || '');
    if (!contentType.toLowerCase().includes('application/json')) return {kind:'not_json'};
    const raw = await response.text();
    if (raw.length > 2 * 1024 * 1024) return {kind:'too_large'};
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || !Array.isArray(data.modules)) return {kind:'bad_catalog'};
    // Extract only bounded, non-sensitive display fields from this Core instance.
    const copy = item => ({
      id:typeof item?.id === 'string' ? item.id.slice(0,64) : '',
      name:typeof item?.name === 'string' ? item.name.slice(0,70) : '',
      version:typeof item?.version === 'string' ? item.version.slice(0,64) : '',
      installed:item?.installed === true,
      service_running:item?.service_running === true,
      disabled:item?.disabled === true,
      web:item?.web && typeof item.web === 'object' && !Array.isArray(item.web) ? {
        scheme:typeof item.web.scheme === 'string' ? item.web.scheme.slice(0,12) : '',
        port:Number.isInteger(item.web.port) ? item.web.port : 0,
        path:typeof item.web.path === 'string' ? item.web.path.slice(0,301) : '/'
      } : null
    });
    return {kind:'ok',modules:data.modules.slice(0,80).map(copy),
      integrations:Array.isArray(data.integrations) ? data.integrations.slice(0,80).map(copy) : []};
  } catch (error) {
    return {kind:error?.name === 'AbortError' ? 'timeout' : 'fetch_error'};
  } finally {clearTimeout(timeout);}
}

export function summarizeCoreModules(result) {
  if (!result || result.kind !== 'ok' || !Array.isArray(result.modules) || result.modules.length > 80) {
    throw Error('CORE_CATALOG_UNAVAILABLE');
  }
  const visible = result.modules.filter(x => x && x.installed === true &&
    typeof x.id === 'string' && /^[a-z0-9_-]{2,64}$/i.test(x.id) &&
    typeof x.name === 'string' && x.name.length > 0 && x.name.length <= 70);
  return Object.freeze({
    total: visible.length,
    running: visible.filter(x => x.service_running === true).length,
    items: visible.slice(0,12).map(x => Object.freeze({
      name:x.name,
      version:typeof x.version === 'string' && /^[\w.+~:-]{1,64}$/.test(x.version) ? x.version : '',
      status:x.disabled === true ? 'disabled' : x.service_running === true ? 'running' : 'installed'
    }))
  });
}
