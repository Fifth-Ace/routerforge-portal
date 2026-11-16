# RouterForge Portal — Firefox Add-ons source build instructions

This archive contains the **original, unminified extension source**, not the built XPI. There are no bundled third-party frameworks, remote JavaScript, transpilers, minifiers or generated application sources.

## Exact version and toolchain

- Extension version: **0.10.13**.
- Supported build systems: Windows 10/11 (PowerShell 5.1) or Linux (Ubuntu 24.04 tested in CI).
- **Python 3.12.x** (reference machine: Python 3.12.10): <https://www.python.org/downloads/>. Ensure `python` or `python3` works in PATH.
- **Node.js 26.x** (reference machine: Node v26.11.1): <https://nodejs.org/en/download>. Ensure `node` works in PATH. The builder uses Node's built-in JavaScript parser, not npm packages.
- Standard Python 3 modules only; **no pip install, no npm install and no package-lock.json** are required. `package.json` defines only built-in `node --test` and `node --check` commands.
- No network requests are made by the build.

## Reproduce the exact submitted unsigned XPI

1. Extract the source ZIP completely, preserving the directory structure; `manifest.json` must be in the root.
2. Install Python and Node as listed above; check `python --version` or `python3 --version`, and `node --version`.
3. From the **source archive root** run:
   ```sh
   python tools/build_channels.py
   ```
   On Linux, `python3 tools/build_channels.py` is equivalent.
4. The original browser-agnostic JS/CSS/HTML files are packaged byte-for-byte. The Firefox-specific `manifest.json` is built from the root manifest using `tools/build_channels.py`. The builder also invokes `tools/package_release.py` and `tools/build_userscript.py` from the same source tree.
5. The Firefox output is:
   `release/routerforge-portal-firefox-UNSIGNED-DEV-v0.10.13.xpi`
   This is the **same XPI payload** submitted to AMO as `routerforge-portal-firefox-v0.10.13.xpi` (the filename is irrelevant to package contents).
6. Verify the built XPI against the SHA256 in `AMO_EXPECTED_XPI_SHA256.txt` inside this archive. Examples:
   ```sh
   python -c "import hashlib,pathlib; p=pathlib.Path('release/routerforge-portal-firefox-UNSIGNED-DEV-v0.10.13.xpi'); print(hashlib.sha256(p.read_bytes()).hexdigest())"
   ```
   On Windows the equivalent is `Get-FileHash -Algorithm SHA256 release\routerforge-portal-firefox-UNSIGNED-DEV-v0.10.13.xpi`.
7. Optional checks: `npm test`, `npm run lint`, `python tools/security_gate.py`, `python tests/test_channels.py` (after building).

## Key source files

`background.js`, `popup.js`, `options.js`, `content/bridge.js`, `content/bridge.css`, `shared/*.js`, `manifest.json`, `assets/`, and `_locales/` are the human-authored source/assets. They are not minified or transformed. `tools/build_channels.py` changes only Firefox-specific manifest metadata, preserving all other native extension files exactly. `tools/package_release.py` picks the installable files. `tools/build_userscript.py` produces a separate userscript distribution from the same sources and does not supply generated code for the Firefox XPI.

The source is provided solely for Mozilla review. It is not an extension package; do not upload this ZIP as the Firefox XPI. It contains **no credentials, private router addresses or user settings**.
