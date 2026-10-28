"""Offline functional P9B lifecycle smoke: pending/slow/load/retry/close/log-out."""
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
HTML='''<!DOCTYPE html><html><head><style>
body{margin:0}header{height:40px;background:#182330}
aside{position:absolute;top:40px;left:0;width:215px;height:820px;background:#141b25}
aside button{display:block;width:100%;padding:12px}main{margin-left:225px;min-height:790px}
</style></head><body><header>NETCRAZE</header><aside><button>Интернет</button><button>Wi-Fi</button><button>Сеть</button><button>Управление</button></aside><main><h2>Native Home</h2></main></body></html>'''
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    try:
        pg=b.new_page(viewport={'width':1440,'height':900})
        errors=[]
        pg.on('pageerror',lambda e:errors.append(str(e)))
        pg.set_content(HTML)
        pg.evaluate('''() => {
          window.chrome={storage:{local:{get:async()=>({
            kbridgeState:{version:1,routers:{null:{label:'NETCRAZE',theme:'dark',apps:[{id:'test_core',name:'Core',mode:'embedded',url:'https://example.invalid/',icon:'▣',enabled:true}]}}},rfPortalLanguage:'ru'
          })},onChanged:{addListener:()=>{}}},runtime:{sendMessage:async()=>({ok:true}),onMessage:{addListener:()=>{}}}};
        }''')
        pg.add_style_tag(path=str(R/'content/bridge.css'))
        pg.add_script_tag(path=str(R/'content/bridge.js'))
        pg.locator('[data-app-id="test_core"]').wait_for()
        result=pg.evaluate('''() => {
          const native = document.querySelector('main');
          let savedTimer = null;
          const original = window.setTimeout;
          window.setTimeout = (fn, delay, ...args) => delay === 12000 ? (savedTimer=fn, 999999) : original(fn,delay,...args);
          document.querySelector('[data-app-id="test_core"]').click();
          const workspace = document.querySelector('#kbridge-workspace');
          const node = workspace.querySelector('.kb-frame-status');
          const state1 = node.dataset.kbState;
          // Emulate a slow load without wasting twelve real seconds.
          savedTimer();
          const state2 = node.dataset.kbState;
          const help = !workspace.querySelector('.kbhelp').hidden;
          const initialSrc=workspace.querySelector('iframe').src;
          // Re-select current application: neither reset iframe nor timer.
          document.querySelector('[data-app-id="test_core"]').click();
          const preserved = workspace.querySelector('iframe').src===initialSrc && node.dataset.kbState==='slow';
          workspace.querySelector('iframe').dispatchEvent(new Event('load'));
          const state3 = node.dataset.kbState;
          const dismissedAutoHelp = workspace.querySelector('.kbhelp').hidden;
          workspace.querySelector('.kb-refresh').click();
          const state4 = node.dataset.kbState;
          workspace.querySelector('.kbclose').click();
          const closed = workspace.hidden && node.hidden && !workspace.querySelector('iframe');
          return {state1,state2,help,preserved,state3,dismissedAutoHelp,state4,closed,untouched:native.isConnected};
        }''')
        assert result=={'state1':'loading','state2':'slow','help':True,'preserved':True,'state3':'','dismissedAutoHelp':True,'state4':'loading','closed':True,'untouched':True},result
        print('P9B_FRAME_STATUS_RETRY_CLOSE: PASS')
        pg.evaluate("location.hash='settings'")
        pg.wait_for_timeout(80)
        assert pg.locator('main h2').inner_text()=='Native Home'
        pg.evaluate("document.body.insertAdjacentHTML('beforeend','<div>Вход в веб-конфигуратор <input name=login><input type=password></div>')")
        pg.wait_for_function("!document.querySelector('#kbridge-workspace')")
        assert not errors,errors
        print('P9B_NATIVE_RESTORE_AND_LOGOUT: PASS')
    finally:
        b.close()
