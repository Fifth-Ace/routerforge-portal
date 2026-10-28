"""Offline bilingual popup smoke, mock Chrome APIs. No router connection."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from base64 import b64encode
import re
ROOT=Path(__file__).resolve().parents[1]
model=(ROOT/'shared/model.js').read_text().replace('export ','')
i18n=(ROOT/'shared/i18n.js').read_text().replace('export ','')
js_popup='\n'.join(s for s in (ROOT/'popup.js').read_text().splitlines() if not s.startswith('import '))
html=(ROOT/'popup.html').read_text().replace('<script type="module" src="popup.js"></script>','')
html=html.replace('src="assets/routerforge-brand.png"','src="data:image/png;base64,'+b64encode((ROOT/'assets/routerforge-brand.png').read_bytes()).decode()+'"')
setup='''(version) => {
  const state={version:1,routers:{'http://192.168.1.1':{label:'Netcraze Ultra',theme:'dark',apps:[{id:'awg_demo_1',name:'AWG Manager',url:'http://192.168.1.1:8080/',mode:'embedded',icon:'▣'}]}}};
  window.__reloaded=false;window.__pingVersion=version;window.__lang='ru';const listeners=[];
  window.chrome={
    i18n:{getUILanguage:()=> 'ru'},
    runtime:{getManifest:()=>({version:'0.8.0'}),sendMessage:async()=>({ok:true}),openOptionsPage:()=>{}},
    storage:{local:{get:async k=>{if(k==='rfPortalLanguage')return {rfPortalLanguage:window.__lang};return {kbridgeState:state};},set:async obj=>{if(obj.rfPortalLanguage){window.__lang=obj.rfPortalLanguage;listeners.forEach(f=>f({rfPortalLanguage:{newValue:window.__lang}},'local'))}}},onChanged:{addListener:f=>listeners.push(f)}},
    tabs:{query:async()=>[{id:7,url:'http://192.168.1.1/'}],sendMessage:async(_id,msg)=>msg.type==='BRIDGE_VERSION'?{ok:true,version:window.__pingVersion}:{ok:true},reload:async()=>{window.__reloaded=true},create:()=>{}},
    permissions:{contains:async()=>true,request:async()=>true},scripting:{insertCSS:async()=>{},executeScript:async()=>{}}
  };window.close=()=>{};
}'''
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for active_version,needs_reload in [('0.1.0',True),('0.8.0',False)]:
  page=b.new_page(viewport={'width':460,'height':900},color_scheme='dark')
  errors=[];page.on('pageerror',lambda exc:errors.append(str(exc)))
  page.set_content(html);page.add_style_tag(content=(ROOT/'ui.css').read_text());page.evaluate(setup,active_version)
  page.add_script_tag(content=i18n+'\n'+model+'\n'+js_popup)
  page.locator('#popup-version').get_by_text('v0.8.0').wait_for()
  page.wait_for_timeout(150)
  assert page.locator('#repair-btn').is_visible() == needs_reload,active_version
  assert page.locator('#connected').is_visible()
  page.locator('#popup-language').select_option('en')
  page.wait_for_function("document.documentElement.lang === 'en'")
  page.wait_for_function("document.querySelector('#router-title').textContent==='Netcraze Ultra'")
  assert page.get_by_text('Manage applications').count()>=1
  assert page.get_by_text('SEPARATE TAB').count()==0 # embedded app, not separate
  assert page.get_by_text('INSIDE KEENETIC').count()>=1
  assert page.locator('#popup-version').inner_text()=='v0.8.0'
  if needs_reload:
   page.locator('#repair-btn').click();page.wait_for_function('window.__reloaded===true')
  else:
   page.screenshot(path=str(ROOT.parent/'routerforge-portal-v0.8.0-popup-en.png'))
  assert not errors,errors
  page.close()
 b.close()
 print('POPUP_LOCALE: PASS (matched/mismatched versions, RU→EN, iframe mode, repair)')
