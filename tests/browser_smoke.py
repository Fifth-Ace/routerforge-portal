"""Offline browser smoke test: mock Keenetic DOM, no live router access."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
MOCK = ROOT / 'tests' / 'mock'
VERSION = json.loads((ROOT/'manifest.json').read_text(encoding='utf-8'))['version']
MOCK.mkdir(parents=True, exist_ok=True)
HTML = '''<!doctype html><html lang="ru" data-theme="dark"><head><meta charset="utf-8">
<style>
*{box-sizing:border-box}body{font:12px Arial;margin:0;background:#1b2638;color:#d8e2f0}
header{height:39px;position:absolute;left:0;right:0;top:0;background:#1b2638;padding:8px 18px;color:#03a2e5;font-size:17px;}
aside{position:absolute;left:0;top:39px;bottom:0;width:200px;padding:5px 0;background:#1b2638;overflow-y:auto}
aside .group{color:#02a2eb;padding:12px 12px 4px;font-size:11px;font-weight:bold}
aside button{border:0;background:transparent;color:#cedce9;font:inherit;display:block;width:100%;padding:8px 16px;text-align:left;cursor:pointer}
aside button:hover{background:#32445d}
main{position:absolute;top:39px;left:200px;right:0;bottom:0;background:#141e2c;padding:30px}
main h2{font-size:18px}main p{color:#8196ac}
</style></head><body>
<header>NETCRAZE <span style="color:#d3dce7">ULTRA</span></header>
<aside><div class="group">▣ СТАТУС</div><button id="native">Системный монитор</button><button>Монитор трафика</button>
<div class="group">◎ ИНТЕРНЕТ</div><button>Кабель Ethernet</button><button>Другие подключения</button>
<div class="group">▤ ЛОКАЛЬНАЯ СЕТЬ</div><button>Клиенты</button><button>Wi-Fi</button>
<div class="group">⚙ УПРАВЛЕНИЕ</div><button>Настройки системы</button><button>Приложения</button><button>Диагностика</button>
</aside><main><h2>Системный монитор</h2><p>Штатные страницы не модифицируются.</p></main>
</body></html>'''
SHIM = '''({state}) => {
  window.__kbMessages=[];window.__kbRuntimeListeners=[];
  const listeners=[];
  window.__kbState=state;
  window.chrome={
    storage:{local:{get:async()=>({kbridgeState:window.__kbState})},onChanged:{addListener:f=>listeners.push(f)}},
    runtime:{sendMessage:async msg=>{window.__kbMessages.push(msg);return {ok:true}},onMessage:{addListener:f=>window.__kbRuntimeListeners.push(f)}}
  };
  window.__kbUpdate=(newState)=>{window.__kbState=newState;listeners.forEach(fn=>fn({kbridgeState:{}},'local'));};
}'''

def check(page, theme='dark'):
    page.set_content(HTML)
    state={'version':1,'routers':{'null':{'label':'Netcraze Ultra','theme':theme,'apps':[
        {'id':'awg_test','name':'AWG Manager','url':'https://example.test/awg','mode':'embedded','icon':'▣'},
        {'id':'rf_test','name':'RouterForge','url':'https://example.test/rf','mode':'external','icon':'⚙'},
        {'id':'auto_test','name':'NFQWS2','url':'https://example.test/nfqws','mode':'auto','icon':'▣'}
    ]}}}
    page.evaluate(SHIM,{'state':state})
    page.add_style_tag(path=str(ROOT/'content/bridge.css'))
    page.add_script_tag(path=str(ROOT/'content/bridge.js'))
    page.locator('#kbridge-entry .kb-nav-item').first.wait_for(timeout=4000)
    assert page.locator('aside #kbridge-entry').count()==1, 'native navigation dock'
    assert page.locator('#kbridge-entry .kb-nav-item').count()==3, 'inline app list'
    assert page.locator('#kbridge-entry').get_attribute('data-kb-version')==VERSION, 'version marker'
    version = page.evaluate("() => {let r;window.__kbRuntimeListeners[0]({type:'BRIDGE_VERSION'},null,x=>r=x);return r.version;}")
    assert version == VERSION, 'content script version ping'
    assert page.locator('#kbridge-entry').get_attribute('data-kb-theme')==theme, 'theme override'
    page.locator('[data-app-id="awg_test"]').click()
    assert page.locator('#kbridge-workspace').is_visible(), 'frame workspace'
    assert page.locator('#kbridge-workspace iframe').get_attribute('src')=='https://example.test/awg', 'iframe URL'
    assert page.locator('#kbridge-workspace').get_attribute('data-kb-theme')==theme, 'workspace theme'
    assert page.locator('#kbridge-workspace .kbbar').evaluate('(n)=>getComputedStyle(n).height')=='34px', 'thin native-style toolbar'
    assert page.locator('#kbridge-workspace').evaluate('(n)=>parseInt(getComputedStyle(n).left)')>=200, 'within main content'
    assert page.locator('#kbridge-workspace .kbhelp').is_hidden(), 'no always-visible footer'
    assert page.locator('aside').is_visible(), 'original navigation remains'
    assert page.locator('header').is_visible(), 'original header remains'
    page.locator('#kbridge-workspace iframe').evaluate("n=>{n.srcdoc='<body style=\"margin:0;background:#080b10;color:#d3e1f1;font:14px Arial;padding:40px\"><div style=\"color:#02a4e3;font-size:12px;margin-bottom:18px\">МОК-ПАНЕЛЬ / DEMO CONTENT</div><h1 style=\"font-size:24px\">AWG Manager</h1><div style=\"padding:18px;background:#181f2b;border:1px solid #283849;border-radius:8px\">Приложение располагается внутри Keenetic. Интерфейс сервиса сохраняет собственные стили.</div></body>'; }")
    if theme=='dark':
        page.screenshot(path=str(ROOT.parent/'keenetic-webui-bridge-p1-dark-preview.png'),full_page=True)
    else:
        page.screenshot(path=str(ROOT.parent/'keenetic-webui-bridge-p1-light-preview.png'),full_page=True)
    page.locator('#kbridge-workspace .kb-external').click()
    assert page.evaluate('window.__kbMessages.at(-1).id')=='awg_test', 'external launch'
    page.locator('#native').click()
    assert page.locator('#kbridge-workspace').is_hidden(), 'native nav closes app'
    page.locator('[data-app-id="rf_test"]').click()
    assert page.locator('#kbridge-workspace').is_hidden(), 'external mode leaves native view'
    assert page.evaluate('window.__kbMessages.at(-1).id')=='rf_test', 'external dispatch'
    page.locator('[data-app-id="auto_test"]').click()
    assert page.locator('#kbridge-workspace').is_visible(), 'auto embedded'
    page.keyboard.press('Escape')
    assert page.locator('#kbridge-workspace').is_hidden(), 'Escape returns Keenetic'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    try:
        for theme in ['dark','light']:
            page = browser.new_page(viewport={'width':1440,'height':900},locale='ru-RU')
            check(page,theme)
            page.close()
        print('BROWSER_SMOKE: PASS — native menu / dark + light / embedded / external / auto / native restoration')
    finally:
        browser.close()
# Auto theme tracks explicit native WebUI theme changes.
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    try:
        page = browser.new_page(viewport={'width':1440,'height':900})
        page.set_content(HTML)
        state={'version':1,'routers':{'null':{'label':'Test','theme':'auto','apps':[]}}}
        page.evaluate(SHIM,{'state':state})
        page.add_style_tag(path=str(ROOT/'content/bridge.css'))
        page.add_script_tag(path=str(ROOT/'content/bridge.js'))
        page.locator('#kbridge-entry').wait_for()
        assert page.locator('#kbridge-entry').get_attribute('data-kb-theme') == 'dark'
        page.locator('html').evaluate("e=>e.setAttribute('data-theme','light')")
        page.wait_for_function("document.querySelector('#kbridge-entry').dataset.kbTheme === 'light'")
        print('THEME_LIVE_SYNC: PASS — native dark ↔ light follows current WebUI without reload')
        browser.close()
    finally:
        pass
