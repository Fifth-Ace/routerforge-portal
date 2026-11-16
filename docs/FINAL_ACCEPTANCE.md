# RouterForge Portal — Final acceptance candidate 0.10.13

Pinned repository `Fifth-Ace/routerforge-portal`, branch `main`, base `db705251884e4de352205b7a6b3f2bd205f4f90e`.

## Scope

- Remove unwanted global K shortcuts and shortcut hints; keep visible search and keyboard navigation inside the search field.
- Preserve the multi-router selector, user-managed third-party applications, safe profiles, favorites, and session recents.
- Keep authenticated, user-initiated Core catalog suggestions and imports (not a background monitoring panel).
- Keep embedded Keenetic as the default. An external tab is opened only for a user-configured external mode or a deliberate separate-open action.
- Keep Chrome MV3, Firefox, Userscript, and Mozilla source-package generation in sync.

## Manual Chrome acceptance before Git push

1. Install the unpacked candidate from the exact generated Chromium ZIP in an isolated Chrome profile.
2. Open authenticated Keenetic, use the visible Portal search button, and confirm it focuses the search field.
3. Confirm browser `Ctrl+K` behaves as the browser chooses; Portal does not attach global K shortcuts.
4. In the search field, use Arrow Up/Down, Enter and Escape; Escape must not close an already open embedded app.
5. Confirm the recent-apps section contains no more than three unique apps in the current session.
6. Open a manual third-party app with an arbitrary HTTP/HTTPS port; Core may be absent.
7. With optional Core available and linked, preview and import catalogue apps without altering manual entries.
8. Confirm embedded-by-default and the explicit external mode. Check both expanded and collapsed sidebar.
9. Verify RU/EN labels, saved profiles, no unexpected host API changes, and no console errors.

Only after explicit LOCAL_CHROME_PASS: one GitHub main commit, push, exact-run live CI verification, local delivery of six store candidates and checksums.

## Not authorized by this package

- Publishing to Chrome Web Store or Mozilla Add-ons.
- Creating GitHub Release or updating live userscripts.
- Deploying or modifying RouterForge Core, Keenetic, Entware, or router configuration.
- Changing permissions, credentials, router profiles or any network endpoint.
