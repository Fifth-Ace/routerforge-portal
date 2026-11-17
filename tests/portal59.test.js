import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = (p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('R5.9 long app names and URLs never collapse into vertical one-character columns',()=>{
 const css=read('ui.css');
 assert.match(css,/container-name:rf59-apps/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\) max-content/);
 assert.match(css,/@container rf59-apps \(max-width:890px\)/);
 assert.match(css,/\.entry \.actions\{justify-content:flex-start\}/);
});
test('R5.9 Keenetic sidebar + drawer show server links and native detail view',()=>{
 const bridge=read('content/bridge.js');
 for(const piece of ['function rf59AppendServerMenu(', 'rf59AppendServerMenu(list);', 'rf59AppendServerMenu(list,true);','function rf57NativeServers(panel)',"rf57SettingsTab='servers'",'rf59SelectedServer'])assert.ok(bridge.includes(piece),piece);
 assert.match(bridge,/const shown=rf59SelectedServer\?servers.filter/);
 assert.match(bridge,/chrome\.storage\.local\.get\('rfPortal2Registry'\)/);
 assert.doesNotMatch(bridge,/window\.postMessage\([\s\S]*rf59AppendServerMenu/);
});
test('R5.9 RU/EN options localization and server warning strings exist',()=>{
 const options=read('options.js');
 const center=read('portal-center.js');
 assert.match(options,/rf59ApplyOptionsLocale\(\)/);
 assert.match(center,/rf59ApplyCenterLocale\(\)/);
 assert.match(center,/rf59HumanStatus\(message\)/);
 assert.match(center,/SITE_PERMISSION_DENIED/);
 assert.match(center,/chrome\.storage\.local\.set\(\{rfPortalLanguage:locale\}\)/);
});
test('R5.9 does not change encrypted backup or master-password derivation',()=>{
 const center=read('portal-center.js');
 assert.match(center,/secureBackup\(registry,raw,pass,\{period:pollPeriod,workspace\}\)/);
 assert.match(center,/Vault разблокирован/);
 const bridge=read('content/bridge.js');
 assert.doesNotMatch(bridge,/rf59AppendServerMenu[\s\S]{0,400}chrome\.tabs\.create\(\{url:server/);
});

test('R5.9 native menu uses server names only and opens existing Keenetic view without network or secrets',async()=>{
 const src=read('content/bridge.js');
 const start=src.indexOf('  function rf59AppendServerMenu(');
 const end=src.indexOf('  // Refresh only extension-owned menu',start);
 assert.ok(start>=0&&end>start);
 const code=src.slice(start,end);
 let opened=0,rendered=0,hidden=0,reads=0;
 const saved={servers:[{id:'11111111-2222-4333-8444-555555555555',name:'mail.example.test',token:'PRIVATE_DO_NOT_RENDER',url:'https://private.example/secret'}],apps:[]};
 const fake=()=>({children:[],dataset:{},isConnected:true,append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},addEventListener(t,fn){if(t==='click')this.click=fn;},setAttribute(k,v){this[k]=v;}});
 const make=(tag,cl,txt)=>{const el=fake();el.tag=tag;el.className=cl;el.textContent=txt||'';return el;};
 const chrome={storage:{local:{get:async key=>{assert.equal(key,'rfPortal2Registry');reads++;return {rfPortal2Registry:saved};}}}};
 const runner=new Function('chrome','make','entry','profile','language','openNativeSettings','renderNativeSettings','dismiss',
  "let settingsOpen=false,rf57SettingsTab='apps',rf59SelectedServer='';\n"+code+"\nreturn {append:rf59AppendServerMenu,selected:()=>rf59SelectedServer,tab:()=>rf57SettingsTab};");
 const app=runner(chrome,make,{}, {},'ru',()=>opened++,()=>rendered++,()=>hidden++);
 const list=fake();app.append(list);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(reads,1);
 assert.equal(list.children[0].textContent,'СЕРВЕРЫ');
 const bucket=list.children[1];assert.equal(bucket.children.length,1);
 const btn=bucket.children[0];assert.equal(btn.dataset.rf59Server,saved.servers[0].id);
 assert.equal(btn.children[1].textContent,'mail.example.test');
 assert.ok(!JSON.stringify(list).includes('PRIVATE_DO_NOT_RENDER'));
 btn.click({preventDefault(){},stopPropagation(){}});
 assert.equal(app.selected(),saved.servers[0].id);
 assert.equal(app.tab(),'servers');assert.equal(opened,1);assert.equal(rendered,1);assert.equal(hidden,1);
});
