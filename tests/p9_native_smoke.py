"""P9 native geometry + non-invasive SPA navigation smoke; offline browser only."""
from pathlib import Path
from playwright.sync_api import sync_playwright
R = Path(__file__).resolve().parents[1]
HTML = '''<!doctype html><html data-theme="dark"><head><style>
*{box-sizing:border-box}body{margin:0;font:14px Arial}header{position:fixed;top:0;left:0;right:0;height:42px;background:#1b2638;color:white}
aside{position:fixed;top:42px;left:0;bottom:0;width:214px;background:#1b2638;color:#ddd}
aside button{display:block;border:0;padding:9px;background:transparent;color:inherit}
main{position:fixed;top:52px;left:224px;right:18px;bottom:16px;background:#141e2c;color:white}
</style></head><body><header>NETCRAZE ULTRA</header><aside><button>Интернет</button><button>Локальная сеть</button><button>Настройки системы</button><button>Диагностика</button></aside><main><h2>Native home</h2></main></body></html>'''
INIT = '''() => {
window.__log=[];
window.chrome={storage:{local:{get:async()=>({kbridgeState:{version:1,routers:{null:{label:'Keenetic',theme:'auto',apps:[{id:'core_test',name:'RouterForge Core',url:'https://example.test/',mode:'embedded',icon:'▣'}]}}}})},onChanged:{addListener:()=>{}}},runtime:{sendMessage:async m=>{window.__log.push(m);return {ok:true}},onMessage:{addListener:()=>{}}}};
}'''
with sync_playwright() as playwright:
    browser=playwright.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    try:
        page=browser.new_page(viewport={'width':1440,'height':900})
        errors=[]
        page.on('pageerror',lambda err: errors.append(str(err)))
        page.set_content(HTML)
        page.evaluate(INIT)
        page.add_style_tag(path=str(R/'content/bridge.css'))
        page.add_script_tag(path=str(R/'content/bridge.js'))
        page.locator('#kbridge-entry [data-app-id="core_test"]').wait_for()
        page.locator('#kbridge-entry [data-app-id="core_test"]').click()
        page.wait_for_function("document.querySelector('#kbridge-workspace').dataset.kbPlacement === 'native'")
        bounds=page.locator('#kbridge-workspace').bounding_box()
        assert bounds and abs(bounds['x']-224)<=1 and abs(bounds['y']-52)<=1, bounds
        assert abs(bounds['width']-(1440-224-18))<=2 and abs(bounds['height']-(900-52-16))<=2, bounds
        assert page.locator('main h2').inner_text()=='Native home'
        print('P9_NATIVE_GEOMETRY: PASS')
        # Collapsed Keenetic left rail and repositioned native content remain accessible.
        page.evaluate("""() => {document.querySelector('aside').style.width='65px';document.querySelector('main').style.left='75px';}""")
        page.wait_for_function("Math.abs(document.querySelector('#kbridge-workspace').getBoundingClientRect().left-75)<=1")
        assert page.locator('#kbridge-workspace').get_attribute('data-kb-layout')=='compact'
        assert page.locator('aside button').first.is_visible()
        print('P9_COLLAPSED_SIDEBAR: PASS')
        # Native hash/route changes close the frame, leaving the native page untouched.
        page.evaluate("location.hash='native-settings'")
        page.wait_for_function("document.querySelector('#kbridge-workspace').hidden")
        assert page.locator('main h2').inner_text()=='Native home'
        print('P9_HASH_NAVIGATION_RESTORE: PASS')
        page.evaluate("location.hash=''")
        page.locator('#kbridge-entry .kb-rail-trigger').click()
        page.locator('#kbridge-drawer .kbapp').first.click()
        page.wait_for_function("!document.querySelector('#kbridge-workspace').hidden")
        # pushState alone has no DOM event; subsequent native SPA render detects the route.
        page.evaluate("""() => {history.pushState({screen:'wifi'},'', '#wifi');document.querySelector('main h2').textContent='Wi-Fi';}""")
        page.wait_for_function("document.querySelector('#kbridge-workspace').hidden")
        assert page.locator('main h2').inner_text()=='Wi-Fi'
        print('P9_SPA_DOM_ROUTE: PASS')
        page.locator('#kbridge-entry .kb-rail-trigger').click()
        page.locator('#kbridge-drawer .kbapp').first.click()
        page.wait_for_function("!document.querySelector('#kbridge-workspace').hidden")
        # No reliable native content anchor: safe fallback, never hide Keenetic DOM.
        page.evaluate("document.querySelector('main').remove()")
        page.wait_for_function("document.querySelector('#kbridge-workspace').dataset.kbPlacement === 'fallback'")
        assert page.locator('aside').is_visible()
        print('P9_UNKNOWN_LAYOUT_FALLBACK: PASS')
        # Login dialog appearing after logout tears down all injected UI.
        page.evaluate("""() => {document.body.insertAdjacentHTML('beforeend','<section>Вход в веб-конфигуратор <input name="login"><input type="password"></section>');}""")
        page.wait_for_function("!document.querySelector('#kbridge-workspace')")
        assert page.locator('#kbridge-entry').count()==0
        assert not errors, errors
        print('P9_LOGOUT_CLEANUP: PASS')
        page.close()
    finally:
        browser.close()
