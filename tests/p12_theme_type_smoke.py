"""P12 UX regression: computed colors, native text scale, theme switching, viewport resize.
All checks run against isolated mock WebUI: no router or external traffic.
"""
from pathlib import Path
import ast, re
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
MOD=ast.parse((ROOT/'tests/p12_native_settings_smoke.py').read_text())
values={n.targets[0].id:ast.literal_eval(n.value) for n in MOD.body if isinstance(n,ast.Assign) and len(n.targets)==1 and isinstance(n.targets[0],ast.Name) and n.targets[0].id in ('HTML','INIT')}
HTML,INIT=values['HTML'],values['INIT']

def rgb_lum(rgb):
    nums=list(map(int,re.findall(r'\d+',rgb)[:3]));return sum(a*b for a,b in zip(nums,(.2126,.7152,.0722)))

def styles(page):
    return page.evaluate('''() => {
      const qs=s=>document.querySelector(s), val=(s,p)=>getComputedStyle(qs(s))[p];
      return {theme:qs('#kbridge-workspace').dataset.kbTheme,
        page:val('.kb-native-settings','backgroundColor'),
        text:val('.kb-native-settings','color'),
        font:val('.kb-native-settings','fontSize'),
        title:val('.kb-ns-header h2','fontSize'),
        name:val('.kb-ns-identity strong','fontSize'),
        group:val('.kb-ns-group','fontSize'),
        url:val('.kb-ns-identity small','fontSize'),
        label:val('.kb-ns-field span','fontSize'),
        search:val('.kb-ns-search','fontSize'),
        searchBG:val('.kb-ns-search','backgroundColor'),
        card:val('.kb-ns-app','backgroundColor'),
        control:val('.kb-ns-button','backgroundColor'),
        bar:val('#kbridge-workspace .kbbar','backgroundColor'),
        nav:val('#kbridge-entry','color'),
        scheme:val('.kb-native-settings','colorScheme'),
        width:qs('#kbridge-workspace').getBoundingClientRect().width
      } }''')

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1650,'height':920}, device_scale_factor=1)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(HTML)
    page.evaluate(INIT)
    page.add_style_tag(path=str(ROOT/'content/bridge.css'))
    page.add_script_tag(path=str(ROOT/'content/bridge.js'))
    page.locator('#kbridge-entry .kb-nav-settings').click()
    page.locator('.kb-ns-header h2').wait_for()
    dark=styles(page)
    assert dark['theme']=='dark',dark
    assert rgb_lum(dark['page'])<100,dark
    assert rgb_lum(dark['card'])<100,dark
    assert int(dark['font'][:-2])>=14 and int(dark['name'][:-2])>=14,dark
    assert int(dark['url'][:-2])>=12 and int(dark['group'][:-2])>=12,dark
    assert dark['scheme']=='dark',dark
    page.screenshot(path='/mnt/data/RouterForgePortal-P12-UXFIX-DARK.png')
    print('DARK_FULL_SURFACE_AND_READABLE_TYPOGRAPHY: PASS',dark)
    page.locator('.kb-ns-preferences select').first.select_option('light')
    page.wait_for_function("document.querySelector('#kbridge-workspace').dataset.kbTheme==='light'")
    light=styles(page)
    assert rgb_lum(light['page'])>210 and rgb_lum(light['card'])>210,dark
    assert rgb_lum(light['bar'])>210,light
    assert rgb_lum(light['text'])<120,light
    assert light['scheme']=='light',light
    # Sidebar remains readable against the *actual* dark NETCRAZE shell even
    # when the user explicitly asks for a light Portal workspace.
    assert page.locator('#kbridge-entry').get_attribute('data-kb-theme')=='dark'
    assert rgb_lum(light['nav'])>150,light
    page.screenshot(path='/mnt/data/RouterForgePortal-P12-UXFIX-LIGHT.png')
    print('LIGHT_ENTIRE_PANEL_AND_READABLE_COLORS: PASS',light)
    page.locator('.kb-ns-preferences select').first.select_option('auto')
    page.wait_for_function("document.querySelector('#kbridge-workspace').dataset.kbTheme==='dark'")
    page.evaluate("document.documentElement.dataset.theme='light';document.querySelector('.layout__content__main').style.background='#f6f8fb'")
    page.wait_for_function("document.querySelector('#kbridge-workspace').dataset.kbTheme==='light'")
    assert rgb_lum(styles(page)['page'])>210
    assert page.locator('#kbridge-entry').get_attribute('data-kb-theme')=='light'
    page.evaluate("document.documentElement.dataset.theme='dark';document.querySelector('.layout__content__main').style.background='#202838'")
    page.wait_for_function("document.querySelector('#kbridge-workspace').dataset.kbTheme==='dark'")
    print('AUTO_FOLLOWS_LIVE_HOST_THEME: PASS')
    page.set_viewport_size({'width':1040,'height':790})
    page.wait_for_timeout(200)
    narrow=styles(page)
    assert narrow['width']<950,narrow
    assert rgb_lum(narrow['page'])<100,narrow
    assert page.locator('.kb-ns-header h2').is_visible()
    print('NARROW_VIEWPORT_LAYOUT_AND_THEME: PASS',narrow['width'])
    assert not errors,errors
    print('NO_PAGE_ERRORS: PASS')
    browser.close()
