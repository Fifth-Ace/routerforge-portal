# RouterForge Portal v0.9.0 — GitHub-first, four browsers

First community distribution model inspired by voice-over-translation: no Chrome/Edge/Opera/Firefox store accounts required for the userscript channel.

- **Tampermonkey / Violentmonkey**: `routerforge-portal.user.js` + `.meta.js` with GitHub Releases update metadata.
- **Chrome / Edge / Opera**: `routerforge-portal-chromium-v0.9.0.zip`, Load unpacked.
- **Firefox native**: `routerforge-portal-firefox-UNSIGNED-DEV-v0.9.0.xpi` for temporary development only; permanent Firefox installation requires Mozilla signature.
- **Security**: on-router auth gate, narrow userscript scope, optional extension host grants; build attestations generated for release artifacts; repeatable multi-browser packages; no hidden installer.
- **Migrating from older versions**: JSON export/import; do not enable userscript and native extension on the same Keenetic page.

RouterForge Core, Beta/Stable/Dev and KeeneticOS are never modified.
