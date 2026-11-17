// R5.4 encrypted one-file backup: profiles/full URLs + encrypted Vault, never plain tokens.
import {cleanRegistry,attachStandalonePanels} from './portal2_registry.js';
import {validateWorkspace} from './portal57_unified.js';
const enc=new TextEncoder(),dec=new TextDecoder();
const AAD=enc.encode('RouterForge-Portal/secure-backup/v1');
const ITER=600000;
const PERIODS=[1,2,5,10,15,30,60];
const b64=x=>{const a=new Uint8Array(x);let s='';for(let i=0;i<a.length;i+=8192)s+=String.fromCharCode(...a.subarray(i,i+8192));return btoa(s);};
const un64=x=>Uint8Array.from(atob(x),c=>c.charCodeAt(0));
const random=n=>crypto.getRandomValues(new Uint8Array(n));
function secretShape(v){
 if(v===null)return null;
 if(!v||typeof v!=='object'||Array.isArray(v)||v.version!==1||v.kdf!=='PBKDF2-SHA256'||!Number.isInteger(v.iterations)||v.iterations<600000||v.iterations>2000000||typeof v.salt!=='string'||!/^[\w+/=]{20,40}$/.test(v.salt)||!v.verify||typeof v.verify.iv!=='string'||typeof v.verify.data!=='string'||!v.entries||typeof v.entries!=='object'||Array.isArray(v.entries)||Object.keys(v.entries).length>500)throw Error('BACKUP_VAULT_INVALID');
 for(const [id,e] of Object.entries(v.entries)){
  if(!/^[a-zA-Z0-9_-]{4,80}$/.test(id)||!e||e.appId!==id||typeof e.origin!=='string'||typeof e.path!=='string'||typeof e.iv!=='string'||typeof e.data!=='string'||e.data.length>50000||e.iv.length>80)throw Error('BACKUP_VAULT_INVALID');
  const u=new URL(e.origin);if(u.protocol!=='https:'||u.origin!==e.origin||!e.path.startsWith('/')||e.path.startsWith('//')||e.path.includes('\\'))throw Error('BACKUP_VAULT_INVALID');
 }
 return v;
}
function checkedBody(p){
 if(!p||p.format!=='RouterForge-Portal-secure-backup'||p.version!==1||!p.registry||!Object.prototype.hasOwnProperty.call(p,'vault'))throw Error('BACKUP_BODY_INVALID');
 const linked=attachStandalonePanels(cleanRegistry(p.registry));
 const raw=secretShape(p.vault);
 const period=p.settings?.period; if(period!==undefined&&!PERIODS.includes(period))throw Error('BACKUP_PERIOD_INVALID');
 const workspace=p.settings?.workspace===undefined?null:validateWorkspace(p.settings.workspace,linked.registry);
 return {registry:linked.registry,vault:raw,settings:{period:period||1,...(workspace?{workspace}:{})}};
}
function passwordOK(password){if(typeof password!=='string'||password.length<12)throw Error('BACKUP_PASSWORD_TOO_SHORT');}
async function keyFor(pass,salt,iterations){
 const imported=await crypto.subtle.importKey('raw',enc.encode(pass),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations,hash:'SHA-256'},imported,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function secureBackup(registry,vault,pass,settings={}){
 passwordOK(pass);const body=checkedBody({format:'RouterForge-Portal-secure-backup',version:1,registry,vault,settings});
 const salt=random(16),iv=random(12),key=await keyFor(pass,salt,ITER);
 const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:AAD},key,enc.encode(JSON.stringify({format:'RouterForge-Portal-secure-backup',version:1,...body})));
 return JSON.stringify({format:'RouterForge-Portal-encrypted',version:1,kdf:'PBKDF2-SHA256',iterations:ITER,cipher:'AES-256-GCM',salt:b64(salt),iv:b64(iv),data:b64(cipher)},null,2);
}
export function isSecureBackup(p){return p?.format==='RouterForge-Portal-encrypted';}
export async function openBackup(raw,pass){
 passwordOK(pass);const p=typeof raw==='string'?JSON.parse(raw):raw;
 if(!isSecureBackup(p)||p.version!==1||p.kdf!=='PBKDF2-SHA256'||p.cipher!=='AES-256-GCM'||p.iterations!==ITER||typeof p.salt!=='string'||typeof p.iv!=='string'||typeof p.data!=='string'||p.data.length>1500000)throw Error('BACKUP_ENVELOPE_INVALID');
 let body;try{
  const salt=un64(p.salt),iv=un64(p.iv);if(salt.length!==16||iv.length!==12)throw Error('BAD_SIZE');
  const key=await keyFor(pass,salt,p.iterations);const raw=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:AAD},key,un64(p.data));body=JSON.parse(dec.decode(raw));
 }catch{throw Error('BACKUP_PASSWORD_OR_INTEGRITY_FAILED');}
 return checkedBody(body);
}
