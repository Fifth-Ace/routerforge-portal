# Windows 10/11 · Chrome / Edge

## Initial installation

1. Download the **official** release's `routerforge-portal-vX.Y.Z-install.zip` from `https://github.com/Fifth-Ace/routerforge-portal/releases`.
2. Use the trusted `Install-RouterForgePortal.ps1` script from the same pinned source tree, ideally via `gh` provenance verification. When online, it fetches and checks the newest stable release (requires GitHub CLI `gh`).
3. Unpack into a permanent location. Enable browser Developer Mode and select **Load unpacked** to point at the directory containing `manifest.json`.
4. Grant only the router host(s) you administer via extension UI. No password should be put into app URLs.

## Updates

Run `Install-RouterForgePortal.ps1 -ChooseExisting` using Windows PowerShell 5.1, select the existing installed folder. The installer stops on failed attestation or digest, makes an adjacent timestamped backup and verifies after the directory swap. Then Reload in the extensions manager and Ctrl+F5 in Keenetic.

## Important

Do not delete/reinstall an unpacked extension or change its unpacked path if you want to preserve its browser extension ID and storage. The installer does not touch browser policy, operating system registry or router files.
