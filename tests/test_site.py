#!/usr/bin/env python3
"""Static Portal landing-page contracts. No network, browser or install mutation."""
from html.parser import HTMLParser
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
STORE = "https://chromewebstore.google.com/detail/ikghhhcbgfepddcjammfhaeomohfajij"
SITE = ROOT / "site"


class SiteParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.refs = []
        self.scripts = []
        self.images = []
        self.lang_buttons = set()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get('id'):
            self.ids.add(attrs['id'])
        if tag == 'a' and attrs.get('href'):
            self.refs.append(attrs['href'])
        if tag == 'script':
            self.scripts.append(attrs.get('src'))
        if tag == 'img':
            self.images.append(attrs.get('src'))
        if attrs.get('id') in ('lang-ru', 'lang-en'):
            self.lang_buttons.add(attrs['id'])


def check():
    for path in ('site/index.html', 'site/styles.css', 'site/app.js'):
        assert (ROOT / path).is_file(), f'missing site file: {path}'
    html = (SITE / 'index.html').read_text(encoding='utf-8')
    css = (SITE / 'styles.css').read_text(encoding='utf-8')
    js = (SITE / 'app.js').read_text(encoding='utf-8')
    assert html.count(STORE) >= 2, 'store button missing'
    assert 'github.com/Fifth-Ace/routerforge-portal/releases/latest' in html
    assert 'routerforge-portal.user.js' in html
    assert '<html lang="ru">' in html
    assert 'data-ru=' in html and 'data-en=' in html
    assert '@media(max-width:750px)' in css
    assert 'textContent' in js and 'innerHTML' not in js
    assert 'eval(' not in js and 'fetch(' not in js
    parser = SiteParser()
    parser.feed(html)
    assert {'lang-ru', 'lang-en'} <= parser.lang_buttons
    assert {'features', 'preview', 'install'} <= parser.ids
    assert parser.scripts == ['./app.js'], 'unexpected remote script'
    assert html.count('./media/portal-live-demo.gif') == 1, 'hero animation must be unique'
    assert '<picture>' in html and 'media="(prefers-reduced-motion: reduce)"' in html, 'reduced motion fallback missing'
    assert '.preview-window picture{display:block}' in css, 'hero picture layout missing'
    pages = (ROOT / '.github/workflows/pages.yml').read_text(encoding='utf-8')
    assert 'cp docs/screenshots/portal-live-demo.gif .pages-output/media/' in pages, 'GIF omitted from Pages deploy'
    for ref in parser.refs:
        if ref.startswith('#'):
            assert ref[1:] in parser.ids, f'broken navigation anchor: {ref}'
        else:
            assert ref.startswith('https://'), f'unsafe URL: {ref}'
    expected_media = {
        './media/icon-128.png': 'assets/icon-128.png',
        './media/portal-preview.webp': 'docs/screenshots/portal-preview.webp',
        './media/portal-live-demo.gif': 'docs/screenshots/portal-live-demo.gif',
        './media/portal-catalog.webp': 'docs/screenshots/portal-catalog.webp',
        './media/portal-settings-ru.webp': 'docs/screenshots/portal-settings-ru.webp',
        './media/portal-settings-en.webp': 'docs/screenshots/portal-settings-en.webp',
    }
    assert set(parser.images) <= set(expected_media)
    for src, origin in expected_media.items():
        assert (ROOT / origin).is_file(), f'asset missing: {origin}'
    for path in ('README.md', 'README_EN.md', 'docs/INSTALL-RU.md', 'docs/INSTALL-EN.md', 'DEPLOYMENT.md'):
        data = (ROOT / path).read_text(encoding='utf-8')
        assert STORE in data or path == 'DEPLOYMENT.md', f'web store link missing: {path}'
        assert 'Никаких публикаций в магазинах расширений пока нет' not in data
        assert 'No browser-store listing is available' not in data
    security_gate_source = (ROOT / 'tools/security_gate.py').read_text(encoding='utf-8')
    assert '.read_text()' not in security_gate_source, 'implicit Python text encoding in security gate'
    assert security_gate_source.count("read_text(encoding='utf-8')") >= 4, 'UTF-8 security input check missing'
    # Cross-platform text decoding: Node emits UTF-8; Windows defaults must not drift.
    builder = (ROOT / 'tools/build_userscript.py').read_text(encoding='utf-8')
    assert "cwd=HERE,text=True,encoding='utf-8'" in builder, 'Node catalog stdout must decode as UTF-8'
    for script_path in ('tests/test_channels.py', 'tests/test_chromium_prod.py'):
        script = (ROOT / script_path).read_text(encoding='utf-8')
        assert '.read_text()' not in script, f'implicit Windows decoding: {script_path}'
    proc = subprocess.run(['node', '--check', str(SITE / 'app.js')], capture_output=True, text=True)
    assert proc.returncode == 0, f'JavaScript syntax error: {proc.stderr}'
    print('PORTAL_SITE_CONTRACT: PASS / CHROME_STORE / RU_EN / IMAGES / NO_REMOTE_JS')


if __name__ == '__main__':
    check()
