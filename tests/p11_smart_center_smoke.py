"""Offline Playwright UI test of P11 native bridge (not a physical router)."""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
html='''<!doctype html><html data-theme="dark"><head><style>body{margin:0;background:#1b2638;}header{height:40px;background:#192536}aside{position:absolute;top:40px;left:0;width:215px;height:800px;background:#162031}aside button{display:block;padding:11px;width:100%}main{margin-left:215px;height:800px;background:#1b2638}</style></head><body><header>NETCRAZE ULTRA</header><aside><button>Интернет</button><button>Сеть</button><button>Управление</button><button>Диагностика</button></aside><main>Роутер</main></body></html>'''
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 try:
  page=b.new_page(viewport={'width':1500,'height':850});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)));page.set_content(html)
  page.evaluate('''()=>{window.__listeners=[];window.__state={version:1,routers:{[location.origin]:{label:'NETCRAZE',theme:'dark',apps:[
    {id:'core_test',name:'Core',url:'about:blank#core',mode:'embedded',group:'routerforge',enabled:true,icon:'▣'},
    {id:'awg_test',name:'AWG',url:'about:blank#awg',mode:'embedded',group:'network',favorite:true,enabled:true,icon:'🌐'},
    {id:'nfq_test',name:'NFQWS',url:'about:blank#nfq',mode:'embedded',group:'network',enabled:true,icon:'⚡'},
    {id:'misc_test',name:'Custom',url:'about:blank#misc',mode:'embedded',group:'other',enabled:true,icon:'▣'}
  ]}}};window.chrome={storage:{local:{get:async()=>({kbridgeState:window.__state,rfPortalLanguage:'ru'})},onChanged:{addListener:fn=>window.__listeners.push(fn)}},runtime:{sendMessage:async()=>({ok:true}),onMessage:{addListener:()=>{}}}};}''')
  page.add_style_tag(path=str(R/'content/bridge.css'));page.add_script_tag(path=str(R/'content/bridge.js'))
  page.locator('#kbridge-entry [data-app-id="awg_test"]').wait_for(timeout=4000)
  names=page.locator('#kbridge-entry [data-app-id]').evaluate_all('(els)=>els.map(e=>e.dataset.appId)')
  assert names==['awg_test','core_test','nfq_test','misc_test'],names
  headers=page.locator('#kbridge-entry .kb-group-label').all_text_contents()
  assert headers==['ИЗБРАННОЕ','ROUTERFORGE','СЕТЬ И VPN','ДРУГОЕ'],headers
  page.locator('[data-app-id="awg_test"]').click()
  assert page.locator('#kbridge-workspace iframe').count()==1
  # A saved change must reorder without throwing away already-open iframe.
  page.evaluate('''()=>{const a=window.__state.routers[location.origin].apps;a.find(x=>x.id==='nfq_test').favorite=true;for(const fn of window.__listeners)fn({kbridgeState:{newValue:window.__state}},'local');}''')
  page.wait_for_function("document.querySelectorAll('#kbridge-entry .kb-nav-item')[1]?.dataset.appId==='nfq_test'")
  assert page.locator('#kbridge-workspace iframe').count()==1
  assert page.locator('#kbridge-entry [data-app-id="awg_test"]').count()==1
  assert not errors,errors
  print('P11_BROWSER_FAVORITES_GROUPS_DYNAMIC_UPDATE: PASS')
 finally:b.close()
