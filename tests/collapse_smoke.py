"""Simulate Netcraze expanded and icon-rail navigation at desktop/mobile sizes.
These are mock-only checks; no router is contacted.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
MOCK = '''<!DOCTYPE html><html lang="ru" data-theme="dark"><head><meta charset="utf-8"/>
<style>
*{box-sizing:border-box}html,body{height:100%;margin:0}body{font:12px Arial;background:#1b2638;color:#e0e8f1}
header{position:fixed;top:0;left:0;right:0;height:35px;background:#1b2638;border-bottom:1px solid #425064;z-index:3;padding:7px 20px;font-size:17px;color:#00a3f5}
aside{position:fixed;left:0;top:35px;bottom:0;width:215px;overflow-y:auto;background:#141d2b;border-right:1px solid #34415a;transition:width .09s ease}
main{position:fixed;left:215px;top:35px;bottom:0;right:0;background:#1d293a;overflow:auto;padding:20px;transition:left .09s ease}
aside .group{color:#00a3f5;padding:12px 12px 4px;font-size:11px;font-weight:bold}
aside > button{display:block;color:inherit;background:transparent;border:0;width:100%;padding:8px 12px;text-align:left}
body.collapsed aside{width:65px} body.collapsed main{left:65px}
body.collapsed aside > .group,body.collapsed aside > button{font-size:0}body.collapsed aside > .group::first-letter{font-size:15px}
</style></head><body>
<header>NETCRAZE ULTRA</header>
<aside><div class="group">▦ СТАТУС</div><button id="native">Монитор трафика</button><button>Монитор Wi-Fi</button><div class="group">◉ ИНТЕРНЕТ</div><button>Ethernet</button><div class="group">⚙ УПРАВЛЕНИЕ</div><button>Настройки системы</button></aside>
<main><h2>Кинетик</h2><p>Это нативный монитор и он скрывается, пока открыто внешнее приложение.</p></main>
</body></html>'''
SHIM='''state => {const listeners=[];window.chrome={storage:{local:{get:async()=>({kbridgeState:state})},onChanged:{addListener:f=>listeners.push(f)}},runtime:{sendMessage:async()=>({ok:true}),onMessage:{addListener:()=>{}}}};}'''
STATE={'version':1,'routers':{'null':{'label':'Netcraze','theme':'dark','apps':[
  {'id':'awg123','name':'AWG Manager','url':'https://example.test/awg','mode':'auto','icon':'▣'},
  {'id':'rf1234','name':'RouterForge','url':'https://example.test/rf','mode':'external','icon':'⚙'}
]}}}
def close_to(actual,expected,delta=2):
    assert abs(actual-expected)<delta, f'expected {expected} got {actual}'

def rect(page, selector):
    return page.locator(selector).bounding_box()

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    try:
        page=browser.new_page(viewport={'width':1712,'height':1056})
        page.set_content(MOCK)
        page.evaluate(SHIM,STATE)
        page.add_style_tag(path=str(ROOT/'content/bridge.css'))
        page.add_script_tag(path=str(ROOT/'content/bridge.js'))
        page.locator('#kbridge-entry .kb-nav-item').first.wait_for()
        assert page.locator('aside #kbridge-entry').count()==1
        assert page.locator('#kbridge-entry').get_attribute('data-kb-collapsed')=='false'
        page.locator('[data-app-id="awg123"]').click()
        # Offline mock panel: no attempt to reach the external service.
        page.locator('#kbridge-workspace iframe').evaluate('''frame => {frame.srcdoc=`<!doctype html><html><head><style>
          body{margin:0;background:#080909;color:#f3f7fa;font:13px Arial}header{background:#0b0d0f;padding:15px 25px;border-bottom:1px solid #222}
          .accent{color:#23ef28}.row{background:#181b1c;margin:12px 20px;padding:16px;border:1px solid #343839;border-radius:5px}
          .muted{color:#87919a}.pill{background:#173e1a;color:#38ef40;padding:4px 9px;border-radius:5px}h2{margin:24px 20px 16px}
          </style></head><body><header><span class=accent>▰</span> AWG MANAGER　　<span class=muted>ТУННЕЛИ　 СЕРВЕРЫ　 МАРШРУТИЗАЦИЯ　 ПРОКСИ　 НАСТРОЙКИ</span></header>
          <h2>Туннели</h2><div class=row>5/8　<span class=accent>Активные подключения</span>　　　　　　　104.9 Кбит/с　　　　　　　56.98 GB</div>
          <div class=row>3.1FI　　　<span class=pill>АКТИВЕН</span>　　　　　　　<span class=muted>Endpoint</span>　　　　　　　　　<span class=accent>↑ 33.2 Кбит/с</span></div>
          <div class=row>3.1Ge　　　<span class=pill>АКТИВЕН</span>　　　　　　　<span class=muted>Endpoint</span>　　　　　　　　　<span class=accent>↑ 25.6 Кбит/с</span></div>
          <div class=row>3.1NL　　　<span class=muted>ВЫКЛЮЧЕН</span>　　　　　　　<span class=muted>Маршрут не установлен</span></div>
          </body></html>`;}''')
        page.wait_for_function("Math.abs(document.querySelector('#kbridge-workspace').getBoundingClientRect().left-215)<2")
        r=rect(page,'#kbridge-workspace')
        close_to(r['x'],215);close_to(r['y'],35);close_to(r['width'],1497);close_to(r['height'],1021)
        assert page.locator('#kbridge-workspace').evaluate('(e)=>getComputedStyle(e).borderTopWidth')=='0px'
        page.screenshot(path=str(ROOT.parent/'keenetic-webui-bridge-v0.3.0-expanded.png'))
        # Actual Keenetic collapses to a 65px icon rail without reloading the page.
        page.locator('body').evaluate("e=>e.classList.add('collapsed')")
        page.wait_for_function("document.querySelector('#kbridge-entry').dataset.kbCollapsed === 'true' && Math.abs(document.querySelector('#kbridge-workspace').getBoundingClientRect().left-65)<2")
        r=rect(page,'#kbridge-workspace')
        close_to(r['x'],65);close_to(r['y'],35);close_to(r['width'],1647);close_to(r['height'],1021)
        assert page.locator('#kbridge-entry .kb-nav-list').is_hidden()
        assert page.locator('#kbridge-entry .kb-rail-trigger').is_visible()
        assert page.locator('#kbridge-workspace').is_visible()
        page.screenshot(path=str(ROOT.parent/'keenetic-webui-bridge-v0.3.0-collapsed.png'))
        page.locator('#kbridge-workspace .kbclose').click()
        page.locator('#kbridge-entry .kb-rail-trigger').click()
        assert page.locator('#kbridge-drawer').is_visible(), 'rail launcher opens apps drawer'
        r=rect(page,'#kbridge-drawer')
        assert r['x']>=65 and r['x']<250, 'drawer beside collapsed rail'
        page.locator('#kbridge-drawer .kbapp').first.click()
        assert page.locator('#kbridge-drawer').is_hidden()
        assert page.locator('#kbridge-workspace').is_visible()
        # Unfold while application is active, verify no large overlay or leftover gaps.
        page.locator('body').evaluate("e=>e.classList.remove('collapsed')")
        page.wait_for_function("document.querySelector('#kbridge-entry').dataset.kbCollapsed === 'false' && Math.abs(document.querySelector('#kbridge-workspace').getBoundingClientRect().left-215)<2")
        assert page.locator('#kbridge-entry .kb-nav-list').is_visible()
        page.locator('#native').click()
        assert page.locator('#kbridge-workspace').is_hidden(), 'native navigation returns'
        print('NATIVE_LAYOUT_SMOKE: PASS (215px ⇆ 65px live collapse; fixed content bounds; rail drawer; native restore)')
        page.close()
    finally:
        browser.close()
