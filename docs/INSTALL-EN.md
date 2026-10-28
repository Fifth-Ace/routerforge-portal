# RouterForge Portal v0.10.2 — multichannel setup

**Current release:** https://github.com/Fifth-Ace/routerforge-portal/releases/tag/v0.10.2

1. Download `routerforge-portal-chromium-v0.10.2.zip` and verify SHA-256 against the release checksum file.
2. Extract it to a stable folder with `manifest.json` at the root.
3. In Chrome / Edge / Opera, open Extensions, enable Developer Mode and choose **Load unpacked**.
4. Sign in to Keenetic / NETCRAZE and grant access to the router address when asked.
5. Configure known apps inside Portal. If framing is forbidden by CSP/X-Frame-Options, choose the external-tab opening mode.

## Updating from v0.9.0 or a local P14 build

Export profiles to JSON before upgrading. Back up your existing unpacked extension folder, overwrite files in that **same** folder and click **Reload** in Extensions. Do not activate two copies of Portal on the same router. If the browser changes the extension ID, import your saved JSON. Restore your old folder to roll back.

v0.10.2 also publishes the userscript and metadata (Tampermonkey/Violentmonkey) and an UNSIGNED-DEV Firefox XPI (temporary testing only; use the userscript for regular Firefox). After JSON import in native extension, use Grant access and reload tab in the Portal popup if site permissions are missing.
