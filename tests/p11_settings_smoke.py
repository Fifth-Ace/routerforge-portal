"""P11 interactive options and userscript smoke in an isolated local Chromium server."""
from pathlib import Path
import json
import base64
from urllib.parse import quote
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
origin='http://192.168.1.1'
data={"version":1,"routers":{origin:{"label":"NETCRAZE","theme":"dark","apps":[
 {"id":"core_test","name":"Core","url":"http://192.168.1.1:2233/","mode":"auto","icon":"▣","group":"routerforge","enabled":True},
 {"id":"awg_test","name":"AWG","url":"http://192.168.1.1:2222/","mode":"auto","icon":"🌐","group":"network","enabled":True,"favorite":True},
 {"id":"nfq_test","name":"NFQWS","url":"http://192.168.1.1:90/","mode":"auto","icon":"⚡","group":"network","enabled":True}
]}}}
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 try:
  pg=b.new_page(viewport={'width':1350,'height':900})
  errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
  import re
  options=(R/'options.html').read_text().replace('<script type="module" src="options.js"></script>','')
  pg.set_content(options)
  pg.evaluate('''(state)=>{window.__store={kbridgeState:state,rfPortalLanguage:'ru'};window.__listeners=[];window.confirm=()=>true;window.chrome={storage:{local:{get:async(key)=>{const a=Array.isArray(key)?key:[key];const out={};for(const x of a)out[x]=window.__store[x];return out;},set:async(obj)=>{const old=window.__store.kbridgeState;Object.assign(window.__store,obj);window.__listeners.forEach(fn=>fn({kbridgeState:{oldValue:old,newValue:window.__store.kbridgeState}},'local'));}},onChanged:{addListener:fn=>window.__listeners.push(fn)}},permissions:{request:async()=>true},runtime:{getManifest:()=>({version:'0.9.0'}),sendMessage:async()=>({ok:true})},tabs:{create:async()=>({})}};}''',data)
  pg.add_style_tag(path=str(R/'ui.css'))
  def url(x):return 'data:text/javascript;charset=utf-8,'+quote(x,safe='')
  model=url((R/'shared/model.js').read_text())
  cat=url((R/'shared/catalog.js').read_text().replace("'./model.js'",repr(model)))
  i18n=url((R/'shared/i18n.js').read_text())
  updates=url((R/'shared/updates.js').read_text())
  code=(R/'options.js').read_text()
  for name,target in [('model',model),('catalog',cat),('i18n',i18n),('updates',updates)]:
   code=code.replace(f"'./shared/{name}.js'",repr(target))
  pg.add_script_tag(type='module',content=code)
  pg.locator('#app-list .entry').first.wait_for(timeout=7000)
  names=pg.locator('#app-list .entry .name').all_text_contents()
  assert 'AWG' in names[0],names
  pg.locator('#app-search').fill('Core')
  assert pg.locator('#app-list .entry').count()==1
  pg.locator('#app-search').fill('')
  core=pg.locator('#app-list .entry').filter(has_text='Core')
  core.locator('button[aria-pressed]').click()
  pg.wait_for_function("window.__store.kbridgeState.routers['http://192.168.1.1'].apps.find(a=>a.id==='core_test').favorite===true")
  nfq=pg.locator('#app-list .entry').filter(has_text='NFQWS')
  nfq.locator('.p11-group-select').select_option('security')
  pg.wait_for_function("window.__store.kbridgeState.routers['http://192.168.1.1'].apps.find(a=>a.id==='nfq_test').group==='security'")
  before=pg.evaluate("window.__store.kbridgeState.routers['http://192.168.1.1'].apps.find(a=>a.id==='awg_test').url")
  pg.locator('#quick-setup').click()
  pg.wait_for_function("window.__store.kbridgeState.routers['http://192.168.1.1'].apps.some(a=>a.presetId==='routerforge')")
  after=pg.evaluate("window.__store.kbridgeState.routers['http://192.168.1.1'].apps.find(a=>a.id==='awg_test').url")
  assert pg.evaluate("window.__store.kbridgeState.routers['http://192.168.1.1'].apps.filter(a=>a.name==='AWG').length")==1
  assert before==after,(before,after)
  assert not errors,errors
  print('P11_OPTIONS_SEARCH_FAVORITE_GROUP_QUICK_SETUP: PASS')
  # Tampermonkey settings access its shadow root via instrumentation, no actual privileges.
  us=b.new_page(viewport={'width':1350,'height':900});user_errors=[]
  us.on('pageerror',lambda e:user_errors.append(str(e)))
  us.set_content('<html><body><p>WebUI</p></body></html>')
  us.evaluate('''(state)=>{window.__gms={kbridgeState:state,rfPortalLanguage:'ru'};window.GM_getValue=(k,d)=>window.__gms[k]??d;window.GM_setValue=(k,v)=>{window.__gms[k]=v};window.GM_registerMenuCommand=(s,fn)=>window.__openSettings=fn;const old=Element.prototype.attachShadow;Element.prototype.attachShadow=function(x){return old.call(this,{...x,mode:'open'})};}''',data)
  us.add_script_tag(path=str(R/'release/routerforge-portal.user.js'))
  us.evaluate('window.__openSettings()')
  root=us.locator('#rf-portal-userscript-settings-host')
  assert root.count()==1
  assert root.locator('.appRow').count()==3
  star=root.locator('.appRow').filter(has_text='Core').locator('button[aria-pressed]')
  star.click()
  us.wait_for_function("window.__gms.kbridgeState.routers['http://192.168.1.1'].apps.find(a=>a.id==='core_test').favorite===true")
  root.locator('.appRow').filter(has_text='NFQWS').locator('select').select_option('security')
  us.wait_for_function("window.__gms.kbridgeState.routers['http://192.168.1.1'].apps.find(a=>a.id==='nfq_test').group==='security'")
  assert not user_errors,user_errors
  print('P11_TAMPERMONKEY_FAVORITE_GROUP_SAVE: PASS')
 finally:
  b.close()
