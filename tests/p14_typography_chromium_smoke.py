"""P14: inspect real Chromium computed toolbar typography in simulated NETCRAZE UI."""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
HTML='''<!doctype html><html data-theme="dark"><head><style>
body{margin:0;background:#1c2636;font:13px Arial} header{height:42px} aside{position:absolute;left:0;top:42px;width:215px;height:90vh} aside button{display:block;width:180px;padding:12px} main{margin-left:235px;min-height:85vh}
</style></head><body><header>NETCRAZE ULTRA</header><aside><button>Интернет</button><button>Управление</button><button>Диагностика</button></aside><main>Рабочая область</main></body></html>'''
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 try:
  p=b.new_page(viewport={'width':1440,'height':850});errors=[];p.on('pageerror',lambda e:errors.append(str(e)));p.set_content(HTML)
  p.evaluate('''() => { window.__storage={version:1,routers:{[location.origin]:{label:'NETCRAZE',theme:'dark',apps:['AWG','CORE'].map((name,i)=>({id:'p14_test_'+i,name,url:'about:blank#'+name,mode:'embedded',icon:'▣',enabled:true,layoutWidth:'native'}))}}};window.chrome={storage:{local:{get:async()=>({kbridgeState:window.__storage}),set:async()=>{}},onChanged:{addListener:()=>{}}},runtime:{sendMessage:async()=>({ok:true}),onMessage:{addListener:()=>{}}}};}''')
  p.add_style_tag(path=str(R/'content/bridge.css'));p.add_script_tag(path=str(R/'content/bridge.js'))
  p.locator('#kbridge-entry [data-app-id="p14_test_0"]').click();p.locator('#kbridge-entry [data-app-id="p14_test_1"]').click()
  p.locator('#kbridge-workspace .kb-fit-trigger').click()
  m=p.evaluate('''() => {const s=x=>getComputedStyle(document.querySelector(x));return {tag:s('.kb-build-tag').fontSize,tab:s('.kb-tab-select').fontSize,fit:s('.kb-fit-reset').fontSize,number:s('.kb-fit-value').fontSize,frames:document.querySelectorAll('.kb-frame-stack iframe').length};}''')
  assert m=={'tag':'10px','tab':'11px','fit':'12px','number':'12px','frames':2},m
  assert not errors,errors
  print('P14_CHROMIUM_COMPUTED_FONTS: PASS',m)
 finally:b.close()
