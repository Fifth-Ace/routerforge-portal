# RouterForge Portal — P4 UX / Local-first acceptance

Base: 470a0b9d25d6acc15e44948ae7e5038dbfb99460 (main)
Target: 0.10.8 (candidate only; **not a store release**)

## Scope

1. Popup: router list and Core panel are `<details>` controls. Collapsed by default to keep the toolbar compact. The two panels still expose the exact same actions and selected-router state.
2. Popup: local `All / Favorites` filter only affects presentation; no app or profile is written.
3. Options: explicit rename of a saved router, preserving origin, apps, theme and Core link.
4. Options: explicit default router saved independently of the last selection. Active Keenetic tab still wins when popup initially opens.
5. Import: default mode is **add new router profiles only**. Existing profiles and app configurations cannot be overwritten in this mode, including duplicate origins. Explicit **replace all** still exists with a prominent confirmation. Browser permissions are never imported or granted automatically.
6. CSS: avoid nested scrollbars in compact panels; one popup scrollbar remains for the overall window.
7. Fix stale displayed version in Options header using runtime version.

## Local Chrome verification before GitHub

- Open `chrome://extensions`, Developer Mode, Load unpacked using the exact tested folder.
- Check 2+ real router profiles (and a Core :2233 legacy alias). The latter must not become a new router when its old profile is empty.
- Popup should initially show compact collapsed `All routers` and `RouterForge Core`. Expand both; the existing Core health, module, local link and app suggestion controls must still work.
- Mark favorites in Options; toggle `Favorites` in popup. Applications must never be removed or modified by filtering.
- Rename one router; verify its address, Core association, apps and per-router theme unchanged.
- Set a **default router**. Open popup from an unrelated tab; confirm default is selected. Open a saved router's Keenetic tab; that router should win initial selection.
- Export configuration JSON, import a second profile using default **merge** mode: old profile untouched. Import a backup with an existing profile only: show an error, not overwrite. Select **replace all** only if intentionally testing on disposable profiles.
- Confirm RU/EN and extension errors panel. No automatic router requests or writes.

Only if everything works, type `LOCAL_CHROME_PASS`; else `STOP`. GitHub is untouched until explicit approval.

## Release freeze

No GitHub Release, no Chrome Web Store upload, no Firefox AMO upload, no userscript publishing, no changes to RouterForge Core or any router.
