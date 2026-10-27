"""Offline userscript sanity smoke. LAN navigation is blocked in this testing runtime.
Run after `python tools/build_channels.py`; requires Playwright + Chromium.
This test checks the login gate and Tampermonkey settings (not the real router).
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
script=R/'release/routerforge-portal.user.js'
assert script.exists(),'Build channels first'
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    pg=b.new_page(viewport={'width':1440,'height':900})
    errors=[]
    pg.on('pageerror',lambda x:errors.append(str(x)))
    pg.set_content('<html><head></head><body><main id=login><h2>Вход в веб-конфигуратор</h2><input type=password></main></body></html>')
    pg.evaluate('''()=>{
      const data={kbridgeState:{version:1,routers:{}},rfPortalLanguage:'ru'};
      window.GM_getValue=(key,def)=>data[key]??def;
      window.GM_setValue=(key,value)=>data[key]=value;
      window.GM_registerMenuCommand=(label,fn)=>window.__rf_settings=fn;
    }''')
    pg.add_script_tag(path=str(script))
    pg.wait_for_timeout(150)
    assert not pg.locator('#kbridge-entry,#kbridge-workspace,#kbridge-drawer').count(), 'No pre-auth UI'
    assert pg.evaluate('typeof window.__rf_settings')=='function', 'TM menu registered'
    pg.evaluate('window.__rf_settings()')
    assert pg.locator('#rf-portal-userscript-settings-host').count()==1, 'Settings open'
    assert not errors, errors
    print('USERSCRIPT_LOGIN_AND_SETTINGS: PASS (offline; router interaction not verified)')
    b.close()
