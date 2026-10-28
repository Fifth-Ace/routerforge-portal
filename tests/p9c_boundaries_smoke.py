"""P9C: native column selection, wide mode persistence, fallback and collapse."""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
HTML='''<!doctype html><html data-theme="dark"><head><style>
*{box-sizing:border-box}body{margin:0;font:14px Arial}header{position:fixed;top:0;left:0;right:0;height:40px;background:#1b2638;color:white}
aside{position:fixed;top:40px;left:0;bottom:0;width:215px;background:#1b2638;color:#ddd}aside button{display:block;padding:9px;background:transparent;color:white;border:0}
main{position:fixed;top:52px;left:235px;right:0;bottom:0;background:#202838;color:white}
main .native-column{margin-left:20px;width:calc(100% - 215px);height:calc(100% - 10px);background:#1c293d}
main .inner-card{width:55%;height:240px;background:#172438}
</style></head><body><header>NETCRAZE ULTRA</header><aside><button>Интернет</button><button>Управление</button><button>Локальная сеть</button><button>Диагностика</button></aside><main><div class="native-column"><h2>Native Page</h2><div class="inner-card">Chart</div></div></main></body></html>'''
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 try:
  page=browser.new_page(viewport={'width':1648,'height':900})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(HTML)
  page.evaluate("""() => {window.__writes=[];window.__appState={version:1,routers:{[location.origin]:{label:'Keenetic',theme:'auto',apps:[{id:'awg_p9c',name:'AWG',url:'https://example.test/',mode:'embedded',icon:'🌐'}]}}};window.__listeners=[];window.chrome={storage:{local:{get:async()=>({kbridgeState:window.__appState}),set:async obj=>{const old=window.__appState;window.__appState=obj.kbridgeState;window.__writes.push(obj);window.__listeners.forEach(fn=>fn({kbridgeState:{oldValue:old,newValue:window.__appState}},'local'));}},onChanged:{addListener:fn=>window.__listeners.push(fn)}},runtime:{sendMessage:async()=>({ok:true}),onMessage:{addListener:()=>{}}}};}""")
  page.add_style_tag(path=str(R/'content/bridge.css'));page.add_script_tag(path=str(R/'content/bridge.js'))
  page.locator('#kbridge-entry [data-app-id="awg_p9c"]').click()
  page.wait_for_function("document.querySelector('#kbridge-workspace').dataset.kbPlacement==='native'")
  box=page.locator('#kbridge-workspace').bounding_box()
  assert abs(box['x']-255)<=2 and 1150<=box['width']<=1198,box
  assert page.locator('.inner-card').count()==1
  print('P9C_NATIVE_INNER_COLUMN: PASS',round(box['x']),round(box['width']))
  frame=page.locator('#kbridge-workspace iframe');before=frame.get_attribute('src')
  btn=page.locator('#kbridge-workspace .kb-width-toggle');btn.click()
  page.wait_for_function("document.querySelector('#kbridge-workspace').dataset.kbPlacement==='wide'")
  wide=page.locator('#kbridge-workspace').bounding_box()
  assert wide['width']>box['width']+150,wide
  assert frame.get_attribute('src')==before
  assert page.evaluate("window.__appState.routers[location.origin].apps[0].layoutWidth")== 'wide'
  print('P9C_WIDE_TOGGLE_PERSIST: PASS')
  btn.click();page.wait_for_function("document.querySelector('#kbridge-workspace').dataset.kbPlacement==='native'")
  assert page.evaluate("window.__appState.routers[location.origin].apps[0].layoutWidth")=='native'
  print('P9C_NATIVE_RESTORE: PASS')
  page.set_viewport_size({'width':1366,'height':820})
  page.wait_for_function("""() => {const w=document.querySelector('#kbridge-workspace').getBoundingClientRect(),n=document.querySelector('main .native-column').getBoundingClientRect();return w.right<=n.right+2 && w.right>=n.right-40;}""")
  print('P9C_VIEWPORT_RESIZE: PASS')
  page.evaluate("""() => {document.querySelector('aside').style.width='65px';document.querySelector('main').style.left='85px';} """)
  page.wait_for_function("document.querySelector('#kbridge-workspace').dataset.kbLayout==='compact'")
  print('P9C_COLLAPSED_REMEASURE: PASS')
  page.evaluate("document.querySelector('main').remove()")
  page.wait_for_function("document.querySelector('#kbridge-workspace').dataset.kbPlacement==='fallback'")
  assert page.locator('aside').is_visible()
  print('P9C_UNCERTAIN_GEOMETRY_FALLBACK: PASS')
  page.evaluate("location.hash='diagnostics'")
  page.wait_for_function("document.querySelector('#kbridge-workspace').hidden")
  assert not errors,errors
  print('P9C_NAVIGATION_CLEANUP: PASS')
 finally:browser.close()
