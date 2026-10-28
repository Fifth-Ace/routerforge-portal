"""P10: functional Chromium smoke of per-app frame preservation and bounded LRU.
Uses mock Keenetic DOM only; does not contact the user's router or any service.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
HTML='''<!doctype html><html lang="ru" data-theme="dark"><head><style>
body{margin:0;background:#1b2638}header{height:40px;background:#192536}
aside{position:absolute;left:0;top:40px;width:215px;height:800px;background:#162031}
aside button{display:block;width:100%;padding:10px}main{margin-left:227px;height:800px;background:#1b2638}
</style></head><body><header>NETCRAZE ULTRA</header><aside>
<button id="native">Интернет</button><button>Wi-Fi</button><button>Управление</button><button>Диагностика</button>
</aside><main>Штатная страница</main></body></html>'''
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    try:
        page=browser.new_page(viewport={'width':1536,'height':900})
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content(HTML)
        page.evaluate('''() => {
          window.__state={version:1,routers:{[location.origin]:{label:'NETCRAZE',theme:'dark',apps:[
            ...['AWG','Core','NFQWS','Fourth'].map((name,i)=>({id:'p10_app_'+i,name,url:'about:blank#'+name,mode:'embedded',icon:'▣',enabled:true,layoutWidth:'native'}))
          ]}}};
          window.__events=[];
          window.chrome={storage:{local:{get:async()=>({kbridgeState:window.__state,rfPortalLanguage:'ru'}),set:async (obj)=>{
            Object.assign(window,{'__state':obj.kbridgeState});window.__events.forEach(fn=>fn({kbridgeState:{newValue:window.__state}},'local'));
          }},onChanged:{addListener:fn=>window.__events.push(fn)}},runtime:{sendMessage:async()=>({ok:true}),onMessage:{addListener:fn=>window.__runtime=fn}}};
        }''')
        page.add_style_tag(path=str(R/'content/bridge.css'))
        page.add_script_tag(path=str(R/'content/bridge.js'))
        page.locator('#kbridge-entry [data-app-id="p10_app_0"]').wait_for()
        def click(i):page.locator(f'#kbridge-entry [data-app-id="p10_app_{i}"]').click()
        click(0)
        page.wait_for_function("document.querySelector('#kbridge-workspace iframe[data-kb-frame-id=p10_app_0]')?.contentDocument?.body")
        # The active frame has an in-document mutable state (textarea) that must survive switching.
        page.evaluate('''() => { const f=document.querySelector('[data-kb-frame-id=p10_app_0]');
          const input=f.contentDocument.createElement('textarea'); input.id='keep'; input.value='sensitive-unsaved-input';
          f.contentDocument.body.append(input); }''')
        click(1)
        click(2)
        state=page.evaluate('''()=>({frames:[...document.querySelectorAll('.kb-frame-stack iframe')].map(n=>({id:n.dataset.kbFrameId,hidden:n.hidden,inert:n.hasAttribute('inert')})),
            tabs:document.querySelectorAll('.kb-tab').length,active:document.querySelector('#kbridge-workspace .kb-tab-select[aria-pressed=true]')?.textContent})''')
        assert state['tabs']==3,state
        assert all(x['inert']==x['hidden'] for x in state['frames']),state
        assert sum(not x['hidden'] for x in state['frames'])==1,state
        click(0)
        retained=page.evaluate("document.querySelector('[data-kb-frame-id=p10_app_0]').contentDocument.querySelector('#keep')?.value")
        assert retained=='sensitive-unsaved-input', retained
        print('P10_IFRAME_STATE_PRESERVED: PASS')
        # Force tab eviction: oldest now app 1, not the active app 0.
        click(3)
        remaining=page.evaluate("[...document.querySelectorAll('.kb-frame-stack iframe')].map(n=>n.dataset.kbFrameId)")
        assert len(remaining)==3 and 'p10_app_1' not in remaining and 'p10_app_0' in remaining,remaining
        print('P10_LRU_CAP_3: PASS',remaining)
        # Tab-strip click must not navigate; close must release just that iframe.
        page.locator('.kb-tab-select').filter(has_text='AWG').click()
        retained=page.evaluate("document.querySelector('[data-kb-frame-id=p10_app_0]').contentDocument.querySelector('#keep')?.value")
        assert retained=='sensitive-unsaved-input', retained
        page.locator('.kb-tab').filter(has_text='Fourth').locator('.kb-tab-close').click()
        assert page.locator('.kb-frame-stack iframe').count()==2
        print('P10_TAB_SWITCH_AND_CLOSE: PASS')
        # A router route change must discard all app frames; the native page remains.
        page.evaluate("location.hash='#native-security'")
        page.wait_for_function("document.querySelector('#kbridge-workspace')?.hidden === true")
        assert page.locator('.kb-frame-stack iframe').count()==0
        assert page.locator('main').is_visible()
        print('P10_NATIVE_ROUTE_ALL_FRAMES_UNLOADED: PASS')
        click(0)
        assert page.locator('.kb-frame-stack iframe').count()==1
        page.evaluate("document.body.insertAdjacentHTML('beforeend','<div>Вход в веб-конфигуратор<input name=login><input type=password></div>')")
        page.wait_for_function("!document.querySelector('#kbridge-workspace')")
        assert page.locator('iframe').count()==0
        assert not errors,errors
        print('P10_LOGOUT_CLEANS_ALL_FRAMES: PASS')
    finally:browser.close()
