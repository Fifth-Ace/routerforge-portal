#!/usr/bin/env python3
import hashlib,json,pathlib,zipfile
R=pathlib.Path(__file__).resolve().parent.parent
m=json.loads((R/'manifest.json').read_text())
assert m['version']=='0.10.3' and m['manifest_version']==3
assert 'version_name' not in m and not m.get('host_permissions')
z=R/'dist/routerforge-portal-v0.10.3-install.zip'
assert z.is_file()
with zipfile.ZipFile(z) as f:
 assert f.testzip() is None
 assert json.loads(f.read('manifest.json'))['version']=='0.10.3'
 assert not any('userscript' in p or 'firefox' in p.lower() for p in f.namelist())
g=R/'docs/screenshots/portal-live-demo.gif'
assert g.read_bytes()[:6] in [b'GIF89a',b'GIF87a']
assert g.stat().st_size>100_000
assert 'portal-live-demo.gif' in (R/'README.md').read_text()
assert 'portal-live-demo.gif' in (R/'README_EN.md').read_text()
print('CHROMIUM_PRODUCTION_GATE: PASS; SHA256:',hashlib.sha256(z.read_bytes()).hexdigest())
