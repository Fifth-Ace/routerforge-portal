"""P9D: verify the actual Netcraze DOM selectors, responsive native bounds and fallback.
No router access or network needed.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
HTML='''<!doctype html><html lang="ru" data-theme="dark"><head><style>
*{box-sizing:border-box}body{margin:0;background:#1b2638;font:13px Arial}header{position:fixed;top:0;left:0;right:0;height:40px;background:#1b2638;color:#fff}aside{position:fixed;top:40px;bottom:0;left:0;width:215px;background:#111827}aside button{display:block;padding:10px;color:white;background:transparent;border:0}
.layout__content__wrapper{position:fixed;top:40px;left:215px;right:36px;bottom:0;background:#1b2638;overflow:hidden}
.layout__content__inner{position:absolute;inset:0;overflow:hidden}
.layout__content__main{position:absolute;top:0;bottom:0;left:20px;right:18px;padding:16px 24px 10px 14px;background:#202838;overflow:auto;color:#ddd}
ndw-page-wrapper{display:block;width:1648px;min-height:100%;}
</style></head><body><header>NETCRAZE ULTRA</header><aside><button>Интернет</button><button>Управление</button><button>Локальная сеть</button><button>Диагностика</button></aside><div class="layout__content__wrapper"><div class="layout__content__inner"><div class="layout__content__main layout__content__main--shifted"><ng-component><ndw-page-wrapper><h2>Контроль доступа</h2><p>Штатная страница</p></ndw-page-wrapper></ng-component></div></div></div></body></html>'''
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 try:
  page=browser.new_page(viewport={'width':1730,'height':930})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(HTML)
  page.evaluate('''() => {window.__appState={version:1,routers:{[location.origin]:{label:'NETCRAZE',theme:'auto',apps:[{id:'awg_p9d',name:'AWG',url:'https://example.test/',mode:'embedded',icon:'🌐',layoutWidth:'native',nativeRightTrimPx:22,nativeWidthPct:85}]}}};window.__listeners=[];window.chrome={storage:{local:{get:async()=>({kbridgeState:window.__appState}),set:async obj=>{window.__appState=obj.kbridgeState;window.__listeners.forEach(fn=>fn({kbridgeState:{newValue:window.__appState}},'local'));}},onChanged:{addListener:fn=>window.__listeners.push(fn)}},runtime:{sendMessage:async()=>({ok:true}),onMessage:{addListener:()=>{}}}};}''')
  page.add_style_tag(path=str(R/'content/bridge.css'))
  page.add_script_tag(path=str(R/'content/bridge.js'))
  page.locator('#kbridge-entry [data-app-id="awg_p9d"]').click()
  page.wait_for_function("document.querySelector('#kbridge-workspace')?.dataset.kbBoundaryMode==='auto'")
  def check(tag):
   vals=page.evaluate('''() => {const main=document.querySelector('.layout__content__main').getBoundingClientRect(), p=document.querySelector('#kbridge-workspace').getBoundingClientRect();return {mainL:main.left+14,mainR:main.right-24,appL:p.left,appR:p.right,viewport:innerWidth,placement:document.querySelector('#kbridge-workspace').dataset.kbPlacement}}''')
   assert vals['placement']=='native',vals
   assert abs(vals['appL']-vals['mainL'])<=2,(tag,vals)
   assert abs(vals['appR']-vals['mainR'])<=2,(tag,vals)
   print(tag+': PASS',int(vals['appL']),int(vals['appR']),int(vals['viewport']))
  check('P9D_NETCRAZE_WIDE_VIEWPORT')
  frame=page.locator('#kbridge-workspace iframe'); src=frame.get_attribute('src')
  page.set_viewport_size({'width':1120,'height':780})
  page.wait_for_function("() => {const m=document.querySelector('.layout__content__main').getBoundingClientRect(), w=document.querySelector('#kbridge-workspace').getBoundingClientRect();return Math.abs(w.right-(m.right-24))<=2}")
  check('P9D_NETCRAZE_WINDOWED')
  assert frame.get_attribute('src')==src
  page.evaluate('''() => {document.querySelector('aside').style.width='65px';document.querySelector('.layout__content__wrapper').style.left='65px';}''')
  page.wait_for_function("() => {const m=document.querySelector('.layout__content__main').getBoundingClientRect(), w=document.querySelector('#kbridge-workspace').getBoundingClientRect();return Math.abs(w.left-(m.left+14))<=2}")
  check('P9D_NETCRAZE_COLLAPSED')
  # Existing 22px must be ignored unless explicitly manually enabled.
  assert page.evaluate("document.querySelector('#kbridge-workspace').dataset.kbBoundaryMode")=='auto'
  print('P9D_LEGACY_22PX_NOT_FORCED: PASS')
  assert not errors,errors
 finally: browser.close()
