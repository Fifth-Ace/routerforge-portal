# RouterForge Portal v0.9.0 — multi-browser distributions

**Current release:** https://github.com/Fifth-Ace/routerforge-portal/releases/tag/v0.9.0

- **Recommended for all four browsers:** Install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/), then open [routerforge-portal.user.js](https://github.com/Fifth-Ace/routerforge-portal/releases/latest/download/routerforge-portal.user.js). Confirm installation or import the downloaded file from the manager dashboard. Recent Chromium may require **Allow User Scripts**.
- **Chrome/Edge native:** unzip `routerforge-portal-chromium-v0.9.0.zip`, load the unpacked directory from `chrome://extensions` or `edge://extensions` using Developer mode.
- Opera: install `routerforge-portal.user.js` via Tampermonkey/Violentmonkey; alternatively load the unpacked Chromium ZIP via `opera://extensions` Developer Mode.
- Firefox: install `routerforge-portal.user.js` via Tampermonkey/Violentmonkey. The provided `firefox-UNSIGNED-DEV` XPI is only for temporary developer testing; Firefox Release requires Mozilla-signed XPI for permanent native installation.
- Do not run both userscript and native extension against the same router page. Import/export JSON to migrate settings.
- GitHub userscript automatic update URLs will start working after the first tagged GitHub Release. Userscript manager automatic updates are not equivalent to signed GitHub build attestations.
