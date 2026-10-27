"""Real Chromium CSS smoke. This test is deliberately independent of Chrome APIs."""
from pathlib import Path
import tinycss2
import base64
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
CSS = ROOT / 'ui.css'
raw = CSS.read_text(encoding='utf8')
ICON = 'data:image/png;base64,' + base64.b64encode((ROOT/'assets/routerforge-brand.png').read_bytes()).decode()
def html(filename):
    return (ROOT/filename).read_text(encoding='utf8').replace('src="assets/routerforge-brand.png"','src="'+ICON+'"')
nodes = tinycss2.parse_stylesheet(raw)
errors = [n for n in nodes if n.type == 'error']
assert not errors, f'STYLESHEET_PARSE_FAILED: {errors}'
assert len([n for n in nodes if n.type in ('qualified-rule','at-rule')]) >= 50, 'STYLESHEET_SUSPICIOUSLY_EMPTY'

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    for theme in ['dark','light']:
        context=browser.new_context(viewport={'width':1440,'height':900},color_scheme=theme)
        page=context.new_page()
        page.set_content(html('options.html').replace('<script type="module" src="options.js"></script>', ''))
        page.add_style_tag(content=raw)
        page.wait_for_timeout(180)
        page.evaluate('''() => {
          document.documentElement.dataset.theme = '%s';
          const row=document.createElement('div');row.className='entry';
          row.innerHTML='<div><div class="name">▣ AWG Manager</div><div class="meta">http://192.168.1.1:2222/ · auto</div></div><div class="actions"><button class="mini">Изменить</button><button class="mini danger">Удалить</button></div>';
          document.querySelector('#app-list').appendChild(row);
          document.querySelector('#appcount').textContent='1 приложение';
        }''' % theme)
        styles=page.locator('.panel').first.evaluate('(e)=>({bg:getComputedStyle(e).backgroundColor,br:getComputedStyle(e).borderRadius})')
        assert styles['br']=='9px', f'OPTIONS_CSS_NOT_APPLIED: {styles}'
        assert page.locator('.layout').evaluate('(e)=>getComputedStyle(e).display')=='grid'
        assert page.locator('button.primary').evaluate('(e)=>getComputedStyle(e).color') != 'rgb(0, 0, 0)'
        page.screenshot(path=str(ROOT.parent/f'routerforge-portal-v0.8.0-options-{theme}.png'),full_page=True)
        page.set_content(html('popup.html').replace('<script type="module" src="popup.js"></script>', ''))
        page.add_style_tag(content=raw)
        page.wait_for_timeout(150)
        page.evaluate('''() => {
          document.documentElement.dataset.theme = '%s';
          document.querySelector('#status').textContent='● Центр приложений: http://192.168.1.1';
          document.querySelector('#connected').hidden=false;
          document.querySelector('#router-title').textContent='Netcraze Ultra';
          const btn=document.createElement('button');btn.className='appbutton';btn.innerHTML='<span class=app-icon>▣</span><span class=app-copy><span class=app-name>AWG Manager</span><span class=app-mode>ВНУТРИ KEENETIC</span></span><span class=app-arrow>↗</span>'; 
          document.querySelector('#apps').appendChild(btn);
          document.querySelector('#popup-appcount').textContent='1';
          document.querySelector('#diagnostics').hidden=false;
          document.querySelector('#bridge-status').textContent='✓ Portal активен на странице · v0.8.0';
          document.querySelector('#diagnostics').dataset.type='ok';
          document.querySelector('#popup-version').textContent='v0.8.0';
        }''' % theme)
        width=page.locator('body.popup').evaluate('(e)=>getComputedStyle(e).width')
        assert width=='434px', f'POPUP_CSS_NOT_APPLIED: {width}'
        assert page.locator('.brand').evaluate('(e)=>getComputedStyle(e).display')=='flex'
        assert page.locator('.appbutton').evaluate('(e)=>getComputedStyle(e).display')=='flex'
        page.locator('body.popup').screenshot(path=str(ROOT.parent/f'routerforge-portal-v0.8.0-popup-{theme}.png'))
        context.close()
    browser.close()
print('CSS_PARSE: PASS')
print('CSS_BROWSER_RENDER: PASS (popup/options dark+light)')
