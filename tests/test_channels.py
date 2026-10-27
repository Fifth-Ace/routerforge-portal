#!/usr/bin/env python3
"""Dual-channel invariants, including userscript scope and Firefox unsigned status."""
import hashlib, json, pathlib, re, zipfile
R=pathlib.Path(__file__).resolve().parent.parent
D=R/'release'
M=json.loads((R/'manifest.json').read_text())
v=M['version']
script=(D/'routerforge-portal.user.js').read_text()
meta=(D/'routerforge-portal.meta.js').read_text()
assert script.startswith('// ==UserScript==\n')
assert meta.startswith('// ==UserScript==\n')
assert meta.rstrip().endswith('// ==/UserScript==')
for field in ('@version','@include','@noframes','@grant        GM_getValue','@updateURL','@downloadURL'):
    assert field in script and field in meta,field
for denied in ('@require','@resource','GM_xmlhttpRequest','GM_download','@connect'):
    assert denied not in meta,denied
assert script.count('// @include ')==1
assert f'// @version      {v}' in meta
assert f'https://github.com/Fifth-Ace/routerforge-portal/releases/latest/download/routerforge-portal.user.js' in meta
rx=re.search(r'(?m)^// @include\s+/(.*)/$',meta)
assert rx
pattern=re.compile(rx.group(1))
for s in ('http://192.168.1.1/','https://10.20.30.1:443/','http://172.31.1.2:90/','http://my.keenetic.net/','https://keenetic.local/'):
    assert pattern.search(s),s
for s in ('https://github.com/','https://example.com/','http://192.167.1.1/','http://10.evil.com/','file:///etc/passwd'):
    assert not pattern.search(s),s
n=D/f'routerforge-portal-chromium-v{v}.zip'
f=D/f'routerforge-portal-firefox-UNSIGNED-DEV-v{v}.xpi'
with zipfile.ZipFile(n) as zipn,zipfile.ZipFile(f) as zipf:
    mn=json.loads(zipn.read('manifest.json'))
    mf=json.loads(zipf.read('manifest.json'))
    assert mn['background']=={'service_worker':'background.js'}
    assert mf['background']=={'scripts':['background.js']}
    assert mf['browser_specific_settings']['gecko']['id']=='routerforge-portal@fifth-ace.github.io'
    assert set(zipn.namelist())==set(zipf.namelist())
    for item in set(zipn.namelist())-{'manifest.json'}:assert zipn.read(item)==zipf.read(item)
    assert zipn.testzip() is None and zipf.testzip() is None
for line in (D/'SHA256SUMS.txt').read_text().splitlines():
    sha,file=line.split('  ',1)
    assert hashlib.sha256((D/file).read_bytes()).hexdigest()==sha
print('CHANNEL_GATE: PASS (Chromium, Tampermonkey, Firefox unsigned dev, hashes, scope)')
