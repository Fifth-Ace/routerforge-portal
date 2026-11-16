# RouterForge Portal P2.2 — Read-only module status

Base SHA: 781d5a6828cffe31671261cf9f70fb50155f82e4
Version candidate: 0.10.6

Only on user click, from an already open Core tab at the selected router's host:2233, use GET /api/catalog with the Core tab's existing same-origin session. The extension does not access session tokens or passwords, and never writes to Core. The existing /api/health card remains independent and credential-free.

- If the Core tab is missing, open Core and sign in; then click "Module status" again.
- Auth 401/403: show "Sign in to Core tab" and never bypass the gate.
- No scanning, background polling, external access or router change.
- Installed modules display as running, installed, or disabled; service_running is not guessed from package presence.
- Firefox uses the same native MV3 code; userscript is rebuilt from the shared source without adding cross-origin privileges.
- Local Chrome manual gate precedes Git commit/push. Existing extension/store identifiers are not changed.
