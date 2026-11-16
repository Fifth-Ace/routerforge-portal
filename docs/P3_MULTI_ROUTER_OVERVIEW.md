# P3 — Multi-router overview / local browser profiles

- BASE: Portal main 9896ba0b3c7020edd8593d92f7cef0b5ed7e69c6
- Candidate: 0.10.7 (no public release / no store submission)
- Overview in popup + options for up to 32 saved profiles
- Displays saved label, enabled app count, favorites count, whether tab is the current router, and whether a **locally stored** Core link exists. **None** of those badges means that the remote router is online.
- Clicking a router chooses that profile (and optionally stores its *origin only* in `rfPortalSelectedRouterV1`); no other profiles are rewritten.
- Explicit buttons to open selected Keenetic / Core; never probes or sends credentials automatically.
- Current tab wins the initial popup selection to keep the existing Keenetic injection semantics; explicitly clicked user selection takes precedence until popup closes.
- If selected router disappears, choose the current-tab router, saved selection or first remaining device; no stale Core status can be inherited.
- Pre-publication: complete **one local Chrome review of the exact ZIP** then manual approval before any GitHub write. The runner performs remaining CI and package delivery autonomously.
- No RouterForge Core, router, KeeneticOS, GitHub Release, CWS, AMO, Tampermonkey marketplace mutation.

## R2 Core-service deduplication

`http://HOST:2233` is Core, not a second device. Empty same-host legacy Core profiles are excluded from router menus but remain saved without modification. If such a profile contains applications, it remains visible under an explicit legacy label. The connect action on an open Core tab is disabled. Other hosts and management ports are untouched. Manual Chrome acceptance is required before Git.
