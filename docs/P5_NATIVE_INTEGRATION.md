# RouterForge Portal P5 — native Keenetic launcher

Status: local Chrome acceptance required. Target: 0.10.9. Pinned base: `8ef375079e4a0a3d1174f36b1241a87931273d7c` on main.

## Must work WITHOUT RouterForge Core

- On each saved Keenetic profile: a visible `+ Добавить веб-приложение` in the native left menu and the app drawer.
- Manual app URL can be any valid `http://` or `https://` origin including custom domain, port, and path, subject to browser security/iframe policies.
- Add/edit/delete/favorite/group still owned by local per-router profile. No Core needed. Existing custom URLs and groups are never changed by this patch.
- Native drawer searches installed user app names, group titles, and URLs. No remote queries or indexing.
- The compact rail opens the drawer, which now contains search and manual add.
- Popup has only one router picker: collapsible router overview; legacy `<select>` retained hidden for internal compatibility.

## Optional RouterForge Core

- P2.2–P2.4 protected catalog and manual user-approved suggestions stay available, but do not replace manual apps.
- Automatic sync and native-per-module routing require P6 authenticated API contract; NOT included or claimed in P5.
- No extension password collection, no cookies extracted, no auth bypass, no new `host_permissions`.

## User acceptance

1. Open Keenetic WebUI with a saved profile and see native menu: Find and Add actions.
2. Add `My test app` with an arbitrary valid HTTP(S) address and nonstandard port; see it in Keenetic navigation without opening extension settings.
3. Search the app by name and URL in drawer, open in workspace or separate tab based on app mode, and close without changing Keenetic.
4. Test with a router that has NO Core. All manual functions must still work.
5. Test a router WITH Core; manually added apps continue working and optional Core suggestions remain optional.
6. Verify compact icon rail, groups/favorites, theme RU/EN, switched router, and no duplicated selection dropdown in popup.
7. For sites refusing framing (CSP / X-Frame-Options), use open-in-new-tab; do not bypass.
8. Only after approval, type `LOCAL_CHROME_PASS` in the same runner console.

No release, browser-store upload, core/firmware changes, or router operations.
