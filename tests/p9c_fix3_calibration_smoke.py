"""Local-only browser verification of P9C FIX4 precise calibration (no real router)."""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
HTML='''<!doctype html><html data-theme="dark"><head><style>
*{box-sizing:border-box}body{margin:0;background:#1b2638;font:14px Arial}
header{position:fixed;top:0;left:223px;width:1325px;height:42px;background:#1b2638;color:#eee}
aside{position:fixed;top:42px;left:223px;width:185px;bottom:0;background:#141c29;color:#ddd}
aside button{display:block;width:100%;padding:12px;background:none;border:0;color:#ccc;text-align:left}
main{position:fixed;top:42px;left:408px;right:463px;bottom:0;background:#1b2638;color:#ddd}
</style></head><body><header>NETCRAZE ULTRA</header>
<aside><button>Интернет</button><button>Локальная сеть</button><button>Управление</button><button>Диагностика</button></aside>
<main><h2>Пользователи и доступ</h2></main></body></html>'''
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 try:
  p=b.new_page(viewport={'width':2048,'height':977});errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
  p.set_content(HTML)
  p.evaluate('''() => {
  window.__store={version:1,routers:{[location.origin]:{label:'Netcraze',theme:'auto',apps:[{id:'awg_fix3',name:'AWG Manager',icon:'▣',url:'https://example.test/',mode:'embedded',layoutWidth:'native',nativeWidthPct:85,enabled:true}]}}};
  window.__handlers=[];window.chrome={storage:{local:{get:async()=>({kbridgeState:JSON.parse(JSON.stringify(window.__store))}),set:async obj=>{const before=window.__store;window.__store=obj.kbridgeState;window.__handlers.forEach(fn=>fn({kbridgeState:{oldValue:before,newValue:window.__store}},'local'));}},onChanged:{addListener:fn=>window.__handlers.push(fn)}},runtime:{sendMessage:async()=>({ok:true}),onMessage:{addListener:()=>{}}}};
  }''')
  p.add_style_tag(path=str(R/'content/bridge.css'));p.add_script_tag(path=str(R/'content/bridge.js'))
  p.locator('#kbridge-entry [data-app-id="awg_fix3"]').click()
  p.wait_for_function("document.querySelector('#kbridge-workspace').dataset.kbFix==='P12-THEME-TYPE-FIX-LOCAL'")
  assert p.locator('#kbridge-workspace .kb-build-tag').inner_text()=='P12 UX FIX LOCAL'
  frame=p.locator('#kbridge-workspace iframe');src=frame.get_attribute('src')
  before=p.locator('#kbridge-workspace').bounding_box()
  trigger=p.locator('#kbridge-workspace .kb-fit-trigger');trigger.click()
  panel=p.locator('#kbridge-workspace .kb-fit-panel');assert panel.is_visible()
  panel.locator('.kb-fit-row').nth(0).locator('.kb-fit-plus').click()
  p.wait_for_function("document.querySelector('#kbridge-workspace').dataset.kbNativeLeftTrim==='2'")
  left=p.locator('#kbridge-workspace').bounding_box()
  assert left['x']-before['x']==2,(before,left)
  panel.locator('.kb-fit-row').nth(1).locator('.kb-fit-plus').click()
  p.wait_for_function("document.querySelector('#kbridge-workspace').dataset.kbNativeRightTrim==='2'")
  right=p.locator('#kbridge-workspace').bounding_box()
  assert abs(right['width']-(left['width']-2))<=1,(left,right)
  assert frame.get_attribute('src')==src
  # User enters the exact calibrated value rather than rounding to an 8px step.
  precise=panel.locator('input[data-fit-value="nativeRightTrimPx"]')
  precise.fill('22')
  precise.press('Enter')
  p.wait_for_function("document.querySelector('#kbridge-workspace').dataset.kbNativeRightTrim==='22'")
  exact=p.locator('#kbridge-workspace').bounding_box()
  assert abs(exact['width']-(left['width']-22))<=1,(left,exact)
  p.wait_for_function("window.__store.routers[location.origin].apps[0].nativeRightTrimPx===22")
  print('FIX4_EXACT_22PX_ENTER_NO_IFRAME_RELOAD: PASS')
  # Multiple fast adjustments must serialize writes (not lose an increment).
  for _ in range(3): panel.locator('.kb-fit-row').nth(1).locator('.kb-fit-plus').click()
  p.wait_for_function("window.__store.routers[location.origin].apps[0].nativeRightTrimPx===28")
  assert p.locator('#kbridge-workspace').get_attribute('data-kb-native-right-trim')=='28'
  precise.fill('22')
  precise.press('Enter')
  p.wait_for_function("window.__store.routers[location.origin].apps[0].nativeRightTrimPx===22")
  print('FIX4_RAPID_INCREMENT_SERIALIZATION: PASS')
  stored=p.evaluate("window.__store.routers[location.origin].apps[0]")
  assert stored['nativeLeftTrimPx']==2 and stored['nativeRightTrimPx']==22,stored
  print('FIX4_LIVE_LEFT_RIGHT_TRIM_2PX: PASS',before['x'],left['x'],left['width'],right['width'])
  print('FIX4_SAVED_AND_IFRAME_UNTOUCHED: PASS')
  p.locator('#kbridge-workspace .kb-width-toggle').click()
  p.wait_for_function("document.querySelector('#kbridge-workspace').dataset.kbWidth==='wide'")
  wide=p.locator('#kbridge-workspace').bounding_box()
  assert wide['width']>exact['width']+200
  p.locator('#kbridge-workspace .kb-width-toggle').click()
  p.wait_for_function("document.querySelector('#kbridge-workspace').dataset.kbWidth==='native'")
  again=p.locator('#kbridge-workspace').bounding_box()
  assert abs(again['width']-exact['width'])<=1
  print('FIX4_WIDE_SWITCH_IGNORES_OFFSETS_AND_RESTORES: PASS')
  panel.locator('.kb-fit-reset').click()
  p.wait_for_function("document.querySelector('#kbridge-workspace').dataset.kbNativeLeftTrim==='0' && document.querySelector('#kbridge-workspace').dataset.kbNativeRightTrim==='0'")
  restored=p.locator('#kbridge-workspace').bounding_box()
  assert abs(restored['width']-before['width'])<=1
  print('FIX4_RESET_RESTORES_NATIVE_BOUNDS: PASS')
  p.evaluate("location.hash='devices'");p.wait_for_function("document.querySelector('#kbridge-workspace').hidden")
  assert not errors,errors
  print('FIX4_NATIVE_NAVIGATION_AND_ERRORS: PASS')
 finally:b.close()
