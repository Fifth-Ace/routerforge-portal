#!/usr/bin/env python3
"""Build a self-contained userscript by reusing the native Portal bridge and CSS."""
import base64
import json
import pathlib
import re
import subprocess

HERE = pathlib.Path(__file__).resolve().parent.parent
SOURCE = HERE
TEMPLATE = HERE / 'userscript' / 'runtime.template.js'
DIST = HERE / 'release'
VERSION = json.loads((HERE / 'manifest.json').read_text(encoding='utf-8'))['version']
ROOT = 'https://github.com/Fifth-Ace/routerforge-portal/releases/latest/download/'

HEADER = rf'''// ==UserScript==
// @name         RouterForge Portal — Keenetic WebUI
// @name:ru      RouterForge Portal — приложения Keenetic
// @namespace    https://github.com/Fifth-Ace/routerforge-portal
// @version      {VERSION}
// @description  One interface for Keenetic/Netcraze applications (Chrome, Edge, Opera, Firefox)
// @description:ru Сторонние веб-приложения в Keenetic / Netcraze — Chrome, Edge, Opera, Firefox
// @author       RouterForge Contributors
// @license      MIT
// @homepageURL  https://github.com/Fifth-Ace/routerforge-portal
// @supportURL   https://github.com/Fifth-Ace/routerforge-portal/issues
// @updateURL    {ROOT}routerforge-portal.meta.js
// @downloadURL  {ROOT}routerforge-portal.user.js
// @run-at       document-idle
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @include      /^https?:\/\/(?:10\.(?:[0-9]{{1,3}}\.){{2}}[0-9]{{1,3}}|192\.168\.[0-9]{{1,3}}\.[0-9]{{1,3}}|172\.(?:1[6-9]|2[0-9]|3[01])\.[0-9]{{1,3}}\.[0-9]{{1,3}}|my\.keenetic\.net|keenetic\.local)(?::[0-9]+)?(?:\/|$)/
// ==/UserScript==
'''



def build():
    main_js = (SOURCE/'content'/'bridge.js').read_text(encoding='utf-8')
    main_css = (SOURCE/'content'/'bridge.css').read_text(encoding='utf-8')
    # The native catalog is authoritative: derive Tampermonkey presets from the SAME module.
    native=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {CATALOG} from './shared/catalog.js'; console.log(JSON.stringify(CATALOG))"],cwd=HERE,text=True))
    catalog=[{k:row[k] for k in ('id','name','icon','category','port','path')} for row in native]
    reference=json.loads((HERE/'userscript'/'catalog.json').read_text(encoding='utf-8'))
    if catalog != reference: raise SystemExit('USERSCRIPT_CATALOG_DRIFT')
    mark = 'data:image/png;base64,' + base64.b64encode((SOURCE/'assets'/'routerforge-brand.png').read_bytes()).decode()
    runtime = TEMPLATE.read_text(encoding='utf-8')
    runtime = re.sub(r"const VERSION='[^']+'", "const VERSION='"+VERSION+"'", runtime, count=1)
    # Guard against accidentally bundling any of the extension background's privileged APIs.
    assert 'eval(' not in main_js and 'new Function(' not in main_js
    runtime = runtime.replace('__BRIDGE_CSS__',json.dumps(main_css,ensure_ascii=False))
    runtime = runtime.replace('__BRAND_URI__',json.dumps(mark))
    runtime = runtime.replace('__CATALOG__',json.dumps(catalog,ensure_ascii=False))
    runtime = runtime.replace('__BRIDGE_JS__',main_js)
    assert not re.search(r'__BRIDGE_(?:CSS|JS)__|__BRAND_URI__|__CATALOG__',runtime)
    DIST.mkdir(exist_ok=True)
    (DIST/'routerforge-portal.user.js').write_text(HEADER+runtime,encoding='utf-8',newline='\n')
    (DIST/'routerforge-portal.meta.js').write_text(HEADER,encoding='utf-8',newline='\n')
    return DIST/'routerforge-portal.user.js'

if __name__=='__main__':
    print(build())
