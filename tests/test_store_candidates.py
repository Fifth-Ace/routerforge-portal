"""Store candidates are paired and AMO source can reproduce exact XPI bytes."""
from pathlib import Path
import hashlib, json, zipfile
root=Path(__file__).resolve().parent.parent
version=json.loads((root/'manifest.json').read_text(encoding='utf-8'))['version']
out=root/'store_dist'
c=out/f'routerforge-portal-chromium-v{version}.zip'
f=out/f'routerforge-portal-firefox-v{version}.xpi'
s=out/f'RouterForge_Portal_AMO_SOURCE_v{version}.zip'
u=out/'routerforge-portal.user.js'
m=out/'routerforge-portal.meta.js'
assert all(p.is_file() and p.stat().st_size > 1000 for p in (c,f,s,u))
assert m.is_file() and m.stat().st_size > 300
assert u.read_bytes()==(root/'release'/'routerforge-portal.user.js').read_bytes()
assert m.read_bytes()==(root/'release'/'routerforge-portal.meta.js').read_bytes()
assert f'// @version      {version}' in u.read_text(encoding='utf-8')
assert f'// @version      {version}' in m.read_text(encoding='utf-8')
assert '// @updateURL ' in m.read_text(encoding='utf-8')
assert '// @downloadURL ' in m.read_text(encoding='utf-8')
assert c.read_bytes()==(root/'release'/f'routerforge-portal-chromium-v{version}.zip').read_bytes()
assert f.read_bytes()==(root/'release'/f'routerforge-portal-firefox-UNSIGNED-DEV-v{version}.xpi').read_bytes()
with zipfile.ZipFile(s) as z:
 assert z.testzip() is None
 assert 'tools/build_channels.py' in z.namelist()
 assert 'README_AMO_BUILD.md' in z.namelist()
 assert z.read('AMO_EXPECTED_XPI_SHA256.txt').decode().strip()==hashlib.sha256(f.read_bytes()).hexdigest()
 assert json.loads(z.read('AMO_BUILD_ENV.json'))['version']==version
 assert 'node_modules/' not in ''.join(z.namelist())
assert s.stat().st_size < 200 * 1000 * 1000
for line in (out/'STORE_SHA256SUMS.txt').read_text().splitlines():
 sha,name=line.split('  ',1)
 assert hashlib.sha256((out/name).read_bytes()).hexdigest()==sha
print('GATE: PASS / CHROMIUM + FIREFOX + VIOLENTMONKEY/TAMPERMONKEY + SOURCE ZIP + SHA256')
