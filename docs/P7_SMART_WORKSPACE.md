# P7 — Smart Workspace / native Keenetic launcher

## Goal
Use the existing Keenetic navigation for finding and launching Portal applications. Avoid browser-level keyboard shortcuts and duplicate status dashboards. Keep manual third-party applications independent of Core.

## Behavior

- The native Keenetic Portal menu has an explicit search button. Global `Ctrl+K`, `Cmd+K` and `Alt+Shift+K` bindings are deliberately absent: browsers and host pages own those shortcuts.
- In the opened search field, Arrow Up/Down selects applications, Enter launches the selection, and Escape closes only the drawer without closing the current embedded workspace.
- The three most recently opened applications appear at the top without duplicating their regular group entries. Recent order is session-only and cleared on logout or extension teardown.
- Manual URLs and apps imported from RouterForge Core share the same launcher and follow the user's saved open mode. New apps use embedded Keenetic mode by default.
- Direct manual URL entry and edit/delete remain available with or without RouterForge Core.

## Security and release

- No modification of Keenetic, Entware, Core, authentication cookies, profiles, browser permissions, or router API.
- No background polling or scans; no persistence of recent launches.
- P7 `0.10.12` passed local Chrome and CI. The removal of global shortcuts is part of P8 final acceptance `0.10.13`.
- Store publication and GitHub Release require separate explicit authorization.
