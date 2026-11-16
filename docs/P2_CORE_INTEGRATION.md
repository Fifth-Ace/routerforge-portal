# RouterForge Portal P2.1 — explicit, local, read-only Core discovery

## Grounded API contract

The RouterForge Core service listens on HTTP port `2233` by default and exposes `GET /api/health` without login. As of the pinned Core `dev` source, a genuine health response is `{ "ok": true, "version": "...", "module_abi": "v1" }`.

The Core `GET /api/snapshot` and module endpoints are normally protected by authentication. The Core uses SameSite=Strict session cookies, so the extension **must not** copy or bypass session cookies or disable Core security. P2.1 intentionally **does not** read protected module status.

## Native popup UX (Chromium + Firefox)

1. Open a saved router in RouterForge Portal. The existing multi-router selector continues to work (maximum 32 router profiles).
2. A compact **RouterForge Core** card appears under that router profile.
3. Press **Check Core**. The extension requests site permission only for that selected router hostname and HTTP scheme, and performs one `GET http://<router-host>:2233/api/health` with `credentials: omit`, no redirects, and a bounded timeout/response.
4. On a valid response, Portal displays the actual Core version. No response or a different application is not misreported as Core.
5. Use **Open Core** for its own web interface. This opens a tab; it does not impersonate a logged-in Core session.
6. Switching router profiles resets the result; there are no background probes, polling, password handling, router mutations, or subnet scans.

**Security boundary:** Browser and OS policies (permission denial, mixed content, local network access) can block a probe. A probe failure must never be interpreted as proof the Core service is absent. No in-memory response or network result is persisted to disk.

## Userscript (Tampermonkey / Violentmonkey)

The same `content/bridge.js` and app catalog remain in the userscript. RouterForge Core is already a catalog app with port `2233`, which userscript users can launch normally. P2.1 does **not** pretend the userscript can perform the privileged cross-origin health fetch: its current permissions intentionally exclude `GM_xmlhttpRequest` and arbitrary `@connect` hosts. Native Core status is currently a Chromium/Firefox extension popup feature.

## Release discipline

- `0.10.5` is an **unpublished development candidate**; the previously uploaded `0.10.3` Firefox review stays unchanged.
- One exact SHA generates Chromium ZIP, Firefox XPI, userscript+metadata and Mozilla reviewer Source ZIP.
- No store uploads, releases, RouterForge Core changes or router actions are done by the runner.
- Future P2.2 protected module inventory requires a *separate explicit, authenticated integration contract* with Core; do not use anonymous endpoints to bypass it.
