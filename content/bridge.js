(() => {
  if (globalThis.__kbridgeInjected) return;
  globalThis.__kbridgeInjected = true;

  const BRIDGE_VERSION = '0.10.0';
  const LOCAL_FIX_ID = 'P14-PRODUCTION';
  const KEY = 'kbridgeState';
  const LANGUAGE_KEY = 'rfPortalLanguage';
  let language = 'ru';
  const TXT = {
    applications:'Приложения', heading:'ПРИЛОЖЕНИЯ', customize:'+ Настроить приложения',
    configure:'⚙ Настроить', close:'Закрыть', openTab:'Открыть в отдельной вкладке',
    back:'Вернуться в Keenetic', issue:'Проблемы с открытием панели?',
    help:'Если приложение не загрузилось, попробуй открыть его отдельно. ',
    separate:'Открыть отдельно', empty:'Нет приложений', drawerEmpty:'Приложений пока нет. Добавь их в настройках расширения.',
    more:'Ещё ', sideLabel:'Сторонние приложения', loading:'Загрузка панели…',
    slow:'Панель загружается дольше обычного', refresh:'Перезагрузить панель',
    widthNative:'По ширине Keenetic', widthWide:'На всю доступную ширину', widthError:'Не удалось сохранить ширину',
    fit:'Границы WebUI', fitLeft:'Слева', fitRight:'Справа', fitReset:'Вернуть авто', fitHint:'Авто: по штатной области Keenetic. Если потребуется, введи поправку в пикселях.', fitModeAuto:'Авто · отслеживание окна', fitModeManual:'Ручная поправка активна',
    tabs:'Открытые приложения', tabClose:'Закрыть вкладку', tabLimit:'Максимум три активные панели; старая вкладка выгружается из памяти', favorites:'ИЗБРАННОЕ', nativeSettings:'Настройки Portal', nativeSubtitle:'Управление приложениями этого роутера · без изменения Keenetic', nativeSearch:'Поиск приложений…', nativeAdd:'Добавить приложение', nativeQuick:'Быстро добавить', nativeFull:'Дополнительные настройки и резервные копии', nativeReturn:'Вернуться к приложениям', nativeName:'Название', nativeAddress:'Адрес HTTP(S)', nativeMode:'Открывать', nativeGroup:'Группа', nativeTheme:'Тема', nativeLanguage:'Язык', nativeFavorite:'Избранное', nativeSave:'Сохранить', nativeCancel:'Отмена', nativeEdit:'Изменить', nativeDelete:'Удалить', nativeUp:'Выше', nativeDown:'Ниже', nativeEmpty:'Здесь пока нет приложений', nativeError:'Не удалось сохранить', nativeSaved:'Изменения сохранены', nativeConfirmDelete:'Удалить приложение из списка?', nativeConfirmQuick:'Добавить RouterForge Core, AWG Manager и nfqws с типовыми портами? Существующие записи не изменятся.', nativeAuto:'Автоматически', nativeEmbed:'Внутри Keenetic', nativeExternal:'В отдельной вкладке', nativeDark:'Тёмная', nativeLight:'Светлая', nativeAutoTheme:'Как в Keenetic', nativeEnabled:'Включено', nativeDisabled:'Отключено', nativeUrlError:'Нужен адрес http:// или https:// без логина и пароля', group_routerforge:'ROUTERFORGE', group_network:'СЕТЬ И VPN', group_security:'DNS И ЗАЩИТА', group_other:'ДРУГОЕ'
  };
  const TXT_EN = {
    applications:'Applications', heading:'APPLICATIONS', customize:'+ Configure applications',
    configure:'⚙ Configure', close:'Close', openTab:'Open in a separate tab',
    back:'Back to Keenetic', issue:'Having trouble opening the app?',
    help:'If the application does not load, try opening it separately. ',
    separate:'Open separately', empty:'No applications', drawerEmpty:'No apps yet. Add them in the extension settings.',
    more:'More ', sideLabel:'Third-party applications', loading:'Loading panel…',
    slow:'This panel is taking longer than usual', refresh:'Reload panel',
    widthNative:'Match Keenetic width', widthWide:'Use available width', widthError:'Could not save width setting',
    fit:'WebUI boundaries', fitLeft:'Left', fitRight:'Right', fitReset:'Restore auto', fitHint:'Auto: tracks the Keenetic content area. Enter pixel correction only if necessary.', fitModeAuto:'Auto · follows window size', fitModeManual:'Manual adjustment active',
    tabs:'Open applications', tabClose:'Close tab', tabLimit:'Up to three active panels; oldest tab is unloaded', favorites:'FAVORITES', nativeSettings:'Portal settings', nativeSubtitle:'Manage apps for this router · Keenetic stays unchanged', nativeSearch:'Search applications…', nativeAdd:'Add application', nativeQuick:'Quick setup', nativeFull:'Advanced settings and backups', nativeReturn:'Back to applications', nativeName:'Name', nativeAddress:'HTTP(S) address', nativeMode:'Open mode', nativeGroup:'Group', nativeTheme:'Theme', nativeLanguage:'Language', nativeFavorite:'Favorite', nativeSave:'Save', nativeCancel:'Cancel', nativeEdit:'Edit', nativeDelete:'Remove', nativeUp:'Move up', nativeDown:'Move down', nativeEmpty:'No applications yet', nativeError:'Could not save', nativeSaved:'Changes saved', nativeConfirmDelete:'Remove this application?', nativeConfirmQuick:'Add RouterForge Core, AWG Manager and nfqws using default ports? Existing entries will be preserved.', nativeAuto:'Automatic', nativeEmbed:'Inside Keenetic', nativeExternal:'Separate tab', nativeDark:'Dark', nativeLight:'Light', nativeAutoTheme:'Follow Keenetic', nativeEnabled:'Enabled', nativeDisabled:'Disabled', nativeUrlError:'Use an http:// or https:// URL without credentials', group_routerforge:'ROUTERFORGE', group_network:'NETWORK & VPN', group_security:'DNS & SECURITY', group_other:'OTHER'
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
    set('#kbridge-workspace .kb-refresh','title','refresh');
    set('#kbridge-workspace .kb-refresh','aria-label','refresh');
    updateWidthControl();
    updateFitControl();
    renderWorkspaceTabs();
    if (settingsOpen) renderNativeSettings();
    const status = workspace?.querySelector('.kb-frame-status');
    if (status && !status.hidden && status.dataset.kbState) status.textContent=L(status.dataset.kbState);
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
  let nativeRoute = location.href;
  let settingsOpen = false, settingsSearch = '', settingsEditingId = null, settingsSaveQueue = Promise.resolve();
  let frameLoadTimer = null, autoHelpVisible = false;
  // P10: in-memory, per-origin LRU. NEVER persisted: route/logout tears down all iframe DOM.
  const MAX_WORKSPACE_FRAMES = 3;
  const frames = new Map(); // id -> {frame,url,loading,slow}, Map order = least recent first
  let frameStack = null;

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
  function clearFrameTimer() {
    if (frameLoadTimer !== null) clearTimeout(frameLoadTimer);
    frameLoadTimer = null;
  }
  function frameStatus(state) {
    const node = workspace?.querySelector('.kb-frame-status');
    if (!node) return;
    node.dataset.kbState = state || '';
    node.hidden = !state;
    if (state) node.textContent = L(state);
  }
  function startFrameLoad() {
    clearFrameTimer();
    const token = ++activeFrameToken;
    frameStatus('loading');
    const help = workspace?.querySelector('.kbhelp');
    if (help) help.hidden = true;
    autoHelpVisible = false;
    // Cross-origin iframe events cannot reliably establish CSP/X-Frame-Options success.
    // A timeout is only a hint, not proof of an unreachable service.
    frameLoadTimer = setTimeout(() => {
      if (token !== activeFrameToken || workspace?.hidden) return;
      frameStatus('slow');
      const active=frames.get(currentAppId);if(active)active.slow=true;
      if (help) help.hidden = false;
      autoHelpVisible = true;
    }, 12000);
    return token;
  }
  function unmount() {
    ++activeFrameToken;
    clearFrameTimer();
    for (const fn of mountListeners.splice(0)) fn();
    for (const observer of [domObserver,themeObserver,resizeObserver]) observer?.disconnect();
    destroyAllFrames();
    [entry,drawer,workspace].forEach(el => el?.remove());
    entry = drawer = workspace = host = null;
    domObserver = themeObserver = resizeObserver = null;
    layoutTargets = []; navIsCollapsed = false; currentAppId = null; frameStack = null; settingsOpen = false; settingsEditingId = null;
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
  // A router navigation event must never leave the embedded application covering
  // a newly selected native page. Do not modify History API or Keenetic routes.
  function reconcileNativeRoute() {
    const next = location.href;
    if (next === nativeRoute) return;
    nativeRoute = next;
    dismiss();
    if (workspace && !workspace.hidden) closeWorkspace();
    scheduleLayout();
  }
  // Netcraze/Keenetic WebUI (verified from the actual Elements DOM):
  // layout__content__wrapper > layout__content__inner >
  // layout__content__main.layout__content__main--shifted > ng-component > ndw-page-wrapper.
  // The router's own shifted main is more reliable than matching a generic <main>,
  // and ndw-page-wrapper itself may be wider than the *visible* scroll container.
  function netcrazeMain() {
    const nodes = document.querySelectorAll('.layout__content__main--shifted, .layout__content__main');
    for (const node of nodes) {
      if (!isVisible(node) || node.closest('#kbridge-entry,#kbridge-drawer,#kbridge-workspace')) continue;
      const r = pointRect(node);
      if (r && r.width >= 320 && r.height >= 200 && r.left >= 0 && r.left < innerWidth * .7) return node;
    }
    return null;
  }
  function mainHost() {
    const exact = netcrazeMain();
    if (exact) return exact;
    const candidates = document.querySelectorAll('main, [role="main"], #main-content, #content, .main-content, .content-wrapper, .page-content');
    let selected = null, best = -Infinity;
    const sidebarRight = pointRect(host)?.right || 0;
    const minimumLeft = sidebarRight >= 44 && sidebarRight <= 110 ? 44 : 90;
    for (const el of candidates) {
      if (el.closest('#kbridge-workspace,#kbridge-drawer,#kbridge-entry')) continue;
      const r = pointRect(el);
      if (r.width < 360 || r.height < 250 || r.left < minimumLeft || r.left > innerWidth * .6) continue;
      const score = Math.min(r.width, innerWidth) + Math.min(r.height, innerHeight) - r.left * .1;
      if (score > best) { best = score; selected = el; }
    }
    return selected;
  }
  // The Keenetic navigation must always follow the actual host theme. A user
  // can choose a different Portal workspace theme without recoloring the
  // stock dark sidebar (which would make extension links unreadable).
  function detectHostTheme() {
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
  function detectTheme() {
    return profile?.theme === 'dark' || profile?.theme === 'light'
      ? profile.theme : detectHostTheme();
  }
  function updateTheme() {
    const hostTheme = detectHostTheme();
    const next = detectTheme();
    if (theme === next && entry?.dataset.kbTheme === hostTheme &&
        drawer?.dataset.kbTheme === hostTheme && workspace?.dataset.kbTheme === next) return;
    theme = next;
    if (entry) entry.dataset.kbTheme = hostTheme;
    if (drawer) drawer.dataset.kbTheme = hostTheme;
    if (workspace) workspace.dataset.kbTheme = next;
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
    // Re-measure on CSS responsive reflow, even when window.resize is not fired
    // (sidebar collapse / scroll container / DevTools docking).
    const nc=netcrazeMain();
    const targets = [host, mainHost(), nc?.closest('.layout__content__inner'),
      nc?.closest('.layout__content__wrapper'), document.querySelector('header,[role="banner"]')].filter(Boolean);
    const unique=[...new Set(targets)];
    if (layoutTargets.length === unique.length && unique.every((n, i) => n === layoutTargets[i])) return;
    resizeObserver.disconnect();
    layoutTargets = unique;
    for (const el of unique) resizeObserver.observe(el);
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
  function trimPx(value) { const n=Number(value); return Number.isInteger(n) && n>=0 && n<=160?n:0; }
  const appMode = app => app.mode || 'auto';
  const appWidth = app => app?.layoutWidth === 'wide' ? 'wide' : 'native';
  function currentApp() { return profile?.apps.find(a => a.id === currentAppId && a.enabled !== false); }
  function updateWidthControl() {
    const button = workspace?.querySelector('.kb-width-toggle');
    if (!button) return;
    const isWide = appWidth(currentApp()) === 'wide';
    button.title = L(isWide ? 'widthNative' : 'widthWide');
    button.setAttribute('aria-label', button.title);
    button.setAttribute('aria-pressed', String(isWide));
    button.textContent = isWide ? '⇤⇥' : '⇥⇤';
  }
  function updateFitControl() {
    const panel=workspace?.querySelector('.kb-fit-panel');
    const app=currentApp();
    if (!panel || !app) return;
    for (const field of ['nativeLeftTrimPx','nativeRightTrimPx']) {
      const input=panel.querySelector(`[data-fit-value="${field}"]`);
      // Do not destroy a partially typed number while the user is editing.
      if (input && document.activeElement !== input) input.value=String(trimPx(app[field]));
    }
    panel.querySelector('.kb-fit-heading').textContent=L('fit');
    panel.querySelector('.kb-fit-hint').textContent=L('fitHint');
    panel.querySelector('.kb-fit-mode').textContent=L(app.manualBounds ? 'fitModeManual' : 'fitModeAuto');
    panel.querySelector('[data-fit-label="nativeLeftTrimPx"]').textContent=L('fitLeft');
    panel.querySelector('[data-fit-label="nativeRightTrimPx"]').textContent=L('fitRight');
    for(const [field,key] of [['nativeLeftTrimPx','fitLeft'],['nativeRightTrimPx','fitRight']]) panel.querySelector(`[data-fit-value="${field}"]`)?.setAttribute('aria-label',L(key)+' (px)');
    panel.querySelector('.kb-fit-reset').textContent=L('fitReset');
    const trigger=workspace.querySelector('.kb-fit-trigger');
    trigger.title=L('fit');trigger.setAttribute('aria-label',L('fit'));
  }
  // Serialized per-app calibration writes protect rapid clicks from out-of-order
  // chrome.storage events; local movement stays instant and does not reload iframe.
  let fitSaveQueue = Promise.resolve();
  function setFitValue(field, rawValue) {
    const app=currentApp();
    if (!app || !['nativeLeftTrimPx','nativeRightTrimPx'].includes(field)) return Promise.resolve();
    // Reject malformed or fractional input rather than silently snapping to 8px.
    const text=String(rawValue).trim();
    const input=workspace?.querySelector(`[data-fit-value="${field}"]`);
    if (!/^\d{1,3}$/.test(text) || Number(text)>160) {
      updateFitControl();
      if (input) input.value=String(trimPx(app[field]));
      return Promise.resolve();
    }
    const previous=trimPx(app[field]), next=Number(text);
    if (previous===next) { updateFitControl(); return Promise.resolve(); }
    const id=app.id;
    const previousManual=app.manualBounds===true;
    app[field]=next;app.manualBounds=true;updateFitControl();positionWorkspace();
    fitSaveQueue=fitSaveQueue.catch(()=>{}).then(async()=>{
      const { [KEY]:saved }=await chrome.storage.local.get(KEY);
      const updated=saved?.routers?.[origin]?.apps?.find(item=>item.id===id);
      if(!updated)throw Error('APP_PROFILE_NOT_FOUND');
      updated[field]=next;
      updated.manualBounds=true;
      await chrome.storage.local.set({[KEY]:saved});
    });
    return fitSaveQueue.catch(error=>{
      if (currentApp()?.id===id && trimPx(app[field])===next) {
        app[field]=previous;app.manualBounds=previousManual;updateFitControl();positionWorkspace();
      }
      console.warn('RouterForge Portal: calibration not saved',error);
      frameStatus('widthError');
    });
  }
  function adjustFit(field, delta) {
    const app=currentApp();
    if (!app) return Promise.resolve();
    return setFitValue(field, Math.max(0,Math.min(160,trimPx(app[field])+delta)));
  }
  async function resetFit() {
    const app=currentApp();if(!app)return;
    const id=app.id;
    const oldLeft=trimPx(app.nativeLeftTrimPx),oldRight=trimPx(app.nativeRightTrimPx),oldManual=app.manualBounds===true;
    app.nativeLeftTrimPx=0;app.nativeRightTrimPx=0;app.manualBounds=false;updateFitControl();positionWorkspace();
    fitSaveQueue=fitSaveQueue.catch(()=>{}).then(async()=>{
      const { [KEY]: saved }=await chrome.storage.local.get(KEY);
      const updated=saved?.routers?.[origin]?.apps?.find(item=>item.id===id);
      if(!updated)throw Error('APP_PROFILE_NOT_FOUND');
      updated.nativeLeftTrimPx=0;updated.nativeRightTrimPx=0;updated.manualBounds=false;
      await chrome.storage.local.set({[KEY]:saved});
    });
    try {await fitSaveQueue;}
    catch(error) {
      if (currentApp()?.id===id && !app.nativeLeftTrimPx && !app.nativeRightTrimPx) {
        app.nativeLeftTrimPx=oldLeft;app.nativeRightTrimPx=oldRight;app.manualBounds=oldManual;
        updateFitControl();positionWorkspace();
      }
      console.warn('RouterForge Portal: calibration reset failed',error);
      frameStatus('widthError');
    }
  }
  async function toggleWorkspaceWidth() {
    const app = currentApp();
    if (!app || !profile) return;
    const nextWidth = appWidth(app) === 'native' ? 'wide' : 'native';
    // Do not reload the iframe on width changes; write through the existing
    // browser/userscript storage abstraction and preserve other profiles.
    // Give direct visual feedback before storage IO; a save failure must not
    // silently leave a pressed-looking button with unchanged geometry.
    const oldWidth = appWidth(app);
    app.layoutWidth = nextWidth;
    updateWidthControl();
    positionWorkspace();
    try {
      const { [KEY]: saved } = await chrome.storage.local.get(KEY);
      const updated = saved?.routers?.[origin]?.apps?.find(item => item.id === app.id);
      if (!updated) throw Error('APP_PROFILE_NOT_FOUND');
      updated.layoutWidth = nextWidth;
      await chrome.storage.local.set({ [KEY]: saved });
    } catch (error) {
      app.layoutWidth = oldWidth;
      updateWidthControl();
      positionWorkspace();
      console.warn('RouterForge Portal: width change could not be saved', error);
      frameStatus('widthError');
      throw error;
    }
  }
  function setCurrent(id) {
    currentAppId = id;
    entry?.querySelectorAll('[data-app-id]').forEach(node => {
      const active = !settingsOpen && node.dataset.appId === id;
      node.classList.toggle('kb-active', active);
      if (active) node.setAttribute('aria-current', 'page');
      else node.removeAttribute('aria-current');
    });
  }
  // P10 workspace: every embedded app owns an iframe while cached. Re-selecting
  // a tab does not navigate it. A deterministic LRU cap limits hidden memory.
  function forgetFrame(id) {
    const item = frames.get(id);
    if (!item) return;
    frames.delete(id);
    item.frame.removeAttribute('src'); // stop network/UI activity before removal
    item.frame.remove();
  }
  function destroyAllFrames() {
    clearFrameTimer();
    for (const id of [...frames.keys()]) forgetFrame(id);
    if (frameStack) frameStack.replaceChildren();
  }
  function showOnlyCurrentFrame() {
    for (const [id, item] of frames) {
      const active = id === currentAppId && !settingsOpen;
      item.frame.hidden = !active;
      item.frame.toggleAttribute('inert', !active);
      item.frame.setAttribute('aria-hidden', String(!active));
      item.frame.tabIndex = active ? 0 : -1;
    }
  }
  function renderWorkspaceTabs() {
    const bar = workspace?.querySelector('.kb-workspace-tabs');
    if (!bar) return;
    bar.replaceChildren();
    bar.hidden = settingsOpen || frames.size < 2;
    bar.setAttribute('aria-label', L('tabs'));
    for (const [id] of frames) {
      const app = profile?.apps?.find(a=>a.id===id);
      if (!app) continue;
      const wrap = make('span','kb-tab');
      wrap.dataset.kbTab = id;
      const activate = make('button','kb-tab-select',app.icon+' '+app.name);
      activate.type='button';activate.title=app.name;
      activate.setAttribute('aria-pressed',String(currentAppId===id));
      activate.addEventListener('click',()=>appOpen(app));
      const quit=make('button','kb-tab-close','×');
      quit.type='button';quit.title=L('tabClose')+' — '+app.name;
      quit.setAttribute('aria-label',quit.title);
      quit.addEventListener('click',()=>closeTab(id));
      wrap.append(activate,quit);bar.append(wrap);
    }
  }
  function closeTab(id) {
    if (!frames.has(id)) return;
    const wasCurrent = currentAppId === id;
    forgetFrame(id);
    if (wasCurrent) {
      if (frames.size) {
        const nextId = [...frames.keys()].at(-1);
        const app = profile?.apps?.find(a=>a.id===nextId && a.enabled!==false);
        if (app) { appOpen(app);return; }
      }
      closeWorkspace();return;
    }
    renderWorkspaceTabs();
  }
  function makeAppFrame(app) {
    const frame = make('iframe');
    frame.setAttribute('referrerpolicy','no-referrer');
    frame.title = `${app.name} — RouterForge Portal`;
    frame.dataset.kbFrameId = app.id;
    const item={frame,url:app.url,loading:true,slow:false};
    frame.addEventListener('load', () => {
      // Onload is NOT proof a cross-origin site can be framed.
      if (frames.get(app.id)!==item) return;
      item.loading=false;item.slow=false;
      if (currentAppId!==app.id || workspace?.hidden) return;
      clearFrameTimer();frameStatus('');
      if (autoHelpVisible) {workspace.querySelector('.kbhelp').hidden=true;autoHelpVisible=false;}
    });
    frameStack.append(frame);
    frames.set(app.id,item);
    return item;
  }
  function appOpen(app) {
    dismiss();
    if (settingsOpen) leaveNativeSettings(false);
    if (appMode(app) === 'external') { openExternal(app.id); return; }
    if (!workspace || !frameStack) return;
    if (frames.has(app.id) && frames.get(app.id).url!==app.url) forgetFrame(app.id);
    // Ordered Map implements LRU; never evict the tab being opened.
    const wasActive = currentAppId===app.id && !workspace.hidden;
    let item=frames.get(app.id);
    const isNew=!item;
    if (item) {frames.delete(app.id);frames.set(app.id,item);}
    workspace.hidden = false;
    setCurrent(app.id);
    workspace.querySelector('.kbappname').textContent = app.name;
    workspace.querySelector('.kbappicon').textContent = app.icon;
    if (isNew) {
      // Place placeholder BEFORE frame src to avoid a synchronous load race.
      item=makeAppFrame(app);
    }
    while (frames.size > MAX_WORKSPACE_FRAMES) forgetFrame(frames.keys().next().value);
    showOnlyCurrentFrame();
    updateWidthControl();updateFitControl();
    workspace.querySelector('.kb-fit-panel').hidden=true;
    if (item.loading && wasActive) {
      // Re-selecting the current app must not reset its slow/loading state.
    } else if (item.loading && item.slow) {
      clearFrameTimer();frameStatus('slow');workspace.querySelector('.kbhelp').hidden=false;
    } else if (item.loading) {
      workspace.dataset.loadingToken = String(startFrameLoad());
      if (isNew) item.frame.src = app.url;
    } else { clearFrameTimer();frameStatus('');workspace.querySelector('.kbhelp').hidden=true; }
    renderWorkspaceTabs();positionWorkspace();
  }
  function reloadCurrentFrame() {
    if (!workspace || workspace.hidden || !currentAppId) return;
    const app = currentApp(), item = frames.get(currentAppId);
    if (!app || !item) return;
    item.loading=true;item.slow=false;
    workspace.dataset.loadingToken = String(startFrameLoad());
    item.frame.src = app.url; // explicit reload intentionally returns to app root
  }
  function closeWorkspace() {
    ++activeFrameToken;
    settingsOpen=false; settingsEditingId=null; syncNativeSettingsVisibility();
    destroyAllFrames();
    frameStatus('');autoHelpVisible=false;
    setCurrent(null);
    if (workspace) {
      workspace.hidden=true;
      workspace.querySelector('.kbhelp').hidden=true;
      workspace.querySelector('.kb-fit-panel').hidden=true;
      renderWorkspaceTabs();
    }
  }
  // A Keenetic root <main> can be much wider than its real content
  // column. Find a large *inner wrapper* when there is convincing geometry.
  // Do not attach to narrow cards, tables or panels inside the native page.
  function nativeContentColumn(root) {
    if (!root || !isVisible(root)) return null;
    const base = pointRect(root);
    if (!base || base.width < 360 || base.height < 200) return null;
    const minWidth = Math.max(360, Math.min(900, innerWidth * .53));
    const floorWidth = Math.max(minWidth, base.width * .66);
    const queue = [{element:root,depth:0}];
    let best = root, bestScore = 0;
    for (let index=0;index<queue.length && index<90;index++) {
      const {element,depth} = queue[index];
      if (depth >= 3) continue;
      for (const child of element.children) {
        if (child.closest?.('#kbridge-workspace,#kbridge-entry,#kbridge-drawer') || !isVisible(child)) continue;
        const r = pointRect(child);
        if (!r || r.width < floorWidth || r.height < 200) continue;
        if (r.left < base.left - 5 || r.right > base.right + 5) continue;
        if (r.top < base.top - 6 || r.top > base.top + 125) continue;
        // Only a sufficiently wide content column qualifies; deeply nested
        // components must not redefine the boundaries of the entire page.
        const rightInset = base.right - r.right, leftInset = r.left - base.left;
        const validInset = rightInset >= 18 && rightInset < base.width * .35;
        const widthRatio = r.width / base.width;
        const score = validInset && widthRatio >= .66
          ? rightInset + Math.min(30,leftInset) - depth * 20 : 0;
        if (score > bestScore) {bestScore=score;best=child;}
        queue.push({element:child,depth:depth+1});
      }
    }
    return best;
  }
  // Some Keenetic/Netcraze themes center the interface in a bounded
  // shell. Its header is a stronger right-edge landmark than the outer <main>,
  // which may extend farther (especially on wide monitors). Only use a header
  // that overlaps the same shell and agrees with main's plausible geometry.
  function nativeShellRight(mainRect, navRect) {
    const sidebarRight = navRect?.right || 0;
    let best = null;
    for (const el of document.querySelectorAll('header,[role="banner"],#header,.header,.page-header,.main-header')) {
      if (!isVisible(el) || el.closest('#kbridge-entry,#kbridge-workspace,#kbridge-drawer')) continue;
      const r = pointRect(el);
      if (!r || r.top < -4 || r.top > 12 || r.height < 25 || r.height > 105) continue;
      if (r.left > sidebarRight + 40 || r.right < sidebarRight + 360) continue;
      if (r.width < mainRect.width * .55) continue;
      const excess = mainRect.right - r.right;
      if (excess < 12 || excess > mainRect.width * .43) continue;
      // Prefer the widest credible header; ignore nested short controls.
      if (!best || r.width > best.width) best = r;
    }
    return best ? Math.floor(best.right) : null;
  }
  function netcrazeContentBounds() {
    const main=netcrazeMain();
    if (!main) return null;
    const r=pointRect(main), nav=pointRect(host), css=getComputedStyle(main);
    if (!r || r.width < 320 || r.height < 200) return null;
    const leftPad=parseFloat(css.paddingLeft)||0, rightPad=parseFloat(css.paddingRight)||0;
    const topPad=parseFloat(css.paddingTop)||0, bottomPad=parseFloat(css.paddingBottom)||0;
    // Root scroll areas may overflow their parent. Constrain the placement by
    // every known native layout container, NEVER by a guessed viewport percent.
    let left=r.left+leftPad, right=r.right-rightPad;
    for (const parent of [main.closest('.layout__content__inner'),main.closest('.layout__content__wrapper')]) {
      if (!parent || !isVisible(parent)) continue;
      const p=pointRect(parent),cs=getComputedStyle(parent);
      if (!p || p.width<320) continue;
      left=Math.max(left,p.left+(parseFloat(cs.paddingLeft)||0));
      right=Math.min(right,p.right-(parseFloat(cs.paddingRight)||0));
    }
    const railRight=nav && nav.right>=44 && nav.right<innerWidth*.6 ? nav.right : 0;
    left=Math.max(left,railRight);
    right=Math.min(right,innerWidth);
    const top=Math.max(topBoundary(),Math.ceil(r.top+topPad));
    const bottom=r.bottom>=innerHeight*.7 ? Math.min(innerHeight,r.bottom-bottomPad) : innerHeight;
    if (!Number.isFinite(left)||!Number.isFinite(right)||right-left<320 || bottom-top<230) return null;
    return {left:Math.ceil(left),top,right:Math.max(0,Math.ceil(innerWidth-right)),bottom:Math.max(0,Math.ceil(innerHeight-bottom))};
  }
  function nativeContentBounds() {
    const exact=netcrazeContentBounds();
    if (exact) return exact;
    const main = mainHost();
    if (!main || !isVisible(main)) return null;
    const rootRect = pointRect(main);
    const column = nativeContentColumn(main);
    const rect = pointRect(column);
    const nav = pointRect(host);
    if (!rect || !rootRect || !Number.isFinite(rect.left) || !Number.isFinite(rect.top)) return null;
    const railRight = nav && nav.right >= 44 && nav.right < innerWidth * .42 ? nav.right : 0;
    // The native page has a content gutter after the sidebar. Do not add a
    // second gutter if an actual inner content column already provides one.
    const closeToRail = Math.abs(rect.left - railRight) <= 8;
    const cssPad = parseFloat(getComputedStyle(main).paddingLeft) || 0;
    const leftGutter = Math.max(16, Math.min(28, cssPad));
    const left = Math.max(0, Math.ceil(rect.left), Math.ceil(railRight + (closeToRail ? leftGutter : 0)));
    const top = Math.max(topBoundary(), Math.ceil(rootRect.top));
    let right = Math.min(innerWidth, Math.floor(rect.right));
    const shellRight = nativeShellRight(rootRect, nav);
    if (shellRight !== null) right = Math.min(right, shellRight);
    // No guessed viewport-dependent gutter. The measured native main/shell
    // edge is authoritative and changes with the router's responsive CSS.
    // Subtracting 1.8% or an arbitrary number of pixels breaks windowed mode.
    // Use the original native main's bottom, not the last card's height.
    const bottom = rootRect.bottom >= innerHeight * .7
      ? Math.min(innerHeight,Math.floor(rootRect.bottom)) : innerHeight;
    if (rootRect.top < -2 || rect.left < 0 || right - left < 360 || bottom - top < 240) return null;
    if (top > innerHeight * .35 || left > innerWidth * .6) return null;
    return {left, top, right:Math.max(0,innerWidth-right),bottom:Math.max(0,innerHeight-bottom)};
  }
  function positionWorkspace() {
    if (!workspace || workspace.hidden) return;
    const navRect = pointRect(host);
    const railRight = navRect && navRect.right > 44 && navRect.right < innerWidth * .42 ? navRect.right : null;
    const native = nativeContentBounds();
    const fallback = {
      left:Math.max(0,Math.round(railRight ?? pointRect(mainHost())?.left ?? 0)),
      top:topBoundary(),right:0,bottom:0
    };
    const app = settingsOpen ? null : currentApp();
    const wide = !settingsOpen && appWidth(app) === 'wide';
    // Follow measured, live Keenetic content bounds; never cap by a fixed
    // percentage of the viewport. Legacy 85% and 22px settings are ignored
    // until the user explicitly enables manual adjustment on this build.
    const original = native || fallback;
    const manual = app?.manualBounds === true;
    const bounds = wide ? fallback : {
      ...original,
      left: original.left + (manual ? trimPx(app?.nativeLeftTrimPx) : 0),
      right: original.right + (manual ? trimPx(app?.nativeRightTrimPx) : 0)
    };
    // Keep the content usable even if a device has an unusually narrow view.
    if (innerWidth-bounds.left-bounds.right < 320) {
      bounds.right=Math.max(0,innerWidth-bounds.left-320);
    }
    for (const name of ['left','top','right','bottom']) {
      const value = `${Math.round(bounds[name])}px`;
      if (workspace.style.getPropertyValue(name) !== value || workspace.style.getPropertyPriority(name) !== 'important')
        workspace.style.setProperty(name,value,'important');
    }
    workspace.dataset.kbPlacement = wide ? 'wide' : (native ? 'native' : 'fallback');
    workspace.dataset.kbRightInset = String(Math.round(bounds.right));
    workspace.dataset.kbBoundaryMode = app?.manualBounds===true ? 'manual' : 'auto';
    workspace.dataset.kbMeasuredRight = String(Math.round(native ? innerWidth - native.right : innerWidth));
    workspace.dataset.kbLayout = navIsCollapsed ? 'compact' : 'expanded';
    workspace.dataset.kbWidth = wide ? 'wide' : 'native';
    workspace.dataset.kbFix = LOCAL_FIX_ID;
    workspace.dataset.kbNativeLeftTrim = String(trimPx(app?.nativeLeftTrimPx));
    workspace.dataset.kbNativeRightTrim = String(trimPx(app?.nativeRightTrimPx));
  }
  const p11Groups=['routerforge','network','security','other'];
  const p11Group=app=>p11Groups.includes(app.group)?app.group:(app.presetId==='routerforge'?'routerforge':app.presetId==='adguard-home'?'security':(['awg-manager','nfqws-web','nfqws2-ui','neofit','xkeen-ui'].includes(app.presetId)?'network':'other'));
  function p11Ordered() { return (profile?.apps||[]).filter(a=>a.enabled!==false).slice().sort((a,b)=>Number(Boolean(b.favorite))-Number(Boolean(a.favorite))||p11Groups.indexOf(p11Group(a))-p11Groups.indexOf(p11Group(b))); }
  function p11Label(app){return app.favorite?'favorites':'group_'+p11Group(app);}
  function renderDrawer() {
    if (!drawer || !profile) return;
    const list = drawer.querySelector('.kblist'); list.replaceChildren();
    const activeApps = p11Ordered();
    if (!activeApps.length) list.append(make('p', 'kbmuted', L('drawerEmpty')));
    let lastGroup='';
    for (const app of activeApps) {
      const group=p11Label(app);if(group!==lastGroup){list.append(make('div','kb-group-label',L(group)));lastGroup=group;}
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
    const activeApps = p11Ordered();
    let lastGroup='';
    for (const app of activeApps.slice(0, MAX_INLINE)) {
      const group=p11Label(app);if(group!==lastGroup){list.append(make('div','kb-group-label',L(group)));lastGroup=group;}
      const btn = make('button', 'kb-nav-item'); btn.type = 'button';
      btn.dataset.appId = app.id; btn.title = `${app.name}\n${app.url}`;
      btn.append(make('span','kb-nav-icon',app.icon),make('span','kb-nav-name',app.name));if(app.favorite)btn.classList.add('kb-favorite');
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
    settings.type = 'button'; settings.classList.toggle('kb-active',settingsOpen); settings.setAttribute('aria-current',settingsOpen?'page':'false'); settings.addEventListener('click', ev => {
      ev.preventDefault(); ev.stopPropagation(); openNativeSettings();
    });
    list.append(settings); entry.append(list);
    setCurrent(currentAppId);
  }
  // P12 Native Settings: same router-scoped storage as the popup and userscript.
  // No privileged router API, cross-origin probes or modification of the host DOM.
  function settingsNode(tag, className, text) {
    const n=make(tag, className||'', text);if(tag==='button')n.type='button';return n;
  }
  function settingsButton(text, fn, extra='') {
    const button=settingsNode('button','kb-ns-button '+extra,text);
    button.addEventListener('click',fn);return button;
  }
  function nativeGroup(app) {return p11Group(app);}
  function newNativeId() {
    const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);
    return 'native_'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  }
  function validNativeUrl(value) {
    const raw=String(value||'').trim();if(!raw||raw.length>2048)throw Error(L('nativeUrlError'));
    let url;try{url=new URL(raw);}catch{throw Error(L('nativeUrlError'));}
    if(!['http:','https:'].includes(url.protocol)||!url.hostname||url.username||url.password)throw Error(L('nativeUrlError'));
    return url.href;
  }
  function syncNativeSettingsVisibility() {
    if(!workspace)return;
    const panel=workspace.querySelector('.kb-native-settings');if(panel)panel.hidden=!settingsOpen;
    if(frameStack)frameStack.hidden=settingsOpen;
    for(const sel of ['.kb-width-toggle','.kb-fit-trigger','.kb-refresh','.kb-external','.kb-help-trigger']){
      const control=workspace.querySelector(sel);if(control)control.hidden=settingsOpen;
    }
    const fit=workspace.querySelector('.kb-fit-panel');if(settingsOpen&&fit)fit.hidden=true;
    const help=workspace.querySelector('.kbhelp');if(settingsOpen&&help)help.hidden=true;
    const name=workspace.querySelector('.kbappname'),icon=workspace.querySelector('.kbappicon');
    if(settingsOpen){if(name)name.textContent=L('nativeSettings');if(icon)icon.textContent='⚙';}
    workspace.dataset.kbNativeSettings=String(settingsOpen);
    renderNav();
    showOnlyCurrentFrame();renderWorkspaceTabs();
    if(settingsOpen)renderNativeSettings();
    positionWorkspace();
  }
  function openNativeSettings() {
    if(!workspace||!profile||!isAuthenticatedShell())return;
    dismiss();settingsOpen=true;settingsEditingId=null;
    workspace.hidden=false;clearFrameTimer();frameStatus('');
    syncNativeSettingsVisibility();
  }
  function leaveNativeSettings(restore) {
    if(!settingsOpen)return;
    settingsOpen=false;settingsEditingId=null;
    syncNativeSettingsVisibility();
    const app=restore && currentApp();
    if(app && frames.has(app.id))appOpen(app);
    else if(restore)closeWorkspace();
  }
  function nativeNotice(message,isError=false) {
    const target=workspace?.querySelector('.kb-native-settings .kb-ns-notice');
    if(target){target.textContent=message;target.dataset.error=String(isError);target.hidden=false;}
  }
  // Queue writes against the latest stored state, preventing rapid favorite/reorder
  // clicks from overwriting one another or unrelated router profiles.
  function nativeWrite(mutator) {
    settingsSaveQueue=settingsSaveQueue.catch(()=>{}).then(async()=>{
      const data=await chrome.storage.local.get(KEY);
      const state=JSON.parse(JSON.stringify(data[KEY]||{version:1,routers:{}}));
      const router=state.routers?.[origin];if(!router)throw Error('ROUTER_PROFILE_MISSING');
      mutator(router,state);
      if(!Array.isArray(router.apps)||router.apps.length>100)throw Error('APP_LIMIT_EXCEEDED');
      await chrome.storage.local.set({[KEY]:state});
      // storage.onChanged invokes reload() for both Chrome and userscript.
    });
    return settingsSaveQueue.then(()=>true,error=>{console.warn('RouterForge Portal native settings:',error);nativeNotice(L('nativeError')+': '+error.message,true);return false;});
  }
  function nativeInput(parent,label,value,type='text') {
    const wrap=settingsNode('label','kb-ns-field');
    wrap.append(settingsNode('span','',label));
    const input=settingsNode('input','');input.type=type;input.value=String(value??'');input.maxLength=type==='text'?2048:-1;
    wrap.append(input);parent.append(wrap);return input;
  }
  function nativeSelect(parent,label,value,choices) {
    const wrap=settingsNode('label','kb-ns-field');wrap.append(settingsNode('span','',label));
    const select=settingsNode('select');for(const [id,name] of choices){const option=settingsNode('option','',name);option.value=id;select.append(option);}
    select.value=value;wrap.append(select);parent.append(wrap);return select;
  }
  function nativeEditForm(parent,app) {
    const edit=settingsNode('form','kb-ns-editor');parent.append(edit);
    edit.append(settingsNode('h3','',app?L('nativeEdit'):L('nativeAdd')));
    const formFields=settingsNode('div','kb-ns-fields');edit.append(formFields);
    const name=nativeInput(formFields,L('nativeName'),app?.name||'');name.maxLength=70;
    const address=nativeInput(formFields,L('nativeAddress'),app?.url||('http://'+location.hostname+':8080/'));
    const mode=nativeSelect(formFields,L('nativeMode'),app?.mode||'auto', [['auto',L('nativeAuto')],['embedded',L('nativeEmbed')],['external',L('nativeExternal')]]);
    const group=nativeSelect(formFields,L('nativeGroup'),app?nativeGroup(app):'other',p11Groups.map(id=>[id,L('group_'+id)]));
    const enabled=settingsNode('label','kb-ns-checkbox');const check=settingsNode('input');check.type='checkbox';check.checked=app?.enabled!==false;enabled.append(check,settingsNode('span','',L('nativeEnabled')));edit.append(enabled);
    const controls=settingsNode('div','kb-ns-actions');
    const save=settingsButton(L('nativeSave'),()=>{},'kb-ns-primary');save.type='submit';
    const cancel=settingsButton(L('nativeCancel'),()=>{settingsEditingId=null;renderNativeSettings();});
    controls.append(save,cancel);edit.append(controls);
    edit.addEventListener('submit',event=>{
      event.preventDefault();
      let url,cleanName;try{url=validNativeUrl(address.value);cleanName=name.value.trim();if(!cleanName||cleanName.length>70)throw Error(L('nativeName'));}
      catch(error){nativeNotice(error.message,true);return;}
      save.disabled=true;
      nativeWrite(router=>{
        const current=app&&router.apps.find(x=>x.id===app.id);
        if(app&&!current)throw Error('APP_NOT_FOUND');
        if(current){Object.assign(current,{name:cleanName,url,mode:mode.value,group:group.value,enabled:check.checked});}
        else router.apps.push({id:newNativeId(),name:cleanName,url,mode:mode.value,group:group.value,enabled:check.checked,icon:'▣',favorite:false,layoutWidth:'native'});
      }).then(ok=>{if(ok){settingsEditingId=null;renderNativeSettings();}else save.disabled=false;});
    });
    name.focus();
  }
  function nativeMoveApp(app,delta) {
    return nativeWrite(router=>{
      const apps=router.apps;const at=apps.findIndex(x=>x.id===app.id);
      const peers=apps.map((x,i)=>({x,i})).filter(({x})=>x.enabled!==false&&Boolean(x.favorite)===Boolean(app.favorite)&&nativeGroup(x)===nativeGroup(app));
      const position=peers.findIndex(({i})=>i===at),other=peers[position+delta];
      if(other) [apps[at],apps[other.i]]=[apps[other.i],apps[at]];
    });
  }
  function renderNativeSettingsList(list) {
    if(!list||!profile)return;
    list.replaceChildren();
    const apps=[...p11Ordered(),...(profile.apps||[]).filter(a=>a.enabled===false)].filter(x=>[x.name,x.url,L('group_'+nativeGroup(x))].some(v=>v.toLocaleLowerCase().includes(settingsSearch.toLocaleLowerCase())));
    if(!apps.length)list.append(settingsNode('p','kb-ns-muted',L('nativeEmpty')));
    let last='';
    for(const app of apps){
      const cat=p11Label(app);if(last!==cat){list.append(settingsNode('h3','kb-ns-group',L(cat)));last=cat;}
      const row=settingsNode('div','kb-ns-app');row.dataset.kbSettingsId=app.id;
      const identity=settingsNode('div','kb-ns-identity');identity.append(settingsNode('strong','',app.icon+' '+app.name+(app.enabled===false?' · '+L('nativeDisabled'):'')),settingsNode('small','',app.url));
      row.append(identity);
      const controls=settingsNode('div','kb-ns-actions');
      const enabled=settingsButton(app.enabled===false?'○':'✓',()=>nativeWrite(router=>{const x=router.apps.find(a=>a.id===app.id);if(x)x.enabled=!x.enabled;}));
      enabled.title=L('nativeEnabled');enabled.setAttribute('aria-label',L('nativeEnabled')+' '+app.name);enabled.setAttribute('aria-pressed',String(app.enabled!==false));
      const fav=settingsButton(app.favorite?'★':'☆',()=>nativeWrite(router=>{const x=router.apps.find(a=>a.id===app.id);if(x)x.favorite=!x.favorite;}));
      fav.title=L('nativeFavorite');fav.setAttribute('aria-label',L('nativeFavorite')+' '+app.name);fav.setAttribute('aria-pressed',String(Boolean(app.favorite)));
      const group=nativeSelect(controls,L('nativeGroup'),nativeGroup(app),p11Groups.map(id=>[id,L('group_'+id)]));
      group.addEventListener('change',()=>nativeWrite(router=>{const x=router.apps.find(a=>a.id===app.id);if(x)x.group=group.value;}));
      const up=settingsButton('↑',()=>nativeMoveApp(app,-1));up.title=L('nativeUp');up.setAttribute('aria-label',L('nativeUp')+' '+app.name);
      const down=settingsButton('↓',()=>nativeMoveApp(app,1));down.title=L('nativeDown');down.setAttribute('aria-label',L('nativeDown')+' '+app.name);
      const edit=settingsButton('✎',()=>{settingsEditingId=app.id;renderNativeSettings();});edit.title=L('nativeEdit');edit.setAttribute('aria-label',L('nativeEdit')+' '+app.name);
      const del=settingsButton('×',()=>{if(!confirm(L('nativeConfirmDelete')))return;nativeWrite(router=>{router.apps=router.apps.filter(x=>x.id!==app.id);});});
      del.title=L('nativeDelete');del.setAttribute('aria-label',L('nativeDelete')+' '+app.name);
      if(app.enabled===false){up.disabled=true;down.disabled=true;}
      controls.prepend(enabled,fav);controls.append(up,down,edit,del);row.append(controls);list.append(row);
    }
  }
  function renderNativeSettings() {
    const panel=workspace?.querySelector('.kb-native-settings');if(!panel||!settingsOpen||!profile)return;
    panel.replaceChildren();
    const heading=settingsNode('div','kb-ns-header');
    const title=settingsNode('div');title.append(settingsNode('h2','',L('nativeSettings')),settingsNode('p','',L('nativeSubtitle')));
    heading.append(title,settingsButton('← '+L('nativeReturn'),()=>leaveNativeSettings(true)));panel.append(heading);
    const notice=settingsNode('div','kb-ns-notice');notice.hidden=true;notice.setAttribute('role','status');panel.append(notice);
    const preferences=settingsNode('div','kb-ns-preferences');
    const themeSelect=nativeSelect(preferences,L('nativeTheme'),profile.theme||'auto', [['auto',L('nativeAutoTheme')],['dark',L('nativeDark')],['light',L('nativeLight')]]);
    themeSelect.addEventListener('change',()=>nativeWrite(router=>{router.theme=themeSelect.value;}));
    const langSelect=nativeSelect(preferences,L('nativeLanguage'),language,[['ru','Русский'],['en','English']]);
    langSelect.addEventListener('change',async()=>{try{await chrome.storage.local.set({[LANGUAGE_KEY]:langSelect.value});}catch(e){nativeNotice(L('nativeError')+': '+e.message,true);}});
    panel.append(preferences);
    const tools=settingsNode('div','kb-ns-toolbar');
    const search=settingsNode('input','kb-ns-search');search.type='search';search.placeholder=L('nativeSearch');search.value=settingsSearch;search.setAttribute('aria-label',L('nativeSearch'));
    search.addEventListener('input',()=>{settingsSearch=search.value;renderNativeSettingsList(panel.querySelector('.kb-ns-list'));});
    tools.append(search,settingsButton('+ '+L('nativeAdd'),()=>{settingsEditingId='__new__';renderNativeSettings();},'kb-ns-primary'));
    tools.append(settingsButton('⚡ '+L('nativeQuick'),()=>{
      if(!confirm(L('nativeConfirmQuick')))return;
      nativeWrite(router=>{
        for(const [presetId,name,port,icon,group] of [
          ['routerforge','RouterForge Core',2233,'▣','routerforge'],['awg-manager','AWG Manager',2222,'🌐','network'],['nfqws-web','nfqws-keenetic-web',90,'🛡','network']]){
          const present=router.apps.find(x=>x.presetId===presetId||x.name.toLocaleLowerCase()===name.toLocaleLowerCase());
          if(present){if(present.presetId===presetId)present.enabled=true;continue;}
          if(router.apps.length>=100)break;
          router.apps.push({id:'preset_'+presetId,presetId,name,url:'http://'+location.hostname+':'+port+'/',icon,group,mode:'auto',favorite:false,enabled:true,layoutWidth:'native'});
        }
      });
    }));panel.append(tools);
    if(settingsEditingId){
      const app=settingsEditingId==='__new__'?null:profile.apps.find(x=>x.id===settingsEditingId);
      if(app||settingsEditingId==='__new__')nativeEditForm(panel,app);
    }
    const list=settingsNode('div','kb-ns-list');panel.append(list);renderNativeSettingsList(list);
    const footer=settingsNode('div','kb-ns-footer');footer.append(settingsButton('⚙ '+L('nativeFull'),()=>chrome.runtime.sendMessage({type:'OPEN_OPTIONS'}).catch(error=>nativeNotice(String(error),true))));panel.append(footer);
  }

  function mount() {
    if (entry || !document.body || !isAuthenticatedShell()) return;
    entry = make('section'); entry.id = 'kbridge-entry'; entry.dataset.kbVersion = BRIDGE_VERSION; entry.setAttribute('aria-label',L('sideLabel'));
    drawer = make('div'); drawer.id = 'kbridge-drawer'; drawer.hidden = true;
    const head = make('div','kbhead'); head.append(make('strong','',L('applications')));
    const configure = make('button','kb-drawer-settings',L('configure')); configure.type='button';
    configure.addEventListener('click',openNativeSettings);
    const close = make('button','kbclose','×'); close.title = L('close'); close.type='button';
    close.addEventListener('click',dismiss); head.append(configure, close);
    drawer.append(head,make('div','kblist'));
    nativeRoute = location.href;
    workspace = make('section'); workspace.id = 'kbridge-workspace'; workspace.dataset.kbVersion = BRIDGE_VERSION; workspace.hidden = true;
    const bar = make('div', 'kbbar');
    const path = make('div','kbpath'); path.append(make('span','kbcrumb',L('applications')),make('span','kbseparator','/'),make('span','kbappicon'),make('strong','kbappname'));
    bar.append(path);
    const status = make('span', 'kb-frame-status');
    status.hidden = true; status.setAttribute('role','status'); status.setAttribute('aria-live','polite');
    bar.append(status);
    const buildTag=make('span','kb-build-tag','v0.10.0');
    buildTag.title='Local test — not an official release';bar.append(buildTag);
    const buttons = make('div', 'kbbuttons');
    const widthButton = make('button', 'kb-width-toggle', '⇥⇤');widthButton.type='button';
    widthButton.addEventListener('click',()=>toggleWorkspaceWidth().catch(console.warn));
    const refresh = make('button', 'kb-refresh', '↻'); refresh.type='button'; refresh.title=L('refresh');
    refresh.setAttribute('aria-label',L('refresh'));
    refresh.addEventListener('click', reloadCurrentFrame);
    const external = make('button', 'kb-external', '↗'); external.type='button'; external.title=L('openTab');
    external.setAttribute('aria-label',L('openTab'));
    external.addEventListener('click', () => { if (currentAppId) openExternal(currentAppId); });
    const exit = make('button','kbclose','×'); exit.type='button'; exit.title=L('back');
    exit.setAttribute('aria-label',L('back')); exit.addEventListener('click', () => { if(settingsOpen) leaveNativeSettings(true); else closeWorkspace(); });
    const fitTrigger=make('button','kb-fit-trigger','⊞');fitTrigger.type='button';fitTrigger.title=L('fit');
    fitTrigger.addEventListener('click',async()=>{
      const panel=workspace.querySelector('.kb-fit-panel');
      if(!panel)return;
      if (panel.hidden && appWidth(currentApp())==='wide') {
        try {await toggleWorkspaceWidth();}
        catch(error){console.warn('RouterForge Portal: cannot switch to native width for calibration',error);return;}
      }
      panel.hidden=!panel.hidden;
      fitTrigger.setAttribute('aria-expanded',String(!panel.hidden));
      updateFitControl();
    });
    buttons.append(widthButton,fitTrigger,refresh,external,exit); bar.append(buttons);
    workspace.append(bar);
    const fitPanel=make('div','kb-fit-panel');fitPanel.hidden=true;
    fitPanel.append(make('strong','kb-fit-heading',L('fit')),make('span','kb-fit-mode',L('fitModeAuto')),make('span','kb-fit-hint',L('fitHint')));
    for(const [field,label] of [['nativeLeftTrimPx','fitLeft'],['nativeRightTrimPx','fitRight']]){
      const row=make('div','kb-fit-row');
      const title=make('span','',L(label));title.dataset.fitLabel=field;
      const dec=make('button','kb-fit-minus','−2');dec.type='button';dec.title='−2 px';
      dec.addEventListener('click',()=>adjustFit(field,-2));
      const amount=make('input','kb-fit-value');amount.type='number';amount.min='0';amount.max='160';amount.step='1';
      amount.value='0';amount.dataset.fitValue=field;amount.setAttribute('aria-label',L(label)+' (px)');
      amount.addEventListener('change',()=>setFitValue(field,amount.value));
      amount.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();amount.blur();}});
      const inc=make('button','kb-fit-plus','+2');inc.type='button';inc.title='+2 px';
      inc.addEventListener('click',()=>adjustFit(field,2));
      row.append(title,dec,amount,inc);fitPanel.append(row);
    }
    const reset=make('button','kb-fit-reset',L('fitReset'));reset.type='button';reset.addEventListener('click',resetFit);fitPanel.append(reset);
    workspace.append(fitPanel);
    const tabs=make('nav','kb-workspace-tabs');tabs.hidden=true;
    tabs.setAttribute('aria-label',L('tabs'));workspace.append(tabs);
    frameStack=make('div','kb-frame-stack');workspace.append(frameStack);
    const nativePanel=make('section','kb-native-settings');nativePanel.hidden=true; nativePanel.setAttribute('aria-label',L('nativeSettings'));workspace.append(nativePanel);
    // Visible only when requested — never reserve a permanent white footer.
    const help = make('div','kbhelp'); help.hidden = true;
    help.append(make('span','',L('help')));
    const switchButton = make('button','',L('separate'));
    switchButton.type = 'button'; switchButton.addEventListener('click',()=>{if(currentAppId)openExternal(currentAppId);});
    help.append(switchButton); workspace.append(help);
    const troubleshooting = make('button','kb-help-trigger','?'); troubleshooting.type='button';
    troubleshooting.title = L('issue');
    troubleshooting.addEventListener('click',()=>{autoHelpVisible=false;help.hidden=!help.hidden;});
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
    listen(window, 'popstate', reconcileNativeRoute);
    listen(window, 'hashchange', reconcileNativeRoute);
    // Firefox and older Chromium do not expose Navigation API. It is optional.
    listen(window.navigation, 'currententrychange', reconcileNativeRoute);
    listen(window, 'pageshow', scheduleAuth);
    listen(window, 'resize', scheduleLayout);
    listen(window.visualViewport, 'resize', scheduleLayout);
    resizeObserver = new ResizeObserver(scheduleLayout);
    listen(window, 'scroll', scheduleLayout, true);
    domObserver = new MutationObserver(records => {
      if (records.some(record => !record.target.closest?.('#kbridge-entry,#kbridge-workspace,#kbridge-drawer'))) {
        reconcileNativeRoute();
        scheduleLayout();
      }
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
    // Profile edits may revoke apps or change URLs; never retain stale iframes.
    for (const [id,item] of [...frames]) {
      const app=profile.apps.find(a=>a.id===id && a.enabled!==false && appMode(a)!=='external');
      if (!app || app.url!==item.url) forgetFrame(id);
    }
    if (currentAppId && !frames.has(currentAppId) && !settingsOpen) closeWorkspace();
    else {showOnlyCurrentFrame();renderWorkspaceTabs();}
    updateTheme();
    updateLanguageText();
    updateWidthControl();
    if (settingsOpen) renderNativeSettings();
    if (currentAppId || settingsOpen) positionWorkspace();
  }
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message?.type === 'BRIDGE_VERSION') {
      respond({ ok: true, version: BRIDGE_VERSION, nativeSettings:settingsOpen, workspaceTabs:[...frames.keys()], maxWorkspaceTabs:MAX_WORKSPACE_FRAMES, origin, active: Boolean(entry && isAuthenticatedShell()), authenticated: isAuthenticatedShell(), embedded: Boolean(workspace && !workspace.hidden), layout: navIsCollapsed ? 'compact' : 'expanded', sidebarWidth: Math.round(pointRect(host)?.width || 0), workspaceLeft: Math.round(pointRect(workspace)?.left || 0) });
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
