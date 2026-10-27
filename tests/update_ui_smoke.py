"""Browser-only update UI test: no network, no router, no actual GitHub."""
from pathlib import Path
import base64,re
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
state={'version':1,'routers':{'http://192.168.1.1':{'label':'Netcraze Ultra','theme':'dark','apps':[{'id':'app_legacy_123','name':'123','url':'http://192.168.1.1:2222/','mode':'auto','icon':'▣'}]}}}
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1920,'height':1080})
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 html=(ROOT/'options.html').read_text().replace('<script type="module" src="options.js"></script>','')
 html=html.replace('src="assets/routerforge-brand.png"','src="data:image/png;base64,'+base64.b64encode((ROOT/'assets/routerforge-brand.png').read_bytes()).decode()+'"')
 page.set_content(html)
 page.add_style_tag(content=(ROOT/'ui.css').read_text())
 page.evaluate('''(data)=>{
   const listeners=[];
   window.chrome={
    runtime:{getManifest:()=>({version:'0.8.0'})},
    i18n:{getUILanguage:()=> 'ru'},
    permissions:{request:async ({origins})=>origins[0]==='https://api.github.com/*',remove:async()=>true},
    tabs:{create:()=>{}},
    storage:{local:{get:async key=>key==='rfPortalLanguage'?{rfPortalLanguage:'ru'}:{kbridgeState:data},set:async()=>{}},onChanged:{addListener:f=>listeners.push(f)}}};
   window.checkForUpdates=async ()=>({version:'0.8.1',hasUpdate:true,sha256:'a'.repeat(64),assetUrl:'https://github.com/Fifth-Ace/routerforge-portal/releases/download/v0.8.1/routerforge-portal-v0.8.1-install.zip'});
 }''',state)
 js=[]
 for name in ['shared/i18n.js','shared/model.js','shared/catalog.js','options.js']:
  s=(ROOT/name).read_text();s=re.sub(r'^import .*?;\s*$','',s,flags=re.M);s=re.sub(r'^export ','',s,flags=re.M);js.append(s)
 page.add_script_tag(content='\n'.join(js))
 page.locator('#check-updates').wait_for()
 page.locator('#check-updates').click()
 page.wait_for_function("document.querySelector('#update-remote').textContent==='v0.8.1'")
 assert page.locator('#update-download').get_attribute('href').startswith('https://github.com/Fifth-Ace/routerforge-portal/releases/download/')
 assert page.locator('#update-hash').inner_text()=='SHA-256: '+'a'*64
 assert page.locator('#app-list .entry').count()==1
 page.screenshot(path=str(ROOT.parent/'routerforge-portal-v0.8.0-updates-preview.png'),full_page=True)
 page.locator('#ui-language').select_option('en')
 assert page.locator('.update-panel h2').inner_text()=='Portal updates'
 assert not errors,errors
 print('UPDATE_UI: PASS, GitHub permission checked, 123 app retained, language switched')
 b.close()
