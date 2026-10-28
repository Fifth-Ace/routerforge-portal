"""Browser behavior test using options.html/options.js against a mocked chrome.storage API."""
from pathlib import Path
import base64
from playwright.sync_api import sync_playwright
import re
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    ctx=browser.new_context(viewport={'width':1440,'height':1000},color_scheme='dark')
    setup='''() => {
       const listeners=[];
       window.__storage={version:1, routers:{'http://192.168.1.1': {label:'NETCRAZE Ultra',theme:'dark',apps:[{id:'manual_123',name:'123',icon:'▣',url:'http://192.168.1.1:2222/',mode:'auto'}]}}};
       window.chrome={i18n:{getUILanguage:()=> 'ru'},storage:{local:{get:async k=>{if(k==='rfPortalLanguage')return {rfPortalLanguage:window.__lang||'ru'};return {[k]:window.__storage};},set:async kv=>{const before=window.__storage; if('rfPortalLanguage' in kv){window.__lang=kv.rfPortalLanguage;for(const f of listeners)f({rfPortalLanguage:{newValue:window.__lang}},'local');return;} window.__storage=kv.kbridgeState;for(const f of listeners)f({kbridgeState:{oldValue:before,newValue:window.__storage}},'local');}},onChanged:{addListener:f=>listeners.push(f)}},tabs:{create:async()=>{}},permissions:{remove:async()=>true}};
       window.confirm=()=>true;
    }'''
    page=ctx.new_page()
    logo='data:image/png;base64,'+base64.b64encode((ROOT/'assets/routerforge-brand.png').read_bytes()).decode()
    html=(ROOT/'options.html').read_text().replace('src="assets/routerforge-brand.png"','src="'+logo+'"')
    page.set_content(html.replace('<script type="module" src="options.js"></script>',''))
    page.evaluate(setup)
    page.add_style_tag(content=(ROOT/'ui.css').read_text())
    pieces=[]
    for name in ['shared/i18n.js','shared/model.js','shared/catalog.js','options.js']:
      text=(ROOT/name).read_text()
      text=re.sub(r"^import .*?;\s*$",'',text,flags=re.M)
      text=re.sub(r'^export ', '', text,flags=re.M)
      pieces.append(text)
    page.on('pageerror',lambda exc: print('BROWSER_ERROR',exc))
    page.add_script_tag(content='\n'.join(pieces))
    page.locator('.catalog-card').first.wait_for()
    assert page.locator('.catalog-card').count()==7, 'CATALOG_COUNT'
    assert page.locator('.catalog-enabled:checked').count()==0,'OPT_IN_DEFAULT'
    assert page.locator('.entry').count()==1, 'PRESERVE_MANUAL_123'
    awg=page.locator('#catalog-awg-manager')
    assert awg.locator('.catalog-port').input_value()=='2222'
    assert awg.locator('.catalog-primary input').count()==2, 'ONLY_HOST_AND_PORT_ON_CARD'
    assert awg.locator('.catalog-width-pct, .catalog-left-trim, .catalog-right-trim').count()==0,'OBSOLETE_UI_ABSENT'
    assert not awg.locator('.catalog-advanced').evaluate('(e)=>e.open'),'ADVANCED_COLLAPSED_BY_DEFAULT'
    awg.locator('.catalog-advanced summary').click()
    awg.locator('.catalog-port').fill('2288')
    awg.locator('.catalog-mode').select_option('external')
    awg.locator('.catalog-enabled').check()
    page.wait_for_function("window.__storage.routers['http://192.168.1.1'].apps.some(a=>a.presetId==='awg-manager' && a.enabled && a.url.includes(':2288'))")
    assert page.locator('.entry').count()==2, 'ENABLED_PRESET_VISIBLE'
    awg=page.locator('#catalog-awg-manager')
    assert awg.locator('.catalog-advanced').evaluate('(e)=>e.open'),'ADVANCED_STATE_PRESERVED_ON_RENDER'
    awg.locator('.catalog-enabled').uncheck()
    page.wait_for_function("window.__storage.routers['http://192.168.1.1'].apps.some(a=>a.presetId==='awg-manager' && a.enabled===false)")
    assert page.locator('.entry').count()==1,'DISABLED_PRESET_HIDDEN'
    awg=page.locator('#catalog-awg-manager')
    assert awg.locator('.catalog-port').input_value()=='2288','RETAIN_CUSTOM_PORT'
    assert awg.locator('.catalog-mode').input_value()=='external','RETAIN_EXTERNAL_MODE'
    awg.locator('.catalog-port').fill('70000')
    awg.locator('.catalog-save').click()
    assert 'Порт должен' in page.locator('#message').inner_text(),'INVALID_PORT_REJECTED'
    awg.locator('.catalog-port').fill('2288')
    page.locator('#message').evaluate('(e)=>e.hidden=true')
    awg.locator('.catalog-enabled').check()
    page.wait_for_function("window.__storage.routers['http://192.168.1.1'].apps.some(a=>a.presetId==='awg-manager' && a.enabled)")
    page.locator('#message').evaluate('(e)=>e.hidden=true')
    page.locator('.catalog-panel').screenshot(path=str(ROOT.parent/'RouterForgePortal-P13-CATALOG-DARK.png'))
    page.screenshot(path=str(ROOT.parent/'RouterForgePortal-P13-OPTIONS-DARK.png'),full_page=True)
    # Light theme, same DOM and spacing
    page.locator('#router-theme').select_option('light')
    page.wait_for_function("document.documentElement.dataset.theme === 'light'")
    page.screenshot(path=str(ROOT.parent/'RouterForgePortal-P13-OPTIONS-LIGHT.png'),full_page=True)
    print('CATALOG_BROWSER: PASS (7 defaults OFF / toggle / custom port / mode / persistence / invalid port / legacy app)')
    browser.close()

