"""P12: real browser interactions inside mock NETCRAZE, no physical router or public endpoints."""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
HTML='''<!doctype html><html lang="ru" data-theme="dark"><head><style>
*{box-sizing:border-box}body{margin:0;background:#1b2638;font:13px Arial;color:#eee}
header{position:fixed;inset:0 0 auto;height:40px;background:#192536;padding:10px}
aside{position:fixed;top:40px;left:0;bottom:0;width:215px;background:#162031}
aside button{display:block;width:100%;padding:13px;color:#eee;background:transparent;border:0;text-align:left}
.layout__content__wrapper{position:fixed;top:40px;bottom:0;left:215px;right:36px;overflow:hidden}
.layout__content__inner{position:absolute;inset:0;overflow:hidden}
.layout__content__main{position:absolute;inset:0 18px 0 20px;padding:16px 24px 10px 14px;background:#202838;overflow:auto}
</style></head><body><header>NETCRAZE ULTRA — Demo</header>
<aside><button>Интернет</button><button>Управление</button><button>Локальная сеть</button><button>Диагностика</button></aside>
<div class="layout__content__wrapper"><div class="layout__content__inner"><div class="layout__content__main layout__content__main--shifted"><ndw-page-wrapper>Страница Keenetic</ndw-page-wrapper></div></div></div>
</body></html>'''
INIT='''() => {
 window.__routerState={version:1,routers:{[location.origin]:{label:'NETCRAZE',theme:'dark',apps:[
 {id:'awg_test',name:'AWG Manager',url:'about:blank#awg',icon:'🌐',mode:'embedded',group:'network',favorite:false,enabled:true},
 {id:'core_test',name:'RouterForge Core',url:'about:blank#core',icon:'▣',mode:'embedded',group:'routerforge',favorite:true,enabled:true},
 {id:'nfq_test',name:'nfqws2',url:'about:blank#nfq',icon:'⚡',mode:'embedded',group:'network',enabled:true}
 ]}}};
 window.__lang='ru';window.__listeners=[];
 window.chrome={storage:{local:{get:async(keys)=>{
  const data={kbridgeState:window.__routerState,rfPortalLanguage:window.__lang};
  const names=Array.isArray(keys)?keys:[keys];return Object.fromEntries(names.map(x=>[x,data[x]]));
 },set:async(obj)=>{
   const before=window.__routerState;
   if('kbridgeState' in obj)window.__routerState=obj.kbridgeState;
   if('rfPortalLanguage' in obj)window.__lang=obj.rfPortalLanguage;
   const changes={};for(const k of Object.keys(obj))changes[k]={oldValue:k==='kbridgeState'?before:null,newValue:obj[k]};
   window.__listeners.forEach(fn=>fn(changes,'local'));
 }},onChanged:{addListener:fn=>window.__listeners.push(fn)}},runtime:{sendMessage:async()=>({ok:true}),onMessage:{addListener:fn=>window.__onMessage=fn}}};
 window.confirm=()=>true;
}'''

def run(page,label):
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(HTML)
 page.evaluate(INIT)
 page.add_style_tag(path=str(R/'content/bridge.css'))
 page.add_script_tag(path=str(R/'content/bridge.js'))
 page.locator('#kbridge-entry [data-app-id="awg_test"]').wait_for()
 page.locator('#kbridge-entry [data-app-id="awg_test"]').click()
 page.wait_for_function("document.querySelector('[data-kb-frame-id=awg_test]')?.contentDocument?.body")
 page.evaluate("()=>{const n=document.createElement('textarea');n.id='untouched';n.value='keep-this-text';document.querySelector('[data-kb-frame-id=awg_test]').contentDocument.body.append(n)}")
 page.locator('#kbridge-entry .kb-nav-settings').click()
 page.locator('#kbridge-workspace .kb-native-settings h2').wait_for()
 page.screenshot(path=str(R/'P12_NATIVE_SETTINGS_PREVIEW.png'),full_page=False)
 assert page.locator('#kbridge-workspace').get_attribute('data-kb-native-settings')=='true'
 assert page.locator('#kbridge-workspace .kb-frame-stack').is_hidden()
 assert page.locator('.kb-frame-stack iframe').count()==1
 print(label+'P12_NATIVE_SETTINGS_IN_WEBUI: PASS')

 page.locator('.kb-ns-app[data-kb-settings-id="awg_test"] button[aria-label^="Избранное"]').click()
 page.wait_for_function("window.__routerState.routers[location.origin].apps.find(x=>x.id==='awg_test').favorite===true")
 assert page.locator('.kb-frame-stack iframe').count()==1
 print(label+'P12_FAVORITE_PRESERVES_IFRAME: PASS')

 page.locator('.kb-ns-search').fill('nfqws2')
 assert page.locator('.kb-ns-app').count()==1
 page.locator('.kb-ns-search').fill('')
 page.locator('.kb-ns-app[data-kb-settings-id="nfq_test"] select').select_option('security')
 page.wait_for_function("window.__routerState.routers[location.origin].apps.find(x=>x.id==='nfq_test').group==='security'")
 print(label+'P12_SEARCH_AND_GROUP: PASS')

 page.get_by_role('button',name='+ Добавить приложение').click()
 edit=page.locator('.kb-ns-editor')
 edit.locator('input[type=text]').nth(0).fill('Custom Service')
 edit.locator('input[type=text]').nth(1).fill('http://192.168.1.1:8088/custom')
 edit.get_by_role('button',name='Сохранить').click()
 page.wait_for_function("window.__routerState.routers[location.origin].apps.some(x=>x.name==='Custom Service')")
 assert page.locator('.kb-ns-editor').count()==0
 custom=page.locator('.kb-ns-app').filter(has_text='Custom Service')
 custom.get_by_role('button',name='Изменить Custom Service').click()
 edit=page.locator('.kb-ns-editor')
 edit.locator('input[type=text]').nth(1).fill('javascript:alert(1)')
 edit.get_by_role('button',name='Сохранить').click()
 assert 'http://' in page.evaluate("window.__routerState.routers[location.origin].apps.find(x=>x.name==='Custom Service').url")
 assert page.locator('.kb-ns-notice').is_visible()
 edit.locator('input[type=text]').nth(1).fill('https://192.168.1.1:8443/')
 edit.get_by_role('button',name='Сохранить').click()
 page.wait_for_function("window.__routerState.routers[location.origin].apps.find(x=>x.name==='Custom Service').url==='https://192.168.1.1:8443/'")
 print(label+'P12_CUSTOM_ADD_EDIT_AND_URL_GUARD: PASS')

 page.get_by_role('button',name='⚡ Быстро добавить').click()
 page.wait_for_function("window.__routerState.routers[location.origin].apps.some(x=>x.presetId==='nfqws-web')")
 assert page.evaluate("window.__routerState.routers[location.origin].apps.filter(x=>x.name==='AWG Manager').length")==1
 print(label+'P12_QUICK_SETUP_NON_DESTRUCTIVE: PASS')

 page.locator('.kb-ns-preferences select').nth(0).select_option('light')
 page.wait_for_function("window.__routerState.routers[location.origin].theme==='light'")
 page.locator('.kb-ns-preferences select').nth(1).select_option('en')
 page.wait_for_function("window.__lang==='en'")
 page.get_by_role('heading',name='Portal settings').wait_for()
 print(label+'P12_THEME_AND_LOCALE: PASS')

 page.locator('.kb-ns-header button').click()
 page.wait_for_function("document.querySelector('#kbridge-workspace').dataset.kbNativeSettings==='false'")
 value=page.evaluate("document.querySelector('[data-kb-frame-id=awg_test]').contentDocument.querySelector('#untouched')?.value")
 assert value=='keep-this-text',value
 print(label+'P12_BACK_PRESERVES_APP_STATE: PASS')
 page.evaluate("location.hash='#native-page'")
 page.wait_for_function("document.querySelector('#kbridge-workspace')?.hidden === true")
 assert page.locator('.kb-frame-stack iframe').count()==0
 assert not errors,errors
 print(label+'P12_NAVIGATION_CLEANUP: PASS')

with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 try:
  page=browser.new_page(viewport={'width':1536,'height':900})
  run(page,'CHROMIUM_')
 finally:browser.close()
