"""Test P12 in native GM storage mode without a router or real third-party service."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from pathlib import Path
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
import ast
SRC=(Path(__file__).parent/'p12_native_settings_smoke.py').read_text()
HTML=ast.literal_eval(SRC.split("HTML=",1)[1].split("\nINIT=",1)[0].strip())
R=Path(__file__).resolve().parents[1]
class MockHandler(BaseHTTPRequestHandler):
 def do_GET(self):
  body=HTML.encode('utf-8');self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
 def log_message(self,*args):pass
server=HTTPServer(('127.0.0.1',0),MockHandler)
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 try:
  page=browser.new_page(viewport={'width':1450,'height':870})
  page.set_default_timeout(5500)
  errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
  page.set_content(HTML)
  page.evaluate('''()=>{
    window.__gmValues={kbridgeState:{version:1,routers:{['http://192.168.1.1']:{label:'NETCRAZE',theme:'auto',apps:[
      {id:'awg_test',name:'AWG Manager',url:'http://192.168.1.1:2222/',icon:'🌐',mode:'embedded',favorite:false,enabled:true},
      {id:'core_test',name:'RouterForge Core',url:'http://192.168.1.1:2233/',icon:'▣',mode:'embedded',enabled:true}
    ]}}},rfPortalLanguage:'ru'};
    window.GM_getValue=(key,fallback)=>window.__gmValues[key]??fallback;
    window.GM_setValue=(key,value)=>{window.__gmValues[key]=value};
    window.GM_registerMenuCommand=(name,cb)=>{window.__userscriptSettings=cb};
    window.confirm=()=>true;
  }''')
  # Browser sandbox blocks ALL network origins. Replace location only inside a lexical test wrapper.
  source=(R/'release/routerforge-portal.user.js').read_text()
  page.add_script_tag(content='(()=>{const location={origin:"http://192.168.1.1",hostname:"192.168.1.1",href:"http://192.168.1.1/"};'+source+'})()')
  page.locator('#kbridge-entry .kb-nav-settings').click()
  page.locator('#kbridge-workspace .kb-native-settings h2').wait_for()
  page.locator('.kb-ns-app[data-kb-settings-id="awg_test"] button[aria-label^="Избранное"]').click()
  page.wait_for_function("window.__gmValues.kbridgeState.routers['http://192.168.1.1'].apps.find(x=>x.id==='awg_test').favorite===true")
  page.get_by_role('button',name='+ Добавить приложение').click()
  edit=page.locator('.kb-ns-editor')
  edit.locator('input[type=text]').nth(0).fill('Test Panel')
  edit.locator('input[type=text]').nth(1).fill('http://192.168.1.1:8111/')
  edit.get_by_role('button',name='Сохранить').click()
  page.wait_for_function("window.__gmValues.kbridgeState.routers['http://192.168.1.1'].apps.some(x=>x.name==='Test Panel')")
  page.locator('.kb-ns-preferences select').nth(1).select_option('en')
  page.get_by_role('heading',name='Portal settings').wait_for()
  assert not errs,errs
  print('P12_TAMPERMONKEY_NATIVE_SETTINGS_FAVORITE_ADD_LANGUAGE: PASS')
 finally:browser.close();server.shutdown()
