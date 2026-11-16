# P6 — RouterForge Core catalogue → Portal native Keenetic menu

Base: `Fifth-Ace/routerforge-portal` `main` `35677764a6725fabaaba24c9ea1eaebb839c0257`
Target: `0.10.11` (candidate). Core source reviewed at `Fifth-Ace/routerforge` `dev` `23d28a06aaf40040cf633064a61a219597510aeb` (read-only).

## What the user gets

The Portal menu is fully useful without Core: manual HTTP(S) apps, custom ports, groups, favorites and saved open modes are unchanged.

With **an already locally linked Core**, an **open signed-in Core tab**, and **browser access granted for Core**, open Keenetic → Portal Applications → Settings → **Import from RouterForge Core** → **Get Core apps**. See installed modules and integration Web UIs with explicit `web.scheme`, `web.port`, `web.path` metadata. Import an individual entry or all proposed entries after confirmation. Imported apps default to `auto` (embedded Keenetic). No automatic installs or removals. Existing apps are never modified or deleted.

## Security boundary

1. Portal does **not** request credentials, read cookies, disable authentication, create an API token, or expose Core controls. Existing Core `/api/catalog` authorization remains authoritative.
2. The background verifies the sender is the saved physical router tab, stored `coreLink` matches `http://<router-host>:2233`, Core host permission was granted, and the Core tab is already open.
3. Fetch is performed by a bounded **same-origin GET** in that Core tab (existing session), with `redirect:'error'`, JSON validation, timeout, 2 MiB limit and a strict display-field allowlist.
4. Candidate web URLs are reconstructed **only** from the selected physical router hostname, explicit HTTP(S) scheme / port / safe path, never from a supplied external host.
5. Preview does not write to storage. Import requires explicit user confirmation, re-reads Core and latest browser state, rejects stale/duplicate selections and the 100-app limit, and only appends new entries.
6. No background scans, polling, router config updates, installs, API POSTs, store uploads, or GitHub Releases.
7. Service worker supports Chrome/Firefox browsers. Existing userscript manual-app functionality is unaffected; cross-origin privileged Core import is not presented as a userscript feature.

## UX acceptance

- Router with no Core: manual add arbitrary `http://host:port/path`, launch inside Keenetic — PASS.
- Router with Core: link Core once in Portal; open/login to `:2233`; native Settings → Get Core apps — shows actual installed Web UIs.
- Import one or all: only selected new entries are appended; mode `auto`; no rewritten favorites, URLs or custom ports.
- Reimport: duplicates blocked. Switching routers: Core link and catalog bound to the exact saved router.
- Missing Core / missing permission / logged out / stale selection: actionable localized error, **no write**.
- Browser and source distribution after tested Chrome Gate; no store uploads.

## Compatibility limitation

Core catalog `web` metadata describes local web panels only. It is not a secure remote management or service-proxy capability. Authenticated embedding still depends on the target panel's own CSP, frame and cookie policies; Portal cannot bypass them.
