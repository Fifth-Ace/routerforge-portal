# RouterForge Portal v0.9.0 — multi-browser distributions

Until the first GitHub Release is published, direct install links will be unavailable. Use the README links after publication.

- Chrome/Edge: unzip `routerforge-portal-chromium-v0.9.0.zip`, load the unpacked directory from `chrome://extensions` or `edge://extensions` using Developer mode.
- Opera: install `routerforge-portal.user.js` via Tampermonkey/Violentmonkey; alternatively load the unpacked Chromium ZIP via `opera://extensions` Developer Mode.
- Firefox: install `routerforge-portal.user.js` via Tampermonkey/Violentmonkey. The provided `firefox-UNSIGNED-DEV` XPI is only for temporary developer testing; Firefox Release requires Mozilla-signed XPI for permanent native installation.
- Do not run both userscript and native extension against the same router page. Import/export JSON to migrate settings.
- GitHub userscript automatic update URLs will start working after the first tagged GitHub Release. Userscript manager automatic updates are not equivalent to signed GitHub build attestations.
