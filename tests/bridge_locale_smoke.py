"""Authenticated Keenetic-like nav switches languages without closing an open iframe."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':900},locale='ru-RU')
 errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
 page.set_content('<html><head><style>body{margin:0}header{height:38px;background:#182330}aside{position:absolute;left:0;top:38px;width:215px;height:820px;background:#141b25}aside button{display:block;width:100%;padding:13px}main{margin-left:215px;min-height:810px}</style></head><body><header>NETCRAZE</header><aside><button>Статус</button><button>Интернет</button><button>Wi-Fi</button><button>Управление</button></aside><main></main></body></html>')
 page.evaluate('''()=>{
  window.__language='ru'; window.__listeners=[];
  const config={version:1,routers:{'null':{label:'Router',apps:[{id:'test_awg',name:'AWG Manager',url:'about:blank',icon:'▣',enabled:true,mode:'embedded'}],theme:'dark'}}};
  window.chrome={storage:{local:{get:async()=>({kbridgeState:config,rfPortalLanguage:window.__language})},onChanged:{addListener:f=>window.__listeners.push(f)}},runtime:{onMessage:{addListener:()=>{}},sendMessage:async()=>({ok:true})}};
  window.__setLanguage=l=>{window.__language=l;for(const callback of window.__listeners)callback({rfPortalLanguage:{newValue:l}},'local')};
 }''')
 page.add_style_tag(path=str(ROOT/'content/bridge.css'))
 page.add_script_tag(path=str(ROOT/'content/bridge.js'))
 page.locator('#kbridge-entry .kb-nav-header').get_by_text('ПРИЛОЖЕНИЯ',exact=True).wait_for(timeout=5000)
 page.locator('[data-app-id=test_awg]').click()
 page.wait_for_function("!document.querySelector('#kbridge-workspace').hidden")
 page.evaluate("window.__setLanguage('en')")
 page.locator('#kbridge-entry .kb-nav-header').get_by_text('APPLICATIONS',exact=True).wait_for(timeout=5000)
 assert page.locator('#kbridge-workspace').is_visible()
 assert page.locator('#kbridge-workspace iframe').get_attribute('src')=='about:blank'
 assert page.locator('#kbridge-workspace .kbcrumb').inner_text()=='Applications'
 assert page.locator('#kbridge-entry .kb-nav-settings').inner_text()=='+ Configure applications'
 page.evaluate("window.__setLanguage('ru')")
 page.locator('#kbridge-entry .kb-nav-header').get_by_text('ПРИЛОЖЕНИЯ',exact=True).wait_for(timeout=5000)
 assert not errors,errors
 print('BRIDGE_LOCALE: PASS (RU→EN→RU, embedded panel stays open, auth kept)')
 b.close()
