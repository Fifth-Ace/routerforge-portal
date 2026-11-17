# RouterForge Portal — P100 First Stable Release

**Source baseline:** Fifth-Ace/routerforge-portal `main` at `c9e519f8a8258f862ddcd79c347c1707127db890`.
**Candidate:** `1.0.0`. This handoff is read-only for remote systems and only writes into an isolated local clone and Downloads.

## Acceptance gates

1. PRECHECK: verify pinned main SHA; validate all payload SHA256 and installed build tools.
2. ACTION: apply R4 through R5.9 exactly once, then feature-frozen P100 transform.
3. GATES: run npm lint, all npm tests, JavaScript syntax, security gate, site checks and build/package.
4. VERIFY: inspect Chromium ZIP and unsigned Firefox XPI, parse both manifests, check version 1.0.0, ensure encrypted backup/Vault modules are present, calculate SHA256.
5. RESULT: PASS only after all gates and the required artifacts exist; else stop at first failure and keep diagnostic evidence.

## Human acceptance before release

- Upgrade an existing installed extension *without uninstalling*. Keenetic profile, applications, servers, Vault and monitoring remain available.
- Open/lock Vault using the restored master password; monitor site-permission errors are separate.
- Full encrypted export/import in a sacrificial test profile; check RU/EN, web panel URLs, no secrets in Keenetic DOM.
- Validate both main tabs, native Keenetic server menu and responsive app row layout.
- Firefox: test unsigned XPI locally only if browser supports developer loading; wait for current AMO review rather than resetting its queue.

## Publishing policy

No publication, remote branch changes, live router/VPS actions, Chrome Web Store or Mozilla uploads in this package. Publish `v1.0.0` only after explicit go-ahead and confirmed acceptance.
