# Updating RouterForge Portal

- Chrome/Edge regular desktop users use **unpacked** mode. First installation: Settings → Extensions → Developer Mode → Load unpacked.
- Check for updates in Portal manually. Do not treat the displayed SHA256 alone as a trusted signature.
- For safe online updates, use the checked-in `Install-RouterForgePortal.ps1` from a locally trusted source: it fetches the exact public GitHub Release and checks its SHA256 **and the Sigstore GitHub Actions attestation plus immutable-release signature** with `gh attestation verify` before installing anything.
- `gh` (GitHub CLI) must be installed for authenticated provenance verification; it can verify public attestations without a personal token.
- For offline installation, supply `-OfflineZip <file> -ExpectedSHA256 <independently validated hash>` and understand this only pins the bytes, not their provenance.
- The updater safely keeps a backup and performs rollback on failure. Then the user manually reloads the extension in `chrome://extensions` or `edge://extensions` and reloads the Keenetic browser tab.
- Do not run scripts pasted from unrelated websites, force-install through registry, disable browser verification or use CRX for unsupported installation flows.
