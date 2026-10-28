# RouterForge Portal v0.10.0 — native NETCRAZE integration

Chromium-only production release (Chrome / Edge / Opera). Real-world verification performed on NETCRAZE Ultra; P14 local Chromium audit additionally verified with automated mock-page tests.

- **Native responsive layout:** use actual Keenetic content bounds and observe resize/collapsed navigation; no fixed 85% width and no mandatory manual pixel offsets.
- **Workspace:** up to three cached live iframes with tab switching and cleanup on logout or return to native Keenetic pages.
- **Smart App Center:** favorites, categories, custom order, search and safe catalog quick-setup.
- **Native settings:** app editor inside Keenetic, themes and RU/EN; cleaned catalog with optional advanced settings.
- **Quality:** P14 Chromium checks, safe optional host access, preserved old config fields for lossless migration, no SDK handshake and no Keenetic history monkey-patching.
- **Documentation:** new ten-frame animated GIF captured on a real NETCRAZE Ultra, reused in both RU/EN README files.
- **Channels:** this release ships only the unpacked Chromium MV3 ZIP. Prior v0.9.0 remains intact; Firefox and userscript have not been tested for this version.

**Upgrade:** export JSON, update files in the same unpacked-extension directory, Reload in browser extensions. No router firmware or RouterForge Core changes.
