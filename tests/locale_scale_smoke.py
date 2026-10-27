from pathlib import Path
import base64,re
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width,height,locale in [(1920,1080,'ru'),(2560,1440,'en')]:
  page=b.new_page(viewport={'width':width,'height':height},color_scheme='dark')
  errors=[]
  page.on('pageerror',lambda exc: errors.append(str(exc)))
  page.set_content((ROOT/'options.html').read_text().replace('src="assets/routerforge-brand.png"','src="data:image/png;base64,'+base64.b64encode((ROOT/'assets/routerforge-brand.png').read_bytes()).decode()+'"').replace('<script type="module" src="options.js"></script>',''))
  page.add_style_tag(content=(ROOT/'ui.css').read_text())
  page.evaluate('''() => {
    window.__config={version:1,routers:{'http://192.168.1.1':{label:'Netcraze Ultra',theme:'dark',apps:[{id:'manual_123',name:'123',url:'http://192.168.1.1:2222/',icon:'▣',mode:'auto'}]}}};
    window.__lang='ru';window.__listeners=[];
    window.chrome={i18n:{getUILanguage:()=> 'ru'},storage:{local:{get:async keys=>{
      if(Array.isArray(keys))return {kbridgeState:window.__config,rfPortalLanguage:window.__lang};
      if(keys==='rfPortalLanguage')return {rfPortalLanguage:window.__lang};
      return {[keys]:window.__config};
    },set:async v=>{
      if(v.kbridgeState){const oldValue=window.__config;window.__config=v.kbridgeState;window.__listeners.forEach(x=>x({kbridgeState:{oldValue,newValue:window.__config}},'local'))}
      if(v.rfPortalLanguage){window.__lang=v.rfPortalLanguage;window.__listeners.forEach(x=>x({rfPortalLanguage:{newValue:window.__lang}},'local'))}
    }},onChanged:{addListener:f=>window.__listeners.push(f)}},tabs:{create:()=>{}},permissions:{remove:async()=>true}};
  }''')
  pieces=[]
  for name in ['shared/i18n.js','shared/model.js','shared/catalog.js','options.js']:
   s=(ROOT/name).read_text();s=re.sub(r'^import .*?;\s*$','',s,flags=re.M);s=re.sub(r'^export ','',s,flags=re.M);pieces.append(s)
  page.add_script_tag(content='\n'.join(pieces))
  page.locator('.catalog-card').first.wait_for()
  assert page.locator('.catalog-card').count()==7
  page.locator('#ui-language').select_option(locale)
  page.wait_for_function(f"document.documentElement.lang === '{locale}'")
  h1=page.locator('.page-intro h1').inner_text()
  assert h1 == ('Центр приложений' if locale=='ru' else 'Application Center'), h1
  field_height=page.locator('.catalog-port').first.evaluate('(e)=>getComputedStyle(e).height')
  assert float(field_height[:-2])>=38,field_height
  page.wait_for_timeout(200)
  assert not errors,errors
  geometry=page.evaluate('''() => ({doc:document.documentElement.scrollWidth,viewport:innerWidth,dashboard:Math.round(document.querySelector('.dashboard').getBoundingClientRect().width),input:Math.round(document.querySelector('.catalog-port').getBoundingClientRect().height),font:getComputedStyle(document.querySelector('.catalog-name')).fontSize})''')
  assert geometry['doc']<=width+1,geometry
  page.screenshot(path=str(ROOT.parent/f'routerforge-portal-v0.8.0-{locale}-{width}.png'),full_page=True)
  print('LOCALE_SCALE:',width,height,locale,h1,geometry)
  page.close()
 b.close()
