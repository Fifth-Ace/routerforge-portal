#!/usr/bin/env python3
"""Deterministic RouterForge Portal store/unpacked ZIP; no extra files."""
import hashlib,json,pathlib,re,sys,zipfile
ROOT=pathlib.Path(__file__).resolve().parent.parent
manifest=json.loads((ROOT/'manifest.json').read_text(encoding='utf-8'))
version=manifest.get('version')
if not re.fullmatch(r'\d+\.\d+\.\d+(?:\.\d+)?',str(version)):
    raise SystemExit('INVALID_VERSION')
if manifest.get('name')!='RouterForge Portal' or manifest.get('manifest_version')!=3:
    raise SystemExit('INVALID_MANIFEST')
files=[]
for f in ROOT.rglob('*'):
    if not f.is_file(): continue
    rel=f.relative_to(ROOT).as_posix()
    if f.is_symlink(): raise SystemExit('SYMLINK_FORBIDDEN: '+rel)
    if re.fullmatch(r'(manifest\.json|background\.js|popup\.(html|js)|options\.(html|js)|ui\.css|_locales/[a-z]{2}/messages\.json|shared/[a-z0-9_-]+\.js|content/[a-z0-9_-]+\.(js|css)|assets/[a-z0-9_.-]+\.(png|svg|ico))',rel):
        files.append((rel,f))
files.sort()
assert len(files)>=15
output=ROOT/'dist'
output.mkdir(exist_ok=True)
target=output/f'routerforge-portal-v{version}-install.zip'
with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for name,f in files:
        info=zipfile.ZipInfo(name,date_time=(2026,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o644<<16
        z.writestr(info,f.read_bytes(),compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
hash=hashlib.sha256(target.read_bytes()).hexdigest()
(output/'SHA256SUMS.txt').write_text(f'{hash}  {target.name}\n',encoding='utf-8')
print('PACKAGE:',target,'FILES:',len(files),'SHA256:',hash)
