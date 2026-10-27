# Security model and release policy

## Threat model

RouterForge Portal may read or write only local browser state, extend previously authorized router WebUI DOM and display URLs that the user has configured. The native router login is authoritative; the Portal menu does not authenticate third-party apps. Treat added URLs as trusted admin endpoints; loading a third-party app inside iframe does not make that app safe.

### Boundaries

- Manifest V3 with `storage`, `scripting`, `activeTab` and **optional** per-origin host permission requests. Browser permission host match patterns include all ports on granted hosts.
- No remote JavaScript, dynamic evaluation, embedded tracking, unattended scans or automatic package installation.
- GitHub API check is user-initiated, no cookies, rejects redirects, unexpected URLs, missing digests, prereleases and oversized metadata.
- Install script only updates a user-selected unpacked directory with a recognized manifest. All content hashes checked before and after replacement; backup and rollback on failure.
- Installer network path runs `gh attestation verify` against exact `Fifth-Ace/routerforge-portal`, `.github/workflows/release.yml` and `refs/tags/vX.Y.Z` prior to unpacking; it also calls `gh release verify` to require an immutable release.
- Attestations prove what workflow produced the bytes, not that the code is free from vulnerabilities; maintainers must review tags and CI. Compromise of source/workflow permissions remains a risk.

### Release checklist

1. New `main` PR with green CI and reviewed diff. Do not commit secrets, token dumps, HAR or router credentials.
2. Pin workflow actions to reviewed full commit hashes. Prefer GitHub environment / tag protections.
3. **Before the first tag**, in repo Settings → General → Releases, enable **release immutability** (it applies to future releases only).
4. Push a version tag only after green `main` CI. The tag-triggered workflow tests, packages, attests and publishes once. Never overwrite existing release.
5. Verify `gh attestation verify <zip> -R Fifth-Ace/routerforge-portal --signer-workflow Fifth-Ace/routerforge-portal/.github/workflows/release.yml --source-ref refs/tags/vX.Y.Z` and `gh release verify vX.Y.Z` (requires release immutability).
6. Ensure downloads are from a GitHub release whose owner matches `Fifth-Ace` and not from forks, discussions or attachments.

## Reporting

Open a private security advisory in the repository (Security → Advisories), if available. Do not attach credentials to public issues.
