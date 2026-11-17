# Portal 2.0 — P10–P13 source implementation

BASE SHA: c9e519f8a8258f862ddcd79c347c1707127db890
VERSION: 0.11.0 (unpublished candidate)

P10 Foundation: dedicated rfPortal2Registry v1. Existing kbridgeState v1 is not rewritten; old apps are listed read-only. Multiple servers and WebUI, optional serverId, independent extension page, explicit LAN/WAN selection, no automatic secrets fallback.

P11 Vault: encrypted rfPortal2VaultEncrypted with AES-256-GCM, PBKDF2 SHA-256 (600000 iterations), independent random IV per object, authenticated binding to appId, origin, path. Session-only key lives in extension page, never sent via runtime messages or ordinary export; lock after 10min idle/reload. Encrypted export/import distinct from ordinary app registry export. Exact HTTPS only for stored credentials; browser/manual/SSO modes continue to work without Vault. Credential fill requires an explicit user button + per-site browser grant, one main-frame login form; no cross-origin redirects. Auto-submit OFF by default; for 3x-ui only, requires independent user opt-in and is disabled for detected OTP/CAPTCHA.

P12 3x-ui: fixed GET /panel/api/server/status with Bearer monitor token or pre-existing session; base path derived exclusively from the full app URL (no separate editable override); read only CPU/memory/disk/netIO/Xray. No configuration, client, inbound or login API calls. Unknown, locked, auth required, incompatible API and network failures are distinct. Real devices not queried in tests.

P13: local templates for 3x-ui/Portainer/NPM/Home Assistant/AdGuard/RouterForge and versioned descriptor API; no executable remote adapters. WebUI Doctor HEAD only, no credentials or background polling. CSP/iframe verdict UNKNOWN rather than fabricated. New App Center link is in popup and Keenetic menu. Tampermonkey/Violentmonkey keep legacy features; App Center/Vault require native extension capabilities.

SECURITY NOTES: The UI may open an external 3x-ui login page, but does not bypass 2FA/WebAuthn. An extension cannot read Chrome password-manager secrets. The browser may block framing and third-party cookies. An API token may have powerful privileges: use monitor scope, never admin. Data and passwords never belong in chat, log or source archive. Use only placeholder mock credentials in tests.

GATE: all features P10–P13 are included in candidate source before the first full npm/Chrome/CI validation. One final runner includes full tests, Chrome manual gate, one main commit and exact CI monitoring; stop at first true FAIL.

## R2 usability and 3x-ui integration corrections (2026-11-17)

- The server editor now accepts an optional first WebUI address or explicitly attaches an existing standalone app. Server and first-app changes are validated as one unit; selecting the new server immediately reveals its apps.
- App editor now uses compact primary fields and a collapsible advanced area. LAN-only URLs auto-select LAN, WAN-only URLs select WAN when the other address is empty. The 3x-ui API base is derived from the full panel URL, including custom prefixes; an override remains optional.
- Diagnostics appear on the selected app card and at the top of the App Center. HTTP 401 means authentication is required, not network failure.
- 3x-ui monitor with no token executes a single same-origin GET through an already logged-in, permission-granted browser tab on the exact panel host and base path. No cookie values are accessed or transmitted by Portal, and no background probing occurs. Alternatively store a scoped monitor Bearer token in Vault for an explicit GET.
- Vault is collapsed by default to avoid consuming the application workspace. It opens if an authenticated action needs an unlock.
- Smart Login fills supported SPA pages even when their input controls are not wrapped in an HTML form, subject to exact origin and allowed base path. MFA and challenges remain untouched; form submission stays off by default.
- Plaintext or admin credentials are NOT required for local Chrome acceptance. HTTP WebUI URLs can be saved and opened but never receive Vault secrets.
- Chrome local smoke and the full repository CI are still required. No claims of universal 3x-ui support without user-side compatibility verification.

## R3: verified Chrome issues

- 3x-ui opens in a separate browser tab regardless of saved embed mode. Browser CSP/frame-ancestors are not bypassed. Generic embedded apps remain supported.
- 3x-ui status uses one authenticated API check (token or already signed-in tab); the generic anonymous HEAD WebUI Doctor is not used for this adapter. A dashboard HEAD 404 does not invalidate an authenticated API 200.
- Pure status formatting rounds CPU to one decimal, calculates RAM/disk percentages and renders network bytes in human-readable units.
- A Standalone app now offers an explicit Create server action preselecting that existing app without changing its ID.
- Manual 3x-ui base path accepts either /secret/ or full /secret/panel/ and normalizes both to a single /secret/panel/api/server/status endpoint.
- All older Keenetic data and Vault encryption remain unchanged.

## R4: clear full URL & native servers workspace

- Server inventory is a first-class view of App Center. Direct entries: Chrome popup "Мои серверы", Keenetic main navigation "Мои серверы", and the two tabs "Мои серверы / Приложения" inside App Center. Existing storage remains unchanged; server profiles are not a network discovery result.
- The server page shows a card for each saved server with linked panels and action buttons. For a 3x-ui panel it displays CPU, RAM, disk, Xray, and traffic **only after an explicit click**. Status results are stored in ephemeral in-memory maps and disappear after page reload. No automatic refresh, no background probes, no cloud traffic.
- Separate basePath field removed. Complete panel URL (including secret path) is the single source for both navigation and API discovery. Previous registry.basePath properties are retained for backwards compatibility but ignored by the adapter. On editing an app the obsolete override is cleared; user must verify URL includes complete prefix. No automatic rewriting of old profiles.
- The generic WebUI diagnostic is an anonymous on-demand HEAD request. It cannot establish authentication, uptime or embedding permission, so its label and explanation now clarify its limited scope. 3x-ui uses authenticated status request only.
- Existing 0.10.13 Keenetic profiles remain separate read-only items; existing Vault bindings and app IDs are unaffected by merely opening the new server page.
