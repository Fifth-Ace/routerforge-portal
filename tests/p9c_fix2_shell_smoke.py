"""P9C FIX2: reproduce the actual NETCRAZE outer shell: bounded header,
sidebar x223..408, oversized main x408..1585, native content x424..1548.
Run in a disposable synthetic DOM; no router access or state mutation.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
HTML='''<!doctype html><html data-theme="dark"><head><style>
*{box-sizing:border-box}body{margin:0;background:#1b2638;font:14px Arial}
header{position:fixed;top:0;left:223px;width:1325px;height:42px;background:#1b2638;color:#eee}
aside{position:fixed;top:42px;left:223px;width:185px;bottom:0;background:#141c29;color:#ddd}
aside button{display:block;width:100%;padding:12px;background:none;border:0;color:#ccc;text-align:left}
main{position:fixed;top:42px;left:408px;right:463px;bottom:0;background:#1b2638;color:#ddd}
main h2{margin:20px 18px}
</style></head><body><header>NETCRAZE ULTRA</header>
<aside><button>Интернет</button><button>Локальная сеть</button><button>Управление</button><button>Диагностика</button></aside>
<main><h2>Пользователи и доступ</h2></main></body></html>'''
with sync_playwright() as pw:
    b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    try:
        p=b.new_page(viewport={'width':2048,'height':977})
        errors=[]
        p.on('pageerror',lambda e:errors.append(str(e)))
        p.set_content(HTML)
        p.evaluate('''() => {
          window.__store={version:1,routers:{[location.origin]:{label:'Netcraze',theme:'auto',apps:[{id:'awg_fix2',name:'AWG Manager',icon:'▣',url:'https://example.test/',mode:'embedded',layoutWidth:'native',nativeWidthPct:85,enabled:true}]}}};
          window.__handlers=[];
          window.chrome={storage:{local:{get:async()=>({kbridgeState:JSON.parse(JSON.stringify(window.__store))}),set:async obj=>{const before=window.__store;window.__store=obj.kbridgeState;window.__handlers.forEach(fn=>fn({kbridgeState:{oldValue:before,newValue:window.__store}},'local'));}},onChanged:{addListener:fn=>window.__handlers.push(fn)}},runtime:{sendMessage:async()=>({ok:true}),onMessage:{addListener:()=>{}}}};
        }''')
        p.add_style_tag(path=str(R/'content/bridge.css'))
        p.add_script_tag(path=str(R/'content/bridge.js'))
        p.locator('#kbridge-entry [data-app-id="awg_fix2"]').click()
        p.wait_for_function("document.querySelector('#kbridge-workspace').dataset.kbFix==='P14-CHROMIUM-RC-LOCAL'")
        native=p.locator('#kbridge-workspace').bounding_box()
        assert native, 'MISSING_NATIVE_WORKSPACE'
        nr=native['x']+native['width']
        assert abs(native['x']-424)<=2,(native,'left must follow 16px native content gutter')
        assert abs(nr-1548)<=2,(native,'right must align with shell header boundary')
        assert p.locator('main h2').is_visible()
        print('FIX2_NETCRAZE_NATIVE_X424_RIGHT1548: PASS',round(native['x']),round(nr))
        frame=p.locator('#kbridge-workspace iframe');old_src=frame.get_attribute('src')
        p.locator('#kbridge-workspace .kb-width-toggle').click()
        p.wait_for_function("document.querySelector('#kbridge-workspace').dataset.kbWidth==='wide'")
        wide=p.locator('#kbridge-workspace').bounding_box()
        assert wide['width']>native['width']+200,(native,wide)
        assert frame.get_attribute('src')==old_src
        print('FIX2_WIDE_MODE_DOES_NOT_RELOAD_FRAME: PASS')
        p.locator('#kbridge-workspace .kb-width-toggle').click()
        p.wait_for_function("document.querySelector('#kbridge-workspace').dataset.kbWidth==='native'")
        assert abs(p.locator('#kbridge-workspace').bounding_box()['x']-424)<=2
        print('FIX2_NATIVE_RESTORE: PASS')
        p.evaluate("location.hash='devices'")
        p.wait_for_function("document.querySelector('#kbridge-workspace').hidden")
        assert p.locator('main h2').is_visible()
        print('FIX2_KEENETIC_NAVIGATION: PASS')
        assert not errors,errors
    finally:b.close()
