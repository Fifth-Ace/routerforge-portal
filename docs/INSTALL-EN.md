# Install RouterForge Portal 1.0.0

**Website:** https://fifth-ace.github.io/routerforge-portal/
**Chrome Web Store:** https://chromewebstore.google.com/detail/ikghhhcbgfepddcjammfhaeomohfajij
**Firefox Add-ons:** https://addons.mozilla.org/ru/firefox/addon/routerforge-portal/
**GitHub Release:** https://github.com/Fifth-Ace/routerforge-portal/releases/tag/v1.0.0

## Google Chrome — store install

Open [Portal in Chrome Web Store](https://chromewebstore.google.com/detail/ikghhhcbgfepddcjammfhaeomohfajij) and install the extension. The store manages updates. **GitHub v1.0.0 is published, but the 1.0.0 store update may appear later following a separate review.**

## Edge, Brave, Opera, Vivaldi — Chromium

Use Chrome Web Store where supported, or download [Chromium ZIP v1.0.0](https://github.com/Fifth-Ace/routerforge-portal/releases/download/v1.0.0/routerforge-portal-chromium-v1.0.0.zip). Verify the [SHA256 checksums](https://github.com/Fifth-Ace/routerforge-portal/releases/download/v1.0.0/SHA256SUMS.txt), extract to a permanent folder, and choose **Load unpacked** in your browser's extension Developer Mode. The chosen folder must contain `manifest.json` at its root.

## Firefox — Mozilla Add-ons

Install [RouterForge Portal from Mozilla Add-ons](https://addons.mozilla.org/ru/firefox/addon/routerforge-portal/). Firefox installs the signed add-on and handles updates. The `UNSIGNED-DEV` XPI on GitHub is for development only.

## Tampermonkey / Violentmonkey

Install a script manager and open [routerforge-portal.user.js](https://github.com/Fifth-Ace/routerforge-portal/releases/download/v1.0.0/routerforge-portal.user.js). The userscript provides Keenetic WebUI app navigation. **Remote servers, Portal Vault and 3x-ui monitoring require the native extension**.

## Updating safely

- **Do not uninstall your existing extension** before updating: this may remove local browser storage.
- Before switching between store and unpacked channels, create a **full encrypted backup**. Extension IDs and storage may differ.
- Avoid enabling both the native extension and userscript on the same Keenetic page.
- Grant browser host permissions only for trusted router/server addresses.
- Portal can store user-provided credentials **encrypted in a local Vault**, without sending them to the developer. See [Privacy](../PRIVACY.md).
