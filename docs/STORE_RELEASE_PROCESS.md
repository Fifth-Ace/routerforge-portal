# RouterForge Portal — Chrome Web Store + Firefox AMO

One source revision, one version, distinct store packages.

## Release gates

1. Work only in `Fifth-Ace/routerforge-portal`; `RouterForge Core`, KeeneticOS, Entware and router state are out of scope.
2. Commit the complete cross-browser feature in `main`, then wait for the exact push CI to pass.
3. Build from that **exact SHA** with `python tools/build_store_candidates.py`. The tool builds Chromium and Firefox from the same tree, copies the upload-ready packages, creates a reproducible AMO source ZIP, and outputs SHA256 checksums.
4. Upload `routerforge-portal-chrome-web-store-vX.Y.Z.zip` to the existing Chrome Web Store item (extension ID `ikghhhcbgfepddcjammfhaeomohfajij`).
5. Upload `routerforge-portal-firefox-vX.Y.Z.xpi` to Mozilla Add-ons and **the matching** `RouterForge_Portal_AMO_SOURCE_vX.Y.Z.zip` as reviewer sources. Keep Firefox extension ID `routerforge-portal@fifth-ace.github.io` unchanged. Mozilla must approve the existing 0.10.3 submission first; do not accidentally replace a pending submission.
6. Submit each store update for review manually. Neither this script nor the main repository CI uploads or publishes to stores, creates a GitHub release, or stores browser-marketplace credentials.
7. When both stores publish the new version, update public download links and release notes; browser stores handle signed auto-updates.

## Safety

- Store users must never be told to download and install a GitHub ZIP over the store extension. The Portal shows the native update-channel notice instead.
- Manually installed Chrome/Edge/Opera ZIP remains eligible for the existing verified GitHub manual-update flow.
- No new permissions, background network polling, remote control, router mutation or telemetry are introduced in this phase.
- Firefox AMO source submission is not the source ZIP from GitHub main at an arbitrary time: it must be generated from the precise commit of the corresponding XPI.
