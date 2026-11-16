#!/usr/bin/env python3
"""Build store-upload candidates and an exact-source AMO reviewer archive.
No network, no package installs, no browser-store writes.
"""
import hashlib
import json
import pathlib
import shutil
import subprocess
import sys
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'store_dist'
VERSION = json.loads((ROOT / 'manifest.json').read_text(encoding='utf-8'))['version']
DATE = (2026, 1, 1, 0, 0, 0)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def command(*args):
    return subprocess.check_output(args, cwd=ROOT, text=True, encoding='utf-8').strip()


def zip_write(z, path, data):
    info = zipfile.ZipInfo(path, date_time=DATE)
    info.compress_type = zipfile.ZIP_DEFLATED
    info.external_attr = (0o644 << 16)
    z.writestr(info, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)


def build():
    if sys.version_info < (3, 12):
        raise SystemExit('PYTHON_3_12_REQUIRED')
    subprocess.run([sys.executable, 'tools/build_channels.py'], cwd=ROOT, check=True)
    src_chrome = ROOT / 'release' / f'routerforge-portal-chromium-v{VERSION}.zip'
    src_firefox = ROOT / 'release' / f'routerforge-portal-firefox-UNSIGNED-DEV-v{VERSION}.xpi'
    src_userscript = ROOT / 'release' / 'routerforge-portal.user.js'
    src_meta = ROOT / 'release' / 'routerforge-portal.meta.js'
    if not all(p.is_file() for p in (src_chrome, src_firefox, src_userscript, src_meta)):
        raise SystemExit('DISTRIBUTION_PACKAGE_MISSING')
    user_text = src_userscript.read_text(encoding='utf-8')
    meta_text = src_meta.read_text(encoding='utf-8')
    for value in (user_text, meta_text):
        if f'// @version      {VERSION}' not in value:
            raise SystemExit('USERSCRIPT_VERSION_MISMATCH')
        if '// @updateURL ' not in value or '// @downloadURL ' not in value:
            raise SystemExit('USERSCRIPT_UPDATE_METADATA_MISSING')
    with zipfile.ZipFile(src_chrome) as c, zipfile.ZipFile(src_firefox) as f:
        chrome_manifest = json.loads(c.read('manifest.json'))
        firefox_manifest = json.loads(f.read('manifest.json'))
        if chrome_manifest.get('version') != VERSION or firefox_manifest.get('version') != VERSION:
            raise SystemExit('STORE_VERSION_MISMATCH')
        if chrome_manifest.get('background') != {'service_worker': 'background.js'}:
            raise SystemExit('CHROME_MANIFEST_MISMATCH')
        gecko = firefox_manifest.get('browser_specific_settings', {}).get('gecko', {})
        if gecko.get('id') != 'routerforge-portal@fifth-ace.github.io' or gecko.get('data_collection_permissions') != {'required': ['none']}:
            raise SystemExit('FIREFOX_AMO_POLICY_MISMATCH')
        if f.namelist() != c.namelist():
            raise SystemExit('STORE_PAYLOAD_FILE_LIST_MISMATCH')
        for name in c.namelist():
            if name != 'manifest.json' and c.read(name) != f.read(name):
                raise SystemExit('STORE_PAYLOAD_CONTENT_MISMATCH:' + name)
        if c.testzip() is not None or f.testzip() is not None:
            raise SystemExit('BAD_BROWSER_ZIP_CRC')

    OUT.mkdir(exist_ok=True)
    chrome = OUT / f'routerforge-portal-chromium-v{VERSION}.zip'
    firefox = OUT / f'routerforge-portal-firefox-v{VERSION}.xpi'
    userscript = OUT / 'routerforge-portal.user.js'
    userscript_meta = OUT / 'routerforge-portal.meta.js'
    source = OUT / f'RouterForge_Portal_AMO_SOURCE_v{VERSION}.zip'
    shutil.copyfile(src_chrome, chrome)
    shutil.copyfile(src_firefox, firefox)
    shutil.copyfile(src_userscript, userscript)
    shutil.copyfile(src_meta, userscript_meta)
    files = command('git', 'ls-files', '--cached', '-z').split('\0')
    files = sorted({x.replace('\\', '/') for x in files if x})
    if not files or 'README_AMO_BUILD.md' not in files or 'tools/build_store_candidates.py' not in files:
        raise SystemExit('AMO_SOURCE_TREE_NOT_STAGED')
    sha = command('git', 'rev-parse', 'HEAD')
    environment = {
        'source_commit': sha,
        'version': VERSION,
        'python_version': sys.version.split()[0],
        'node_version': command('node', '--version'),
        'build': 'python tools/build_channels.py',
        'third_party_dependencies': [],
        'lockfile': None,
    }
    source_sums = []
    with zipfile.ZipFile(source, 'w') as z:
        for name in files:
            path = ROOT / name
            if not path.is_file() or path.is_symlink() or '.git' in path.parts:
                raise SystemExit('SOURCE_FILE_INVALID: ' + name)
            data = path.read_bytes()
            zip_write(z, name, data)
            source_sums.append(f'{hashlib.sha256(data).hexdigest()}  {name}')
        zip_write(z, 'AMO_EXPECTED_XPI_SHA256.txt', digest(firefox).encode('ascii') + b'\n')
        zip_write(z, 'AMO_BUILD_ENV.json', (json.dumps(environment, indent=2) + '\n').encode('utf-8'))
        zip_write(z, 'SOURCE_SHA256SUMS.txt', ('\n'.join(source_sums) + '\n').encode('utf-8'))
    if source.stat().st_size >= 200 * 1000 * 1000:
        raise SystemExit('AMO_200MB_LIMIT_EXCEEDED')
    with zipfile.ZipFile(source) as s:
        if s.testzip() is not None or 'README_AMO_BUILD.md' not in s.namelist():
            raise SystemExit('AMO_SOURCE_ZIP_INVALID')
        if s.read('AMO_EXPECTED_XPI_SHA256.txt').decode('ascii').strip() != digest(firefox):
            raise SystemExit('AMO_XPI_DIGEST_MISMATCH')
    outputs = [chrome, firefox, userscript, userscript_meta, source]
    sums = OUT / 'STORE_SHA256SUMS.txt'
    sums.write_text(''.join(f'{digest(p)}  {p.name}\n' for p in outputs), encoding='utf-8')
    print('=== STORE CANDIDATES / EXACT SOURCE ===')
    print('SOURCE_SHA: ' + sha)
    print('VERSION: ' + VERSION)
    for p in outputs:
        print(f'STORE_PACKAGE: {p.name} / SHA256={digest(p)} / BYTES={p.stat().st_size}')
    print('GATE: PASS / CHROMIUM ZIP + FIREFOX XPI + USERSCRIPT / VIOLENTMONKEY + TAMPERMONKEY + AMO SOURCE ZIP')


if __name__ == '__main__':
    build()
