"""Regression: real Keenetic pages with full-width main must change width visibly."""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
HTML='''<!doctype html><html data-theme="dark"><head><style>
*{box-sizing:border-box}body{margin:0;font:14px Arial}header{position:fixed;left:0;right:0;top:0;height:40px;background:#1b2638;color:white}
aside{position:fixed;top:40px;left:0;bottom:0;width:205px;background:#1b2638;color:#ddd} aside button{display:block;width:100%;padding:10px;background:transparent;color:white;border:0}
main{position:fixed;left:205px;right:0;top:48px;bottom:0;background:#202838;color:white}main h2{padding:10px}
</style></head><body><header>NETCRAZE ULTRA</header><aside><button>Интернет</button><button>Локальная сеть</button><button>Управление</button><button>Диагностика</button></aside><main><h2>Storage and devices</h2></main></body></html>'''
with sync_playwright() as pw:
    b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    try:
        p=b.new_page(viewport={'width':1664,'height':900})
        errors=[]
        p.on('pageerror',lambda e:errors.append(str(e)))
        p.set_content(HTML)
        p.evaluate('''() => {
          window.__store={version:1,routers:{[location.origin]:{label:'Test',theme:'auto',apps:[{id:'core_fix1',name:'RouterForge Core',icon:'▣',url:'https://example.test/',mode:'embedded',layoutWidth:'native',nativeWidthPct:85,enabled:true}]}}};
          window.__handlers=[];
          window.chrome={storage:{local:{get:async()=>({kbridgeState:JSON.parse(JSON.stringify(window.__store))}),set:async obj=>{const before=window.__store;window.__store=obj.kbridgeState;window.__handlers.forEach(fn=>fn({kbridgeState:{oldValue:before,newValue:window.__store}},'local'));}},onChanged:{addListener:f=>window.__handlers.push(f)}},runtime:{sendMessage:async()=>({ok:true}),onMessage:{addListener:()=>{}}}};
        }''')
        p.add_style_tag(path=str(R/'content/bridge.css'))
        p.add_script_tag(path=str(R/'content/bridge.js'))
        p.locator('#kbridge-entry [data-app-id="core_fix1"]').click()
        p.wait_for_function("document.querySelector('#kbridge-workspace').dataset.kbFix === 'P12-THEME-TYPE-FIX-LOCAL'")
        native=p.locator('#kbridge-workspace').bounding_box()
        assert native and abs(native['width']-(1664-205-16))<=2,native
        assert p.locator('#kbridge-workspace').get_attribute('data-kb-boundary-mode')=='auto'
        print('P9D_FULLWIDTH_85_PERCENT_IGNORED: PASS',round(native['width']))
        frame=p.locator('#kbridge-workspace iframe');before=frame.get_attribute('src')
        btn=p.locator('#kbridge-workspace .kb-width-toggle');btn.click()
        p.wait_for_function("document.querySelector('#kbridge-workspace').dataset.kbWidth === 'wide'")
        wide=p.locator('#kbridge-workspace').bounding_box()
        assert 0 <= wide['width']-native['width'] <= 30,(native,wide)
        assert frame.get_attribute('src')==before
        btn.click()
        p.wait_for_function("document.querySelector('#kbridge-workspace').dataset.kbWidth === 'native'")
        assert abs(p.locator('#kbridge-workspace').bounding_box()['width']-native['width'])<=2
        print('P9D_FULLWIDTH_NO_ARTIFICIAL_CAP: PASS')
        p.evaluate("""() => { const v=JSON.parse(JSON.stringify(window.__store));v.routers[location.origin].apps[0].nativeWidthPct=90;window.__store=v;window.__handlers.forEach(fn=>fn({kbridgeState:{oldValue:null,newValue:v}},'local')); }""")
        p.wait_for_timeout(90)
        assert abs(p.locator('#kbridge-workspace').bounding_box()['width']-native['width'])<=2
        assert frame.get_attribute('src')==before
        print('P9D_LEGACY_PERCENT_IS_IGNORED: PASS')
        p.evaluate("location.hash='diagnostics'")
        p.wait_for_function("document.querySelector('#kbridge-workspace').hidden")
        assert p.locator('main h2').inner_text()=='Storage and devices'
        assert not errors,errors
        print('FIX1_NATIVE_NAVIGATION_RESTORE: PASS')
    finally:b.close()
