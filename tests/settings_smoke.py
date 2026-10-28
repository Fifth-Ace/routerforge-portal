"""Offline UI CRUD compatibility smoke using existing kbridgeState data."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
model=(ROOT/'shared/model.js').read_text().replace('export ', '')
i18n=(ROOT/'shared/i18n.js').read_text().replace('export ', '')
catalog=(ROOT/'shared/catalog.js').read_text().replace('export ', '').replace("import { cleanApp, parseAddress, presetGroup } from './model.js';",'')
app='\n'.join(x for x in (ROOT/'options.js').read_text().splitlines() if not x.startswith('import '))
state={'version':1,'routers':{'http://192.168.1.1':{'label':'Netcraze Ultra','theme':'dark','apps':[{'id':'app_legacy_123','name':'123','url':'http://192.168.1.1:2222/','mode':'auto','icon':'▣'}]}}}
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page()
 page.set_content((ROOT/'options.html').read_text().replace('<script type="module" src="options.js"></script>',''))
 page.evaluate('''(state) => {
  const listeners=[];window.__storage=structuredClone(state);window.crypto.randomUUID=()=>('mock-'+Math.random().toString(36).slice(2,14));
  window.chrome={i18n:{getUILanguage:()=> 'ru'},tabs:{create:()=>{}},permissions:{remove:async()=>true},storage:{local:{get:async key=>key==='rfPortalLanguage'?{rfPortalLanguage:'ru'}:{kbridgeState:window.__storage},set:async(obj)=>{if(obj.kbridgeState){window.__storage=obj.kbridgeState;listeners.forEach(f=>f({kbridgeState:{}},'local'))}}},onChanged:{addListener:f=>listeners.push(f)}}};
 }''',state)
 page.add_script_tag(content=i18n+'\n'+model+'\n'+catalog+'\n'+app)
 page.locator('#app-list .entry').first.wait_for(timeout=4000)
 assert page.evaluate('window.__storage.routers["http://192.168.1.1"].apps[0].name')=='123'
 page.locator('#name').fill('AWG Manager')
 page.locator('#url').fill('http://192.168.1.1:8080/')
 page.locator('#mode').select_option('embedded')
 page.locator('#save').click()
 page.wait_for_function("window.__storage.routers['http://192.168.1.1'].apps.length === 2")
 assert page.evaluate("window.__storage.routers['http://192.168.1.1'].apps[0].name")=='123'
 assert page.evaluate("window.__storage.routers['http://192.168.1.1'].apps[1].mode")=='embedded'
 assert page.locator('#appcount').inner_text()=='2 приложений'
 print('SETTINGS_CRUD: PASS — legacy profile 123 retained, second application created')
 b.close()
