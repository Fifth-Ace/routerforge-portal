// P2.3/2.4: pure, read-only suggestions from the Core catalog.
// The returned URLs always point to the selected router's hostname.
export function coreOriginForRouter(routerOrigin) {
  const parsed = new URL(routerOrigin);
  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || parsed.origin !== routerOrigin || parsed.username || parsed.password) throw Error('INVALID_ROUTER');
  parsed.protocol = 'http:';
  parsed.port = '2233';
  return parsed.origin;
}

export function suggestCoreWebApps(catalog, routerOrigin, existing = []) {
  if (!catalog || catalog.kind !== 'ok' || !Array.isArray(catalog.modules) || !Array.isArray(catalog.integrations)) return [];
  const base = new URL(routerOrigin);
  const usedSources = new Set(existing.map(x => x.coreSourceId).filter(Boolean));
  const usedUrls = new Set(existing.map(x => { try { return new URL(x.url).href; } catch { return ''; } }));
  const result = [];
  const seen = new Set();
  for (const [kind, entries] of [['m', catalog.modules], ['i', catalog.integrations]]) {
    for (const entry of entries) {
      if (!entry || entry.installed !== true || typeof entry.id !== 'string' || !/^[a-z0-9_-]{2,60}$/i.test(entry.id)) continue;
      if (typeof entry.name !== 'string' || !entry.name.trim() || entry.name.length > 70) continue;
      const web = entry.web;
      if (!web || typeof web !== 'object' || Array.isArray(web)) continue;
      const protocol = String(web.scheme || 'http').replace(/:$/, '').toLowerCase();
      if (!['http', 'https'].includes(protocol)) continue;
      const port = web.port;
      if (!Number.isInteger(port) || port < 1 || port > 65535) continue;
      const path = web.path || '/';
      if (typeof path !== 'string' || path.length > 300 || !path.startsWith('/') || path.startsWith('//') || /[\\\r\n\t\s<>"'`#]/.test(path) || /(^|\/)\.{1,2}(\/|\?|$)/.test(path)) continue;
      const target = new URL(routerOrigin);
      target.protocol = protocol + ':';
      target.port = String(port);
      target.pathname = '/';
      target.search = '';
      target.hash = '';
      let url;
      try { url = new URL(path, target.origin); } catch { continue; }
      if (url.origin !== target.origin || url.hostname !== base.hostname || url.username || url.password) continue;
      const id = kind + '_' + entry.id;
      if (seen.has(id) || usedSources.has(id) || usedUrls.has(url.href)) continue;
      seen.add(id);usedUrls.add(url.href);
      result.push(Object.freeze({coreSourceId:id,name:entry.name.trim(),url:url.href,icon:kind==='m'?'▣':'🌐',group:kind==='m'?'routerforge':'other',mode:'auto'}));
      if (result.length >= 16) return result;
    }
  }
  return result;
}
