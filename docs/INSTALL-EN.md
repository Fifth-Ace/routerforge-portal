# RouterForge Portal v0.10.0 — Chromium setup

**Current release:** https://github.com/Fifth-Ace/routerforge-portal/releases/tag/v0.10.0

1. Download `routerforge-portal-chromium-v0.10.0.zip` and verify SHA-256 against the release checksum file.
2. Extract it to a stable folder with `manifest.json` at the root.
3. In Chrome / Edge / Opera, open Extensions, enable Developer Mode and choose **Load unpacked**.
4. Sign in to Keenetic / NETCRAZE and grant access to the router address when asked.
5. Configure known apps inside Portal. If framing is forbidden by CSP/X-Frame-Options, choose the external-tab opening mode.

## Updating from v0.9.0 or a local P14 build

Export profiles to JSON before upgrading. Back up your existing unpacked extension folder, overwrite files in that **same** folder and click **Reload** in Extensions. Do not activate two copies of Portal on the same router. If the browser changes the extension ID, import your saved JSON. Restore your old folder to roll back.

Firefox and userscript channels have not been QA-tested or published for v0.10.0. Historical v0.9.0 assets remain available in its release.
