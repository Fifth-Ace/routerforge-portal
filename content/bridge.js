(() => {
  if (globalThis.__kbridgeInjected) return;
  globalThis.__kbridgeInjected = true;

  const BRIDGE_VERSION = '0.9.0';
  const KEY = 'kbridgeState';
  const LANGUAGE_KEY = 'rfPortalLanguage';
  let language = 'ru';
  const TXT = {
    applications:'Приложения', heading:'ПРИЛОЖЕНИЯ', customize:'+ Настроить приложения',
    configure:'⚙ Настроить', close:'Закрыть', openTab:'Открыть в отдельной вкладке',
    back:'Вернуться в Keenetic', issue:'Проблемы с открытием панели?',
    help:'Если приложение не загрузилось, попробуй открыть его отдельно. ',
    separate:'Открыть отдельно', empty:'Нет приложений', drawerEmpty:'Приложений пока нет. Добавь их в настройках расширения.',
    more:'Ещё ', sideLabel:'Сторонние приложения'
  };
  const TXT_EN = {
    applications:'Applications', heading:'APPLICATIONS', customize:'+ Configure applications',
    configure:'⚙ Configure', close:'Close', openTab:'Open in a separate tab',
    back:'Back to Keenetic', issue:'Having trouble opening the app?',
    help:'If the application does not load, try opening it separately. ',
    separate:'Open separately', empty:'No applications', drawerEmpty:'No apps yet. Add them in the extension settings.',
    more:'More ', sideLabel:'Third-party applications'
  };
  const L = key => (language === 'en' ? TXT_EN : TXT)[key];
  function updateLanguageText() {
    if (!entry) return;
    renderNav();
    if (drawer && !drawer.hidden) renderDrawer();
    entry.setAttribute('aria-label',L('sideLabel'));
    const set=(sel,attr,key)=>{ const el=document.querySelector(sel); if(el){ if(attr==='text')el.textContent=L(key); else el.setAttribute(attr,L(key)); }};
    set('#kbridge-drawer .kbhead strong','text','applications');
    set('#kbridge-drawer .kb-drawer-settings','text','configure');
    set('#kbridge-drawer .kbclose','title','close');
    set('#kbridge-workspace .kbcrumb','text','applications');
    for(const [sel,attr,key] of [
      ['#kbridge-workspace .kb-external','title','openTab'],['#kbridge-workspace .kb-external','aria-label','openTab'],
      ['#kbridge-workspace .kbbar .kbclose','title','back'],['#kbridge-workspace .kbbar .kbclose','aria-label','back'],
      ['#kbridge-workspace .kb-help-trigger','title','issue']])set(sel,attr,key);
    set('#kbridge-workspace .kbhelp span','text','help');
    set('#kbridge-workspace .kbhelp button','text','separate');
  }
  const origin = location.origin;
  const MAX_INLINE = 9;
  let profile = null, entry = null, drawer = null, workspace = null;
  let currentAppId = null, host = null, theme = 'dark';
  let domObserver = null, themeObserver = null, resizeObserver = null, scheduled = false, activeFrameToken = 0;
  let layoutTargets = [];
  let navIsCollapsed = false;
  let authObserver = null, authScheduled = false;
  let mountListeners = [];

  const make = (tag, className = '', text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const pointRect = node => node?.getBoundingClientRect();
  const luminance = rgb => {
    const m = rgb?.match(/rgba?\(\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)/i);
    return m ? (Number(m[1]) * .2126 + Number(m[2]) * .7152 + Number(m[3]) * .0722) : null;
  };
  function opaqueBackground(node) {
    for (let n = node, depth = 0; n && depth < 5; n = n.parentElement, depth++) {
      const color = getComputedStyle(n).backgroundColor;
      if (color && !/transparent|rgba\([^)]*,\s*0(?:\.0+)?\s*\)/.test(color)) return color;
    }
    return '';
  }
  function navCandidates() {
    return document.querySelectorAll('aside, nav, [role="navigation"], [class*="sidebar"], [class*="side-menu"], [class*="main-menu"]');
  }
  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    const style = getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0;
  }
  function menuHost() {
    let selected = null, best = -Infinity;
    for (const el of navCandidates()) {
      if (el.closest('#kbridge-entry,#kbridge-drawer,#kbridge-workspace') || !isVisible(el)) continue;
      const r = pointRect(el);
      // The collapsed Keenetic sidebar is only about 64 px wide. P1 rejected it.
      if (r.height < 130 || r.width < 44 || r.width > 420 || r.left > innerWidth * .25 || r.right < 45) continue;
      if (r.bottom < 100 || r.top > innerHeight * .45) continue;
      const score = Math.min(r.height, innerHeight) - Math.abs(r.left) * 3
        + (el.matches('aside,nav,[role="navigation"]') ? 70 : 0)
        + (r.width <= 110 ? 20 : 0);
      if (score > best) { best = score; selected = el; }
    }
    return selected;
  }
  // Portal is only a post-login enhancement. No UI on the Keenetic login screen.
  function isAuthenticatedShell() {
    if (!document.body) return false;
    const visibleInput = selector => [...document.querySelectorAll(selector)]
      .some(el => isVisible(el) && pointRect(el)?.width > 30);
    // Do not mistake a password-change field on an authenticated settings page for login.
    const authForm = visibleInput('input[type="password"]') && (
      visibleInput('input[autocomplete="username"],input[name="username"],input[name="login"]') ||
      /(?:вход в веб-конфигуратор|sign in|log in)/i.test(document.title + ' ' + (document.body?.innerText || '').slice(0,700))
    );
    if (authForm) return false;
    const nav = menuHost();
    if (!nav) return false;
    // The native collapsed navigation contains several clickable icon controls.
    const actions = nav.querySelectorAll('a,button,[role="menuitem"],[role="button"]');
    const nativeActions = [...actions].filter(el => !el.closest('#kbridge-entry,#kbridge-drawer,#kbridge-workspace'));
    const labels = (nav.textContent || '').match(/СТАТУС|ИНТЕРНЕТ|УПРАВЛЕНИЕ|ЛОКАЛЬНАЯ СЕТЬ|СЕТЕВЫЕ ПРАВИЛА/gi) || [];
    const iconRailItems = nav.querySelectorAll('li,[class*="item"],svg,[tabindex]').length;
    return nativeActions.length >= 3 || labels.length >= 2 ||
      (pointRect(nav).width <= 110 && iconRailItems >= 5);
  }
  function listen(target, type, callback, options) {
    if (!target) return;
    target.addEventListener(type, callback, options);
    mountListeners.push(() => target.removeEventListener(type, callback, options));
  }
  function unmount() {
    ++activeFrameToken;
    for (const fn of mountListeners.splice(0)) fn();
    for (const observer of [domObserver,themeObserver,resizeObserver]) observer?.disconnect();
    [entry,drawer,workspace].forEach(el => el?.remove());
    entry = drawer = workspace = host = null;
    domObserver = themeObserver = resizeObserver = null;
    layoutTargets = []; navIsCollapsed = false; currentAppId = null;
  }
  function reconcileAuth() {
    if (!profile || !isAuthenticatedShell()) {
      if (entry || drawer || workspace) unmount();
      return;
    }
    if (!entry) mount();
    else scheduleLayout();
  }
  function scheduleAuth() {
    if (authScheduled) return;
    authScheduled = true;
    requestAnimationFrame(() => { authScheduled = false; reconcileAuth(); });
  }
  function mainHost() {
    const candidates = document.querySelectorAll('main, [role="main"], #main-content, #content, .main-content, .content-wrapper, .page-content');
    let selected = null, best = -Infinity;
    for (const el of candidates) {
      if (el.closest('#kbridge-workspace,#kbridge-drawer,#kbridge-entry')) continue;
      const r = pointRect(el);
      if (r.width < 360 || r.height < 250 || r.left < 90 || r.left > innerWidth * .6) continue;
      const score = Math.min(r.width, innerWidth) + Math.min(r.height, innerHeight) - r.left * .1;
      if (score > best) { best = score; selected = el; }
    }
    return selected;
  }
  function detectTheme() {
    if (profile?.theme === 'dark' || profile?.theme === 'light') return profile.theme;
    const root = document.documentElement;
    const signals = [root, document.body].filter(Boolean).map(el =>
      `${el.getAttribute('data-theme') || ''} ${el.getAttribute('data-bs-theme') || ''} ${el.getAttribute('class') || ''}`.toLowerCase());
    if (signals.some(x => /(^|[\s_-])dark([\s_-]|$)/.test(x))) return 'dark';
    if (signals.some(x => /(^|[\s_-])light([\s_-]|$)/.test(x))) return 'light';
    const main = mainHost();
    if (main) {
      const own = getComputedStyle(main).backgroundColor;
      const lum = luminance(own);
      if (lum !== null && !/rgba\([^)]*,\s*0(?:\.0+)?\s*\)/.test(own)) return lum < 115 ? 'dark' : 'light';
    }
    const bodyLum = luminance(opaqueBackground(document.body));
    if (bodyLum !== null) return bodyLum < 115 ? 'dark' : 'light';
    const navLum = luminance(opaqueBackground(host));
    if (navLum !== null) return navLum < 115 ? 'dark' : 'light';
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function updateTheme() {
    const next = detectTheme();
    if (theme === next && entry?.dataset.kbTheme === next) return;
    theme = next;
    for (const node of [entry, drawer, workspace]) if (node) node.dataset.kbTheme = theme;
  }
  function isCollapsed(node) {
    return Boolean(node && pointRect(node).width <= 108);
  }
  function topBoundary() {
    // Site header (not the app toolbar). Detection also works when the native menu is folded.
    const nodes = document.querySelectorAll('header,[role="banner"],#header,.header,.page-header,.main-header');
    let bottom = 0;
    for (const el of nodes) {
      if (el.closest('#kbridge-workspace,#kbridge-entry,#kbridge-drawer') || !isVisible(el)) continue;
      const r = pointRect(el);
      if (r.top < -4 || r.top > 12 || r.width < innerWidth * .5 || r.height < 25 || r.height > 105) continue;
      bottom = Math.max(bottom, r.bottom);
    }
    if (!bottom) {
      const navTop = pointRect(host)?.top;
      if (navTop > 24 && navTop < 100) bottom = navTop;
    }
    return Math.max(0, Math.round(bottom || 35));
  }
  function placeMenu() {
    if (!entry || !document.body) return;
    const next = menuHost();
    const destination = next || document.body;
    if (entry.parentElement !== destination) destination.append(entry);
    entry.classList.toggle('kbridge-floating', !next);
    host = next;
    const collapsed = isCollapsed(next);
    if (navIsCollapsed !== collapsed) {
      navIsCollapsed = collapsed;
      entry.dataset.kbCollapsed = String(collapsed);
      dismiss();
    }
    if (!entry.dataset.kbCollapsed) entry.dataset.kbCollapsed = String(collapsed);
    updateTheme();
    observeLayoutTargets();
    positionWorkspace();
    positionDrawer();
  }
  function observeLayoutTargets() {
    if (!resizeObserver) return;
    const targets = [host, mainHost(), document.querySelector('header,[role="banner"]')].filter(Boolean);
    if (layoutTargets.length === targets.length && targets.every((n, i) => n === layoutTargets[i])) return;
    resizeObserver.disconnect();
    layoutTargets = targets;
    for (const el of targets) resizeObserver.observe(el);
  }
  function scheduleLayout() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; placeMenu(); });
  }
  function dismiss() { if (drawer) drawer.hidden = true; }
  function positionDrawer() {
    if (!drawer || drawer.hidden) return;
    const r = pointRect(host);
    const x = r && navIsCollapsed ? Math.min(innerWidth - 300, r.right + 6) : innerWidth - 344;
    const y = Math.max(topBoundary() + 10, Math.min(innerHeight - 320, pointRect(entry)?.top || 85));
    drawer.style.setProperty('left', `${Math.max(0, Math.round(x))}px`, 'important');
    drawer.style.setProperty('right', 'auto', 'important');
    drawer.style.setProperty('top', `${Math.max(0, Math.round(y))}px`, 'important');
  }
  function toggleDrawer() {
    if (!drawer) return;
    drawer.hidden = !drawer.hidden;
    if (!drawer.hidden) { renderDrawer(); positionDrawer(); }
  }
  function openExternal(id) {
    chrome.runtime.sendMessage({ type: 'OPEN_APP', id }).then(response => {
      if (!response?.ok) console.warn('RouterForge Portal:', response?.error);
    }).catch(console.warn);
  }
  const appMode = app => app.mode || 'auto';
  function setCurrent(id) {
    currentAppId = id;
    entry?.querySelectorAll('[data-app-id]').forEach(node => {
      const active = node.dataset.appId === id;
      node.classList.toggle('kb-active', active);
      if (active) node.setAttribute('aria-current', 'page');
      else node.removeAttribute('aria-current');
    });
  }
  function appOpen(app) {
    dismiss();
    if (appMode(app) === 'external') { openExternal(app.id); return; }
    if (!workspace) return;
    const frame = workspace.querySelector('iframe');
    const nextToken = ++activeFrameToken;
    workspace.querySelector('.kbappname').textContent = app.name;
    workspace.querySelector('.kbappicon').textContent = app.icon;
    frame.title = `${app.name} — RouterForge Portal`;
    // No forced reload when selecting the already open application.
    if (currentAppId !== app.id || workspace.hidden) frame.src = app.url;
    workspace.hidden = false;
    setCurrent(app.id);
    workspace.dataset.loadingToken = String(nextToken);
    positionWorkspace();
  }
  function closeWorkspace() {
    ++activeFrameToken;
    setCurrent(null);
    if (workspace) {
      workspace.hidden = true;
      workspace.querySelector('iframe').removeAttribute('src');
    }
  }
  function positionWorkspace() {
    if (!workspace || workspace.hidden) return;
    const navRect = pointRect(host);
    const nativeMain = pointRect(mainHost());
    const railRight = navRect && navRect.right > 44 && navRect.right < innerWidth * .42 ? navRect.right : null;
    // Left edge belongs to the *visible* sidebar, never a stale main-content coordinate.
    // This is crucial when the sidebar folds from ~215 px to ~65 px.
    const mainLeft = nativeMain?.left >= 0 && nativeMain.left < innerWidth * .5 ? nativeMain.left : 0;
    const left = railRight !== null ? railRight : mainLeft;
    const top = topBoundary();
    workspace.style.setProperty('left', `${Math.max(0, Math.round(left))}px`, 'important');
    workspace.style.setProperty('top', `${top}px`, 'important');
    workspace.style.setProperty('right', '0px', 'important');
    workspace.style.setProperty('bottom', '0px', 'important');
    workspace.dataset.kbLayout = navIsCollapsed ? 'compact' : 'expanded';
  }
  function renderDrawer() {
    if (!drawer || !profile) return;
    const list = drawer.querySelector('.kblist'); list.replaceChildren();
    const activeApps = profile.apps.filter(a => a.enabled !== false);
    if (!activeApps.length) list.append(make('p', 'kbmuted', L('drawerEmpty')));
    for (const app of activeApps) {
      const btn = make('button', 'kbapp'); btn.type = 'button';
      btn.append(make('span', 'kbicon', app.icon), make('span', '', app.name));
      btn.title = app.url;
      btn.addEventListener('click', () => appOpen(app));
      list.append(btn);
    }
  }
  function renderNav() {
    if (!entry || !profile) return;
    entry.replaceChildren();
    const rail = make('button', 'kb-rail-trigger', '▦');
    rail.type = 'button'; rail.title = L('applications'); rail.setAttribute('aria-label', L('applications'));
    rail.addEventListener('click', event => {event.preventDefault();event.stopPropagation();toggleDrawer();});
    entry.append(rail);
    const title = make('div', 'kb-nav-header');
    title.append(make('span', 'kb-heading-icon', '▦'), make('span', '', L('heading')));
    entry.append(title);
    const list = make('div', 'kb-nav-list');
    const activeApps = profile.apps.filter(a => a.enabled !== false);
    for (const app of activeApps.slice(0, MAX_INLINE)) {
      const btn = make('button', 'kb-nav-item'); btn.type = 'button';
      btn.dataset.appId = app.id; btn.title = `${app.name}\n${app.url}`;
      btn.append(make('span','kb-nav-icon',app.icon),make('span','kb-nav-name',app.name));
      btn.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); appOpen(app); });
      list.append(btn);
    }
    if (!activeApps.length) list.append(make('div','kb-nav-empty',L('empty')));
    if (activeApps.length > MAX_INLINE) {
      const more = make('button','kb-nav-item kb-nav-more',`${L('more')}${activeApps.length - MAX_INLINE}…`);
      more.type = 'button'; more.addEventListener('click', ev => {ev.preventDefault();toggleDrawer();});
      list.append(more);
    }
    const settings = make('button', 'kb-nav-settings', L('customize'));
    settings.type = 'button'; settings.addEventListener('click', ev => {
      ev.preventDefault(); ev.stopPropagation();
      chrome.runtime.sendMessage({type:'OPEN_OPTIONS'}).catch(console.warn);
    });
    list.append(settings); entry.append(list);
    setCurrent(currentAppId);
  }
  function mount() {
    if (entry || !document.body || !isAuthenticatedShell()) return;
    entry = make('section'); entry.id = 'kbridge-entry'; entry.dataset.kbVersion = BRIDGE_VERSION; entry.setAttribute('aria-label',L('sideLabel'));
    drawer = make('div'); drawer.id = 'kbridge-drawer'; drawer.hidden = true;
    const head = make('div','kbhead'); head.append(make('strong','',L('applications')));
    const configure = make('button','kb-drawer-settings',L('configure')); configure.type='button';
    configure.addEventListener('click',()=>chrome.runtime.sendMessage({type:'OPEN_OPTIONS'}).catch(console.warn));
    const close = make('button','kbclose','×'); close.title = L('close'); close.type='button';
    close.addEventListener('click',dismiss); head.append(configure, close);
    drawer.append(head,make('div','kblist'));
    workspace = make('section'); workspace.id = 'kbridge-workspace'; workspace.dataset.kbVersion = BRIDGE_VERSION; workspace.hidden = true;
    const bar = make('div', 'kbbar');
    const path = make('div','kbpath'); path.append(make('span','kbcrumb',L('applications')),make('span','kbseparator','/'),make('span','kbappicon'),make('strong','kbappname'));
    bar.append(path);
    const buttons = make('div', 'kbbuttons');
    const external = make('button', 'kb-external', '↗'); external.type='button'; external.title=L('openTab');
    external.setAttribute('aria-label',L('openTab'));
    external.addEventListener('click', () => { if (currentAppId) openExternal(currentAppId); });
    const exit = make('button','kbclose','×'); exit.type='button'; exit.title=L('back');
    exit.setAttribute('aria-label',L('back')); exit.addEventListener('click', closeWorkspace);
    buttons.append(external,exit); bar.append(buttons);
    workspace.append(bar);
    const frame = make('iframe'); frame.setAttribute('referrerpolicy','no-referrer');
    workspace.append(frame);
    // Visible only when requested — never reserve a permanent white footer.
    const help = make('div','kbhelp'); help.hidden = true;
    help.append(make('span','',L('help')));
    const switchButton = make('button','',L('separate'));
    switchButton.type = 'button'; switchButton.addEventListener('click',()=>{if(currentAppId)openExternal(currentAppId);});
    help.append(switchButton); workspace.append(help);
    const troubleshooting = make('button','kb-help-trigger','?'); troubleshooting.type='button';
    troubleshooting.title = L('issue');
    troubleshooting.addEventListener('click',()=>{help.hidden=!help.hidden;});
    buttons.prepend(troubleshooting);
    document.body.append(entry,drawer,workspace);
    renderNav(); placeMenu();
    listen(document, 'click', event => {
      if (entry?.contains(event.target) || drawer?.contains(event.target) || workspace?.contains(event.target)) return;
      dismiss();
      if (host?.contains(event.target)) closeWorkspace();
    }, true);
    listen(document, 'keydown', event => {
      if (event.key === 'Escape') { dismiss(); if (!workspace?.hidden) closeWorkspace(); }
    });
    listen(window, 'resize', scheduleLayout);
    listen(window.visualViewport, 'resize', scheduleLayout);
    resizeObserver = new ResizeObserver(scheduleLayout);
    listen(window, 'scroll', scheduleLayout, true);
    domObserver = new MutationObserver(records => {
      if (records.some(record => !record.target.closest?.('#kbridge-entry,#kbridge-workspace,#kbridge-drawer'))) scheduleLayout();
    });
    domObserver.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','aria-expanded','data-state']});
    themeObserver = new MutationObserver(updateTheme);
    themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['class','data-theme','data-bs-theme','style']});
    if (document.body) themeObserver.observe(document.body,{attributes:true,attributeFilter:['class','data-theme','data-bs-theme','style']});
    matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', updateTheme);
  }
  async function reload() {
    const { [KEY]: state, [LANGUAGE_KEY]: savedLang } = await chrome.storage.local.get([KEY, LANGUAGE_KEY]);
    language = savedLang === 'en' ? 'en' : savedLang === 'ru' ? 'ru' : (/^ru/i.test(navigator.language)?'ru':'en');
    const next = state?.routers?.[origin];
    if (!next || !Array.isArray(next.apps)) {
      unmount();
      profile = null;
      return;
    }
    profile = next;
    reconcileAuth();
    renderNav();
    if (drawer && !drawer.hidden) renderDrawer();
    if (currentAppId && !profile.apps.some(a => a.id === currentAppId && a.enabled !== false)) closeWorkspace();
    updateTheme();
    updateLanguageText();
  }
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message?.type === 'BRIDGE_VERSION') {
      respond({ ok: true, version: BRIDGE_VERSION, origin, active: Boolean(entry && isAuthenticatedShell()), authenticated: isAuthenticatedShell(), embedded: Boolean(workspace && !workspace.hidden), layout: navIsCollapsed ? 'compact' : 'expanded', sidebarWidth: Math.round(pointRect(host)?.width || 0), workspaceLeft: Math.round(pointRect(workspace)?.left || 0) });
      return;
    }
    if (message?.type !== 'SHOW_APP') return;
    const app = profile?.apps?.find(item => item.id === message.id && item.enabled !== false);
    if (!app) { respond({ok:false}); return; }
    appOpen(app); respond({ok:true});
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (KEY in changes || LANGUAGE_KEY in changes)) reload().catch(console.error);
  });
  authObserver = new MutationObserver(records => {
    if (records.some(record => !record.target.closest?.('#kbridge-entry,#kbridge-workspace,#kbridge-drawer'))) scheduleAuth();
  });
  authObserver.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden','aria-hidden','aria-expanded']});
  reload().catch(console.error);
})();
