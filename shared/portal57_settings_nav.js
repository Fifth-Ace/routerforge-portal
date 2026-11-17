// RouterForge Portal R5.8 unified settings navigation; no secondary standalone center.
import {readLanguage} from './i18n.js';
const apps=document.getElementById('rf57-app-settings');
const servers=document.getElementById('rf57-server-settings');
const frame=document.getElementById('rf57-server-frame');
const appTab=document.getElementById('rf57-tab-apps');
const serverTab=document.getElementById('rf57-tab-servers');
const message=document.getElementById('rf57-global-backup-state');
const params=new URLSearchParams(location.search);
const initialView=['servers','apps','settings'].includes(params.get('serverView'))?params.get('serverView'):'servers';
const target=new URL(chrome.runtime.getURL('portal-center.html?embedded=1'));
target.searchParams.set('view',initialView);
if(params.get('server')&&/^[a-zA-Z0-9_-]{4,80}$/.test(params.get('server')))target.searchParams.set('server',params.get('server'));
let active='apps';let observer=null;
frame.src=target.href;
function frameHeight(){
 try{
  const doc=frame.contentDocument;
  if(!doc)return;
  const height=Math.max(380,Math.ceil(Math.max(doc.documentElement.scrollHeight,doc.body?.scrollHeight||0))+8);
  frame.style.height=Math.min(height,20000)+'px';
 }catch{frame.style.height='850px';}
}
frame.addEventListener('load',()=>{
 try{
  observer?.disconnect();const doc=frame.contentDocument;
  if(doc&&typeof ResizeObserver!=='undefined'){
   observer=new ResizeObserver(frameHeight);
   observer.observe(doc.documentElement);
   if(doc.body)observer.observe(doc.body);
  }
 }catch{}
 frameHeight();
});
window.addEventListener('resize',frameHeight);
function select(view){
 active=view==='servers'?'servers':'apps';apps.hidden=active!=='apps';servers.hidden=active!=='servers';
 appTab.setAttribute('aria-current',active==='apps'?'page':'false');serverTab.setAttribute('aria-current',active==='servers'?'page':'false');
 if(active==='servers')frameHeight();
}
appTab.addEventListener('click',()=>select('apps'));
serverTab.addEventListener('click',()=>select('servers'));
function backup(action){
 select('servers');
 const id=action==='export'?'export-profiles':'import-profiles';
 const button=frame.contentDocument?.getElementById(id);
 if(!button)throw Error('Серверные настройки ещё загружаются. Повтори действие после загрузки.');
 // File picker activation is propagated synchronously from the user's click.
 button.click();
}
for(const [id,action] of [['rf57-export-all','export'],['rf57-import-all','import']]){
 document.getElementById(id).addEventListener('click',()=>{try{backup(action)}catch(e){message.textContent=e.message;message.hidden=false;}});
}
async function translate(){
 const en=(await readLanguage())==='en';
 appTab.textContent=en?'Applications & Keenetic':'Приложения и Keenetic';serverTab.textContent=en?'Servers & monitoring':'Серверы и мониторинг';
 document.getElementById('rf57-export-all').textContent=en?'↓ Full encrypted backup':'↓ Полный защищённый бэкап';
 document.getElementById('rf57-import-all').textContent=en?'↑ Restore full backup':'↑ Восстановить бэкап';
}
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.rfPortalLanguage)translate().catch(()=>{});});
select(params.get('tab')==='servers'?'servers':'apps');
translate().catch(()=>{});
