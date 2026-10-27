#!/usr/bin/env python3
"""Static fail-closed checks for our MV3 publishable sources."""
import json,pathlib,re,sys
root=pathlib.Path(__file__).resolve().parent.parent
m=json.loads((root/'manifest.json').read_text())
def gate(ok,msg):
    if not ok: raise SystemExit('SECURITY_FAIL: '+msg)
gate(m['manifest_version']==3,'MUST_BE_MV3')
gate(m['name']=='RouterForge Portal','NAME')
gate(set(m['permissions'])=={'storage','scripting','activeTab'},'PERMISSIONS_DRIFT')
gate(set(m.get('optional_host_permissions',[]))=={'http://*/*','https://*/*'},'OPTIONAL_PERMISSIONS_DRIFT')
gate(not m.get('host_permissions'),'UNCONDITIONAL_HOST_PERMISSIONS')
gate(not m.get('externally_connectable'),'EXTERNAL_MESSAGING')
gate(not m.get('content_security_policy'),'CUSTOM_CSP')
gate(m.get('background')=={'service_worker':'background.js'},'BACKGROUND_DRIFT')
for p in root.rglob('*'):
    if not p.is_file() or 'dist' in p.parts or '.git' in p.parts: continue
    if p.suffix not in {'.js','.html'}: continue
    txt=p.read_text(encoding='utf-8')
    if p.parts[-2]=='tests': continue
    gate(not re.search(r'\b(?:eval\s*\(|new\s+Function\s*\(|importScripts\s*\(|document\.write\s*\(|\.innerHTML\s*=|\.outerHTML\s*=)',txt),str(p.relative_to(root))+': dynamic execution or HTML injection')
for p in [root/'popup.html',root/'options.html']:
    html=p.read_text()
    gate(not re.search(r'<script[^>]+src=["\']https?://',html,re.I),'REMOTE_JS')
    gate(not re.search(r'\son\w+\s*=',html,re.I),'INLINE_EVENT_HANDLER')
for path in [root/'background.js',root/'content/bridge.js']:
    gate('kbridgeState' in path.read_text(),'STORAGE_KEY_DRIFT')
print('SECURITY_GATE: PASS')
