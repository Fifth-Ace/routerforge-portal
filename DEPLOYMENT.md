# RouterForge Portal — publishing contract / Контракт публикации

## One-shot pipeline

1. Run `Publish-RouterForgePortal.ps1` from the **new source tree only** under the authorized Fifth-Ace account. It refuses if the target repository exists.
2. PRECHECK checks GitHub account, intended files and destination; a new PUBLIC repository is created at `Fifth-Ace/routerforge-portal`, and exact `main` SHA is recorded.
3. On the new commit, CI verifies JS, 25 Node tests, static security rules, both channels and deterministic hashes. Exact CI Run ID is watched live.
4. After CI PASS, publisher enables GitHub immutable releases via the official REST API and reads the setting back. Any failure stops before tagging.
5. It creates exact tag `v0.9.0` at verified main, dispatches `release.yml` with `return_run_details=true`, and watches exact Release Run ID live.
6. The release workflow checks the tag, builds all packages, generates GitHub Actions attestations, creates draft with all assets and publishes it (immutable).
7. The publisher downloads the assets, verifies the release attestation, every SHA256 and all four provenance attestations; then prints PASS.

## Distribution

GitHub first. Userscript is recommended for Firefox, available for Tampermonkey/Violentmonkey on all browsers; Chromium ZIP uses Load unpacked. Unsigned Firefox XPI is development-only. Do not advertise native Firefox one-click install. Browser stores NOT published.

## Constraints

- Do not touch `Fifth-Ace/routerforge`, RouterForge Core, KeeneticOS, WAN/VPN services, or any device.
- No GitHub release tag is created unless exact commit CI has passed and release immutability is enabled.
- Never auto-retry a failure after a partial push/tag/release. Diagnose exact SHA/Run ID.
- Browser source does not auto-execute remote JavaScript. Tampermonkey's normal auto-updates are separate from the attested native package verification.
- Windows command sequence is compatible with PowerShell 5.1, but must be verified on user's actual Windows: the local build environment does not have `gh` or PowerShell.
