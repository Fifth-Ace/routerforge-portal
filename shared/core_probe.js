// RouterForge Core discovery: user-triggered, GET-only, credential-free.
// Uses the documented Core /api/health endpoint; no subnet scanning or polling.
export const CORE_PORT = 2233;
const MAX_BYTES = 4096;

export function coreEndpoint(routerOrigin) {
  const router = new URL(routerOrigin);
  if (!['http:', 'https:'].includes(router.protocol) || !router.hostname || router.username || router.password || router.origin !== routerOrigin) {
    throw Error('INVALID_ROUTER_ORIGIN');
  }
  // RouterForge Core HTTP listener defaults to port 2233, independently of Keenetic WebUI port/TLS.
  // Explicit user consent is required for the HTTP host permission before probing.
  const core = new URL(`http://${router.hostname}:${CORE_PORT}/`);
  return Object.freeze({origin: core.origin, health: core.origin + '/api/health', page: core.origin + '/'});
}

export function readCoreHealth(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || payload.ok !== true || payload.module_abi !== 'v1') {
    throw Error('NOT_ROUTERFORGE_CORE');
  }
  const version = String(payload.version || '').trim();
  if (!version || version.length > 100 || !/^[A-Za-z0-9._+~-]+$/.test(version)) throw Error('INVALID_CORE_VERSION');
  return Object.freeze({online: true, version, moduleAbi: 'v1'});
}

export async function probeCore(routerOrigin, fetcher = fetch) {
  const endpoint = coreEndpoint(routerOrigin);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetcher(endpoint.health, {
      method: 'GET', credentials: 'omit', redirect: 'error', cache: 'no-store', mode: 'cors', signal: controller.signal,
      headers: {Accept: 'application/json'}
    });
    if (!response.ok) throw Error('CORE_HTTP_' + response.status);
    const length = Number(response.headers?.get?.('content-length') || 0);
    if (length > MAX_BYTES) throw Error('CORE_RESPONSE_TOO_LARGE');
    const raw = await response.text();
    if (raw.length > MAX_BYTES) throw Error('CORE_RESPONSE_TOO_LARGE');
    return readCoreHealth(JSON.parse(raw));
  } catch (err) {
    if (err?.name === 'AbortError') throw Error('CORE_TIMEOUT');
    throw err;
  } finally {clearTimeout(timer);}
}
