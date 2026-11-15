# RouterForge Portal — публикация и сопровождение / Publishing & maintenance

## Репозиторий / Repository

- Source: `Fifth-Ace/routerforge-portal`, development branch `main`.
- Browser source, permissions, `manifest.json` and current release `v0.10.3` are **not modified** by the website patch.
- Chrome Web Store: https://chromewebstore.google.com/detail/ikghhhcbgfepddcjammfhaeomohfajij
- Static site: https://fifth-ace.github.io/routerforge-portal/
- Release downloads: https://github.com/Fifth-Ace/routerforge-portal/releases/latest
- RU/EN user guides: `docs/INSTALL-RU.md`, `docs/INSTALL-EN.md`; privacy and security: `PRIVACY.md`, `SECURITY.md`.

## Website pipeline (GitHub Pages)

1. Source lives in `site/` (HTML, CSS, JS); images are reused from `assets/` and `docs/screenshots/`.
2. Run `python tests/test_site.py` to check internal links, store ID, bilingual UI and image sources. `npm run lint`, `npm test` and `python tools/security_gate.py` continue to guard the extension.
3. `.github/workflows/ci.yml` runs for a commit on `main` (as before).
4. `.github/workflows/pages.yml` triggers **only after successful push CI** (`workflow_run`). It checks out the CI's exact commit SHA, assembles static files without external build tools and deploys through official GitHub Pages Actions.
5. GitHub Pages must be enabled under **Settings → Pages → Build and deployment → GitHub Actions**. The one-shot PowerShell runner attempts to configure this via GitHub API before pushing, or stops without pushing if permissions are insufficient.
6. Check the GitHub Actions CI and Pages runs for the exact commit. Do not assert the site is live before the Pages deployment succeeds.

## Browser distribution

- **Chrome:** the verified store URL above is the primary install channel; Chrome Web Store handles store-extension updates.
- **Edge / Opera:** `v0.10.3` Chromium ZIP from GitHub Releases is the manual channel; no store publication is claimed for these browsers.
- **Firefox:** Tampermonkey / Violentmonkey userscript from GitHub Releases. `UNSIGNED-DEV.xpi` is **not** a signed permanent-install Firefox release.
- Store installs and unpacked ZIP installs can have different extension IDs and separate local storage. Tell users to export JSON before changing channels and never enable both at once.

## Release discipline

The historical `Publish-RouterForgePortal.ps1` is a **one-time repository bootstrap** and must not be rerun in an existing repository. Do not create tags, releases, modify extension permissions, or publish store uploads as part of site maintenance. Browser extension releases require a distinct explicit approval and verified CI/release provenance.

## Integration next phase / Следующий этап

Treat RouterForge Portal as independently useful without Core. Any future RouterForge Core link is opt-in, local, read-only by default; no scanning local networks, credential collection, remote relay or silent configuration changes.
