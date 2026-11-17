# RouterForge Portal — сайт и публикация / Site and release operations

## Репозиторий / Repository

- Source: `Fifth-Ace/routerforge-portal`; production source: `main`.
- **Immutable stable release:** [v1.0.0](https://github.com/Fifth-Ace/routerforge-portal/releases/tag/v1.0.0). This site/docs update **does not move the tag**, replace release assets, or change extension runtime/permissions.
- [Chrome Web Store](https://chromewebstore.google.com/detail/ikghhhcbgfepddcjammfhaeomohfajij): listing live; its v1.0.0 update has a separate review cycle.
- [GitHub Pages](https://fifth-ace.github.io/routerforge-portal/): static bilingual landing page.
- Native Firefox extension: AMO review pending; GitHub XPI is unsigned/development only.
- Tampermonkey/Violentmonkey: [userscript from v1.0.0](https://github.com/Fifth-Ace/routerforge-portal/releases/download/v1.0.0/routerforge-portal.user.js), Keenetic WebUI integration only.

## Website pipeline / GitHub Pages

1. Edit `site/index.html`, `site/styles.css`, `site/app.js`; shared media comes from `assets/` and `docs/screenshots/`.
2. Run `python tests/test_site.py`, `npm run lint`, `npm test`, `python tools/security_gate.py`. This is a docs/site-only change, but no gates are bypassed.
3. Commit and push to `main` only after tests pass. `.github/workflows/ci.yml` validates the exact commit.
4. `.github/workflows/pages.yml` runs after a successful push CI (`workflow_run`). It gates exact CI Run ID, the verified commit SHA and `main` head, then deploys via official Pages Actions.
5. Watch CI and Pages using exact Run IDs. **Do not claim the website is live until Pages deploy succeeds.**

## Browser channels

- Chrome Web Store updates are a distinct store submission, not triggered by a GitHub Pages change.
- Edge/Opera/Brave/Vivaldi can use the manual GitHub Chromium ZIP where supported.
- Firefox AMO submission is external to GitHub Actions and is not represented by the GitHub `UNSIGNED-DEV.xpi` asset.
- Store and unpacked installs may have separate extension IDs and local storage; recommend an encrypted backup before switching.
- The userscript and native extension should not both be active on one router page.

## Security / publishing policy

Never rerun historical repository bootstrap scripts. This documentation update must not change release tags, branch history, GitHub Release assets, native extension code, browser store submissions, KeeneticOS, RouterForge Core or VPS. Keep actual connection secrets out of docs, GitHub issues and screenshots. See `PRIVACY.md` and `SECURITY.md`.
