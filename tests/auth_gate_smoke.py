"""Authentication guard for a Keenetic-like SPA. Must not insert UI before sign-in."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
LOGIN='<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><style>body{background:#1b2536;color:#fff}header{height:35px}input{width:240px;height:40px}</style></head><body><div id="login"><h2>Вход в веб-конфигуратор</h2><input name="username"><input type="password" name="password"></div></body></html>'
STATE={'version':1,'routers':{'null':{'label':'Netcraze','theme':'dark','apps':[{'id':'awg','name':'AWG','url':'https://example.test/awg','mode':'auto','icon':'▣'}]}}}
SHIM='(state)=>{window.chrome={storage:{local:{get:async()=>({kbridgeState:state})},onChanged:{addListener:()=>{}}},runtime:{onMessage:{addListener:()=>{}},sendMessage:async()=>({ok:true})}}}'
with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':1440,'height':900})
  page.set_content(LOGIN)
  page.evaluate(SHIM,STATE)
  page.add_style_tag(path=str(ROOT/'content/bridge.css'))
  page.add_script_tag(path=str(ROOT/'content/bridge.js'))
  page.wait_for_timeout(350)
  assert page.locator('#kbridge-entry,#kbridge-workspace,#kbridge-drawer').count()==0,'MUST NOT RENDER ON LOGIN'
  page.locator('#login').evaluate('el=>el.remove()')
  page.evaluate("()=>{let nav=document.createElement('aside');nav.style.cssText='position:fixed;left:0;top:35px;width:215px;height:800px;background:#141b25';nav.innerHTML='<button>Статус</button><button>Интернет</button><button>Wi-Fi</button><button>Управление</button>';document.body.append(nav);let main=document.createElement('main');main.style.cssText='margin:35px 0 0 215px;height:700px';document.body.append(main)}")
  page.locator('#kbridge-entry').wait_for(timeout=5000)
  page.locator('[data-app-id="awg"]').click()
  assert page.locator('#kbridge-workspace').is_visible(),'signed in app opens'
  page.evaluate('()=>{document.querySelector(\'aside\').remove();let login=document.createElement(\'div\');login.id=\'login\';login.innerHTML=\'<h2>Вход в веб-конфигуратор</h2><input type="password" name="password">\';document.body.append(login)}')
  page.wait_for_function("!document.querySelector('#kbridge-entry') && !document.querySelector('#kbridge-workspace')",timeout=5000)
  print('AUTH_GATE_SMOKE: PASS — login hidden / post-login mounted / logout fully removed')
  browser.close()
