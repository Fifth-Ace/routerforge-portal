# P7 — Smart Workspace / native Keenetic keyboard launcher

## Goal
Make the existing Keenetic-integrated Portal menu genuinely useful for daily navigation. Do not create another status dashboard and do not limit manual third-party applications.

## Behaviour

- In an authenticated Keenetic shell, `Ctrl+K` or `Cmd+K` (fallback `Alt+Shift+K` if the browser reserves that shortcut) opens the existing Portal application search drawer and focuses the search field.
- Shortcuts do not intercept keystrokes inside input, textarea, select, editable controls, or cross-origin embedded application frames.
- The search field supports Arrow Up/Down, Enter to open the selected application, and Escape to close the drawer without closing the current application workspace.
- The three most recently opened applications appear at the top of the drawer without duplicating entries in their normal groups. Recent order is volatile and wiped on teardown/logout.
- Existing favorites and group ordering remain unchanged in the underlying profile; manual URLs and Core-sourced applications use exactly the same launcher.
- `auto` and `embedded` still open inside Keenetic. The user's explicitly selected `external` mode remains honored.
- Existing native add/edit/delete functions remain available. No Core installation required.

## Security and scope

- Does not modify Keenetic, Entware, Core, cookies, router configuration, profile schema, browser permissions, or network endpoints.
- No background polling, telemetry, service scans, or profile persistence of recent launches.
- No GitHub push or store submission before manual Chrome verification.

## Chrome acceptance

Open Keenetic with the P7 candidate loaded as an unpacked extension and verify: shortcut in the authenticated UI, search with two or more apps, arrow selection and Enter, Escape while an iframe is already open, recent list ordering without duplicates, manual URL, Core imported URL, and explicit external-mode behavior. Check RU and EN labels and collapsed Keenetic navigation. `STOP` on any regression.
