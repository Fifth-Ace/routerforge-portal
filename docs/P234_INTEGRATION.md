# RouterForge Portal P2.2–P2.4 — Core local integration

Base: Fifth-Ace/routerforge-portal main `781d5a6828cffe31671261cf9f70fb50155f82e4`.
Candidate: v0.10.6. Scope: native Chromium/Firefox UI plus unchanged userscript distribution flow.

## P2.2 Module status

Only by explicit user click. Browser permission is granted for exactly the selected Core host. Portal looks for an already-open `http://<router-host>:2233` tab and executes one same-origin authenticated GET `/api/catalog` in that tab. No remote account, login endpoint, cookie extraction, background polling or Core mutation. 401/403 stays blocked. Show installed module names, versions, service_running and disabled states. Switching routers resets results.

## P2.3 Opt-in local link

After a successful current-tab Core catalog read, user must explicitly confirm local association. Store only the expected `http://<router-host>:2233` origin in the selected router profile. This is a user consent marker, **not proof of remote ownership or authentication**. No credentials or tokens are stored. The existing Core security configuration is unchanged.

## P2.4 Safe web-app suggestions

Read-only API catalog returns `modules` and `integrations`. Suggest ONLY installed entries with explicit bounded web metadata (`scheme` HTTP(S), port 1–65535 and safe local web path). Construct URLs using the selected router's hostname, never a network-supplied hostname, redirect or guessed port. Do not offer apps already present by URL/source marker. Suggestion requires successful on-demand catalog read and local association. Clicking `Add` adds exactly one app to the selected RouterForge Portal profile; existing apps/presets/settings/ports/favorites stay unchanged. No installs or router updates.

## Gates and publication freeze

Local source patch + tests + Chromium/Firefox/userscript/AMO build → real Chrome human acceptance `LOCAL_CHROME_PASS` → one commit/push to `main` → exact CI live watch → immutable candidate ZIPs copied into their own SHA-named Downloads folder. No release, browser marketplace submission or router action before overall master plan closes. Firefox Mozilla 0.10.3 submission remains untouched.

## Limitations

- Firefox native is built from same source, but must be manually smoke-tested before store release.
- Userscript is still rebuilt and tested; it does not receive the native popup's authenticated API integration or new cross-origin privileges.
- Core's existing HTTP port 2233 is used; remote/cloud ownership verification remains a later separate project.
