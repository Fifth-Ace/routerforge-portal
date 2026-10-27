'use strict';
// Built from RouterForge Portal v0.9.0 source. All app state is stored in Tampermonkey.
(() => {
  const KEY='kbridgeState', LANGUAGE_KEY='rfPortalLanguage';
  const VERSION='0.9.0';
  const BRIDGE_CSS=__BRIDGE_CSS__;
  const ORIGINAL_BRAND=__BRAND_URI__;
  const CATALOG=__CATALOG__;
  const catalogueIndex=new Map(CATALOG.map(p=>[p.id,p]));
  const ui={ru:{title:'RouterForge Portal',subtitle:'Центр приложений Keenetic',connect:'Подключить этот Keenetic',disconnect:'Удалить профиль',router:'Профиль роутера',theme:'Тема',auto:'Авто',dark:'Тёмная',light:'Светлая',language:'Язык',catalog:'Готовые интеграции',custom:'Своё приложение',name:'Название',host:'IP / хост',port:'Порт',scheme:'Протокол',open:'Открытие',within:'Внутри',separate:'Отдельно',enable:'Включить',save:'Сохранить',remove:'Удалить',import:'Импорт JSON',export:'Экспорт JSON',close:'Закрыть',settings:'Настройки',address:'URL приложения',noRouter:'Сначала подключи роутер.',hint:'Пресеты не сканируют сеть. Включение лишь добавляет пункт в меню.',invalid:'Неверный адрес или порт.',saved:'Настройки сохранены.',imported:'Импортировано. Настройки текущего расширения не изменяются.',confirmDelete:'Удалить?',confirmImport:'Заменить настройки Tampermonkey?',ecosystem:'Экосистема RouterForge',source:'Проект на GitHub',community:'Сообщество Telegram',status:'Запуск только после авторизации в Keenetic.',fallback:'Некоторые панели запрещают iframe; используй отдельное открытие.',cancel:'Отмена',newApp:'Добавить приложение',manage:'Управление',updated:'Сохранено',empty:'Пока пусто'},en:{title:'RouterForge Portal',subtitle:'Keenetic application center',connect:'Connect this Keenetic',disconnect:'Remove profile',router:'Router profile',theme:'Theme',auto:'Auto',dark:'Dark',light:'Light',language:'Language',catalog:'Integration catalog',custom:'Custom application',name:'Name',host:'Host / IP',port:'Port',scheme:'Scheme',open:'Open mode',within:'Embedded',separate:'Separate tab',enable:'Enable',save:'Save',remove:'Remove',import:'Import JSON',export:'Export JSON',close:'Close',settings:'Settings',address:'Application URL',noRouter:'Connect your router first.',hint:'No network scans. Enabling only adds a menu entry.',invalid:'Invalid URL or port.',saved:'Settings saved.',imported:'Imported. Native extension data remains unchanged.',confirmDelete:'Remove?',confirmImport:'Replace Tampermonkey settings?',ecosystem:'RouterForge Ecosystem',source:'Project on GitHub',community:'Telegram community',status:'UI starts only after Keenetic login.',fallback:'Some apps block iframe; use separate opening.',cancel:'Cancel',newApp:'Add application',manage:'Manage',updated:'Saved',empty:'No apps yet'}};
  const translations={ru:{'Сеть и VPN':'Сеть и VPN','DNS и защита':'DNS и защита'},en:{'Сеть и VPN':'Network & VPN','DNS и защита':'DNS & Security'}};
  let language=GM_getValue(LANGUAGE_KEY,'ru');
  if(!['ru','en'].includes(language))language='ru';
  const L=(key)=>ui[language]?.[key]||key;
  const fresh=()=>({version:1,routers:{}});
  const JSONclone=(x)=>JSON.parse(JSON.stringify(x));
  const normalizeUrl=(raw)=>{
    if(typeof raw!=='string'||raw.length>2048)throw Error('Invalid URL');
    const u=new URL(raw.trim());
    if(!['http:','https:'].includes(u.protocol)||u.username||u.password||!u.hostname)throw Error('Invalid URL');
    return u.href;
  };
  const originOf=x=>new URL(normalizeUrl(x)).origin;
  const cleanApp=a=>{
    if(!a||typeof a!=='object')throw Error('Invalid app');
    const name=String(a.name||'').trim();if(!name||name.length>70)throw Error('Invalid name');
    const id=/^[a-zA-Z0-9_-]{4,64}$/.test(String(a.id||''))?a.id:'user_'+crypto.randomUUID().replaceAll('-','');
    const app={id,name,url:normalizeUrl(a.url),icon:['▣','⚡','🛡','⚙','🌐','📡','📦','🔧'].includes(a.icon)?a.icon:'▣',mode:['auto','embedded','external'].includes(a.mode)?a.mode:'auto',enabled:a.enabled!==false};
    if(/^[a-z0-9-]{2,35}$/.test(String(a.presetId||'')))app.presetId=a.presetId;
    return app;
  };
  const cleanState=s=>{
    if(!s||s.version!==1||!s.routers||typeof s.routers!=='object'||Array.isArray(s.routers))throw Error('Invalid state');
    const out=fresh();const keys=Object.keys(s.routers);if(keys.length>32)throw Error('Too many routers');
    for(const key of keys){
      if(originOf(key)!==key)throw Error('Invalid router');
      const val=s.routers[key];if(!val||!Array.isArray(val.apps)||val.apps.length>100)throw Error('Invalid apps');
      const apps=val.apps.map(cleanApp),ids=apps.map(a=>a.id),presetIds=apps.filter(a=>a.presetId).map(a=>a.presetId);
      if(new Set(ids).size!==ids.length||new Set(presetIds).size!==presetIds.length)throw Error('Duplicate app');
      out.routers[key]={label:String(val.label||new URL(key).host).slice(0,70),theme:['auto','dark','light'].includes(val.theme)?val.theme:'auto',apps};
    }
    return out;
  };
  let current=fresh();try{current=cleanState(GM_getValue(KEY,fresh()));}catch(e){console.warn('RF Portal: corrupted stored settings',e);}
  let callbacks=[];
  const store={
    get:async keys=>{const out={};const wanted=Array.isArray(keys)?keys:(typeof keys==='string'?[keys]:Object.keys(keys||{}));for(const k of wanted)out[k]=k===KEY?JSONclone(current):k===LANGUAGE_KEY?language:undefined;return out;},
    set:async object=>{for(const [k,v]of Object.entries(object)){
      if(k===KEY){const old=JSONclone(current);current=cleanState(v);GM_setValue(KEY,current);callbacks.forEach(fn=>fn({[KEY]:{oldValue:old,newValue:current}},'local'));}
      if(k===LANGUAGE_KEY){const old=language;language=['ru','en'].includes(v)?v:'ru';GM_setValue(LANGUAGE_KEY,language);callbacks.forEach(fn=>fn({[LANGUAGE_KEY]:{oldValue:old,newValue:language}},'local'));}
    }}
  };
  // Match the tiny runtime interface used by existing WebUI bridge; no privileged browser APIs granted.
  const chrome={storage:{local:store,onChanged:{addListener:fn=>callbacks.push(fn)}},runtime:{onMessage:{addListener:()=>{}},sendMessage:async message=>{
    if(message?.type==='OPEN_OPTIONS'){openSettings();return {ok:true};}
    if(message?.type==='OPEN_APP'){
      const app=current.routers[location.origin]?.apps?.find(a=>a.id===message.id&&a.enabled!==false);
      if(!app)return {ok:false,error:'Unknown app'};
      const url=normalizeUrl(app.url);window.open(url,'_blank','noopener,noreferrer');return {ok:true};
    }
    return {ok:false};
  }}};
  function addStyle(css){const e=document.createElement('style');e.id='rf-portal-userscript-css';e.textContent=css;(document.head||document.documentElement).append(e);}
  addStyle(BRIDGE_CSS);
  // Sidebar rendering, responsive geometry, auth gating, and iframe behavior are reused verbatim.
__BRIDGE_JS__
  let shadowHost=null,shadow=null,chosen=location.origin,notice='';
  const style=`
    :host{all:initial;color-scheme:dark;font:13px/1.5 Inter,'Segoe UI',Arial,sans-serif;--bg:#0c0d10;--panel:#14161a;--field:#191b21;--border:#242831;--accent:#38bdf8;--txt:#f5f7fa;--muted:#a0a6af}
    *{box-sizing:border-box}#overlay{position:fixed;inset:0;z-index:2147483646;display:grid;place-items:center;padding:20px;background:#070a11c9;color:var(--txt);font-family:Inter,'Segoe UI',Arial,sans-serif}
    #shell{width:min(1080px,95vw);max-height:94vh;overflow:auto;background:var(--bg);border:1px solid #384353;border-radius:12px;box-shadow:0 20px 90px #000b}
    header{display:flex;gap:12px;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--bg);z-index:3}
    header .mark{width:35px;height:35px;object-fit:contain}header strong{font-size:18px;letter-spacing:.1px}header small{display:block;font-size:11px;color:var(--muted)}header button{width:34px;height:34px}
    main{padding:20px 22px 26px;display:grid;gap:16px;grid-template-columns:280px minmax(0,1fr)}aside,section{min-width:0}aside{display:flex;flex-direction:column;gap:14px}.panel{border:1px solid var(--border);background:var(--panel);border-radius:8px;padding:16px}h2{font-size:15px;margin:0 0 12px;color:var(--txt)}h3{font-size:13px;margin:0;color:var(--txt)}.kicker{font-size:10px;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px}
    label{display:grid;gap:5px;margin-bottom:9px;color:var(--muted);font-size:11px}input,select{background:var(--field);border:1px solid #343a45;border-radius:5px;padding:0 10px;height:38px;color:var(--txt);font:inherit;width:100%;min-width:0}input:focus,select:focus{outline:1px solid var(--accent)}input[type=checkbox]{width:17px;height:17px;accent-color:var(--accent);cursor:pointer}
    button,.button{padding:8px 12px;border-radius:5px;border:1px solid #343a45;background:#20242b;color:var(--txt);font:inherit;font-size:12px;cursor:pointer;text-align:center}button:hover,.button:hover{border-color:var(--accent)}.primary{color:#07111a;background:var(--accent);border-color:var(--accent);font-weight:650}.danger{color:#ff8888}.link{display:inline-flex;align-items:center;gap:5px;text-decoration:none;color:var(--accent);font-size:12px;margin-right:12px}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.hint{color:var(--muted);font-size:11px;margin:8px 0 10px}.stack{display:flex;flex-direction:column;gap:16px}
    .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.card{background:#0e1014;border:1px solid #2a2e38;border-radius:7px;padding:13px}.card.on{border-color:#207fa1}.cardHead{display:flex;gap:9px;align-items:center;justify-content:space-between;margin-bottom:10px}.cardHead h3{flex:1}.card .four{display:grid;grid-template-columns:1.5fr .65fr 1fr 1fr;gap:8px}.card .four label{font-size:10px}.card .four input,.card .four select{height:34px;font-size:12px;padding:0 6px}.card footer{display:flex;justify-content:end}.appRow{display:flex;align-items:center;gap:8px;justify-content:space-between;padding:9px;border:1px solid #262b35;margin-bottom:7px;border-radius:6px}.appRow span{min-width:0;overflow-wrap:anywhere}.appRow small{color:var(--muted);display:block;word-break:break-all}
    .message{padding:8px 12px;background:#0c271c;border:1px solid #25593b;border-radius:6px;color:#a7e6ba;margin:12px 22px 0}.no{background:#31151a;border-color:#8d3742;color:#ffb6bc}
    .editor{display:grid;grid-template-columns:1fr 2fr 1fr;gap:8px}.editor label:last-of-type{grid-column:1/-1}.full{grid-column:1/-1}
    @media(max-width:900px){main{grid-template-columns:1fr}.grid{grid-template-columns:1fr}.card .four{grid-template-columns:1fr 1fr}}
  `;
  function node(tag,cls,content){const e=document.createElement(tag);if(cls)e.className=cls;if(content!==undefined)e.textContent=content;return e;}
  function chooseLink(href,label){const a=node('a','link',label);a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a;}
  function field(parent,label,value,type='text',options){const wrap=node('label');wrap.append(node('span','',label));const input=node(type==='select'?'select':'input');if(type==='select'){for(const [v,text]of options){const o=node('option','',text);o.value=v;input.append(o);}input.value=value;}else{input.type=type;input.value=value;}wrap.append(input);parent.append(wrap);return input;}
  function saveNotice(text,error=false){notice=text;if(shadow){const e=shadow.querySelector('#message');if(e){e.textContent=text;e.className='message'+(error?' no':'');e.hidden=false;}}}
  function downloadConfig(){const blob=new Blob([JSON.stringify(current,null,2)],{type:'application/json'});const a=node('a');a.href=URL.createObjectURL(blob);a.download='routerforge-portal-config.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
  function changeState(next,msg){return store.set({[KEY]:next}).then(()=>{saveNotice(msg||L('saved'));renderSettings();});}
  function validHost(str){if(!str||/[\\/@?#\s]/.test(str)||str.includes('@'))throw Error('Invalid host');const u=new URL('http://'+str+'/');if(u.hostname.toLowerCase()!==str.toLowerCase())throw Error('Invalid host');return u.hostname;}
  function makePresetUrl(host,port,scheme){if(!/^\d{1,5}$/.test(String(port))||+port<1||+port>65535)throw Error('Invalid port');return normalizeUrl(scheme+'//'+validHost(host)+':'+port+'/');}
  function openSettings(){if(shadowHost?.isConnected){shadowHost.remove();shadowHost=null;shadow=null;return;}if(!document.body)return;
    shadowHost=node('div');shadowHost.id='rf-portal-userscript-settings-host';shadowHost.style.cssText='position:fixed;inset:0;z-index:2147483646';shadow=shadowHost.attachShadow({mode:'closed'});const css=node('style');css.textContent=style;shadow.append(css,node('div'));document.body.append(shadowHost);renderSettings();}
  function renderSettings(){if(!shadow)return;const root=shadow.querySelector('div');root.replaceChildren();root.id='overlay';root.addEventListener('click',e=>{if(e.target===root){shadowHost?.remove();shadowHost=null;shadow=null;}});
    const shell=node('div');shell.id='shell';root.append(shell);
    const header=node('header');const logo=node('img','mark');logo.src=ORIGINAL_BRAND;logo.alt='';const b=node('div');b.append(node('strong','','RouterForge Portal'),node('small','',L('subtitle')+' · Userscript v'+VERSION));const left=node('div');left.style.cssText='display:flex;gap:10px;align-items:center';left.append(logo,b);const close=node('button','', '×');close.title=L('close');close.addEventListener('click',()=>{shadowHost?.remove();shadowHost=null;shadow=null;});header.append(left,close);shell.append(header);
    const status=node('div','message',notice);status.id='message';status.hidden=!notice;shell.append(status);
    const main=node('main');shell.append(main);
    const sidebar=node('aside');const body=node('div','stack');main.append(sidebar,body);
    const profBox=node('section','panel');profBox.append(node('div','kicker','Keenetic / Router'),node('h2','',L('router')));sidebar.append(profBox);
    const select=field(profBox,L('router'),chosen,'select',Object.entries(current.routers).map(([k,v])=>[k,v.label+' — '+k]));select.disabled=!Object.keys(current.routers).length;
    if(!current.routers[chosen])chosen=Object.keys(current.routers)[0]||location.origin;select.value=chosen;
    select.onchange=()=>{chosen=select.value;renderSettings();};
    const profile=current.routers[chosen],actions=node('div','actions');profBox.append(actions);
    const connect=node('button','primary',L('connect'));connect.onclick=async()=>{try{const s=JSONclone(current);const key=location.origin;if(!s.routers[key])s.routers[key]={label:new URL(key).host,apps:[],theme:'auto'};chosen=key;await changeState(s);}catch(e){saveNotice(e.message,true);}};actions.append(connect);
    if(profile){const del=node('button','danger',L('disconnect'));del.onclick=async()=>{if(!confirm(L('confirmDelete')))return;const s=JSONclone(current);delete s.routers[chosen];chosen=location.origin;await changeState(s);};actions.append(del);}
    const config=node('section','panel');config.append(node('div','kicker','Preferences'),node('h2','',L('settings')));sidebar.append(config);
    const languageSelect=field(config,L('language'),language,'select',[['ru','Русский'],['en','English']]);languageSelect.onchange=async()=>{await store.set({[LANGUAGE_KEY]:languageSelect.value});renderSettings();};
    const themeSelect=field(config,L('theme'),profile?.theme||'auto','select',[['auto',L('auto')],['dark',L('dark')],['light',L('light')]]);themeSelect.disabled=!profile;themeSelect.onchange=async()=>{const s=JSONclone(current);s.routers[chosen].theme=themeSelect.value;await changeState(s);};
    const backups=node('section','panel');backups.append(node('div','kicker','Configuration'),node('h2','','JSON / Backup'));const backActions=node('div','actions');backups.append(backActions);sidebar.append(backups);
    const exportBtn=node('button','',L('export'));exportBtn.onclick=downloadConfig;backActions.append(exportBtn);
    const importBtn=node('button','',L('import'));importBtn.onclick=()=>input.click();backActions.append(importBtn);
    const input=node('input');input.type='file';input.accept='.json,application/json';input.style.display='none';input.onchange=async()=>{try{const file=input.files?.[0];input.value='';if(!file)return;if(file.size>200000)throw Error('File too large');const parsed=cleanState(JSON.parse(await file.text()));if(!confirm(L('confirmImport')))return;chosen=location.origin;await changeState(parsed,L('imported'));}catch(e){saveNotice(e.message,true);}};backups.append(input);
    const eco=node('section','panel');eco.append(node('div','kicker',L('ecosystem')));eco.append(chooseLink('https://github.com/Fifth-Ace/routerforge',L('source')),node('div'));eco.append(chooseLink('https://t.me/RouterForge',L('community')));eco.append(node('p','hint',L('status')));sidebar.append(eco);
    const my=node('section','panel');my.append(node('div','kicker','Application Registry'),node('h2','',L('custom')));body.append(my);
    if(!profile)my.append(node('p','hint',L('noRouter')));
    else for(const a of profile.apps.filter(x=>x.enabled!==false)){const r=node('div','appRow');const detail=node('span','');detail.append(node('b','',a.icon+' '+a.name),node('small','',a.url+' · '+a.mode));const d=node('button','danger','×');d.title=L('remove');d.onclick=async()=>{if(!confirm(L('confirmDelete')))return;const s=JSONclone(current);const item=s.routers[chosen].apps.find(x=>x.id===a.id);if(item?.presetId&&catalogueIndex.has(item.presetId))item.enabled=false;else s.routers[chosen].apps=s.routers[chosen].apps.filter(x=>x.id!==a.id);await changeState(s);};r.append(detail,d);my.append(r);}
    const catalog=node('section','panel');catalog.append(node('div','kicker','Keenetic / Entware'),node('h2','',L('catalog')),node('p','hint',L('hint')));body.append(catalog);
    if(profile){const grid=node('div','grid');catalog.append(grid);for(const preset of CATALOG){const old=profile.apps.find(a=>a.presetId===preset.id);const url=new URL(old?.url||('http://'+new URL(chosen).hostname+':'+preset.port+'/'));const card=node('div','card'+(old&&old.enabled!==false?' on':''));const top=node('div','cardHead');top.append(node('span','',preset.icon),node('h3','',preset.name));const check=node('input');check.type='checkbox';check.checked=Boolean(old&&old.enabled!==false);check.setAttribute('aria-label',L('enable')+' '+preset.name);top.append(check);card.append(top);const fields=node('div','four');card.append(fields);
      const host=field(fields,L('host'),url.hostname);const port=field(fields,L('port'),url.port||String(preset.port));const scheme=field(fields,L('scheme'),url.protocol,'select',[['http:','HTTP'],['https:','HTTPS']]);const mode=field(fields,L('open'),old?.mode||'auto','select',[['auto',L('auto')],['embedded',L('within')],['external',L('separate')]]);
      const save=async enabled=>{try{const newUrl=makePresetUrl(host.value.trim(),port.value.trim(),scheme.value);const s=JSONclone(current),apps=s.routers[chosen].apps;const next=cleanApp({id:old?.id||'preset_'+preset.id,presetId:preset.id,name:preset.name,icon:preset.icon,enabled,mode:mode.value,url:newUrl});const idx=apps.findIndex(a=>a.presetId===preset.id);if(idx>=0)apps[idx]=next;else apps.push(next);await changeState(s);}catch(e){saveNotice(L('invalid')+' '+e.message,true);}};
      check.onchange=()=>save(check.checked);const foot=node('footer');const btn=node('button','',L('save'));btn.onclick=()=>save(check.checked);foot.append(btn);card.append(foot);grid.append(card);}}
    const edit=node('section','panel');edit.append(node('div','kicker','Custom App'),node('h2','',L('newApp')));body.append(edit);
    if(profile){const form=node('form','editor');const name=field(form,L('name'),'');const url=field(form,L('address'),'http://'+new URL(chosen).hostname+':8080/');url.parentElement.classList.add('full');const mode=field(form,L('open'),'auto','select',[['auto',L('auto')],['embedded',L('within')],['external',L('separate')]]);const btn=node('button','primary full',L('save'));btn.type='submit';form.append(btn);form.onsubmit=async ev=>{ev.preventDefault();try{const s=JSONclone(current);if(s.routers[chosen].apps.length>=100)throw Error('Too many apps');s.routers[chosen].apps.push(cleanApp({name:name.value,url:url.value,mode:mode.value,icon:'▣'}));await changeState(s);}catch(e){saveNotice(L('invalid')+' '+e.message,true);}};edit.append(form);}
  }
  if(typeof GM_registerMenuCommand==='function') GM_registerMenuCommand('RouterForge Portal · Settings / Настройки',openSettings);
  // Tampermonkey storage is separate from Chrome/Edge extension storage: use explicit JSON import/export.
})();
