// Encrypted at rest. Master secret and AES key exist only in this extension-page module.
// No background IPC for decrypting secrets, no cloud sync, no plaintext profile export.
export const VAULT_KEY='rfPortal2VaultEncrypted';
const enc=new TextEncoder(),dec=new TextDecoder();
const bytes=n=>crypto.getRandomValues(new Uint8Array(n));
const b64=a=>btoa(String.fromCharCode(...new Uint8Array(a)));
const from64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const aad=(appId,origin,path)=>enc.encode(JSON.stringify([1,appId,origin,path]));
const ITERATIONS=600000;
async function derive(password,salt,iterations=ITERATIONS){
  if(typeof password!=='string'||password.length<12)throw Error('MASTER_PASSWORD_TOO_SHORT');
  const raw=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations,hash:'SHA-256'},raw,
    {name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function seal(key,value,aadBytes){
  const iv=bytes(12);const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aadBytes},key,enc.encode(value));
  return {iv:b64(iv),data:b64(ciphertext)};
}
async function open(key,item,aadBytes){
  const content=await crypto.subtle.decrypt({name:'AES-GCM',iv:from64(item.iv),additionalData:aadBytes},key,from64(item.data));
  return dec.decode(content);
}
const checksum=enc.encode('rf-portal2-vault-verifier-1');
export class PortalVault{
  constructor(storage=chrome.storage.local){this.storage=storage;this.key=null;this.lastUsed=0;this.ttl=10*60*1000;}
  get unlocked(){return !!this.key && Date.now()-this.lastUsed<this.ttl;}
  lock(){this.key=null;this.lastUsed=0;}
  touch(){if(!this.unlocked){this.lock();throw Error('VAULT_LOCKED');}this.lastUsed=Date.now();return this.key;}
  async data(){const v=(await this.storage.get(VAULT_KEY))[VAULT_KEY];return v||null;}
  async create(password){
    if(await this.data())throw Error('VAULT_EXISTS');
    const salt=bytes(16),key=await derive(password,salt);
    const verify=await seal(key,'rf-portal2-vault-ok',checksum);
    await this.storage.set({[VAULT_KEY]:{version:1,kdf:'PBKDF2-SHA256',iterations:ITERATIONS,salt:b64(salt),verify,entries:{}}});
    this.key=key;this.lastUsed=Date.now();
  }
  async unlock(password){
    const v=await this.data();if(!v||v.version!==1||v.kdf!=='PBKDF2-SHA256'||
      !Number.isInteger(v.iterations)||v.iterations<600000||v.iterations>2000000)throw Error('VAULT_FORMAT_INVALID');
    const key=await derive(password,from64(v.salt),v.iterations);
    try{if(await open(key,v.verify,checksum)!=='rf-portal2-vault-ok')throw Error('BAD_PASSWORD');}
    catch{this.lock();throw Error('BAD_PASSWORD');}
    this.key=key;this.lastUsed=Date.now();
  }
  async set(appId,url,value){
    const key=this.touch(),u=new URL(url);if(u.protocol!=='https:')throw Error('VAULT_REQUIRES_HTTPS');
    if(!/^[a-zA-Z0-9_-]{4,80}$/.test(appId))throw Error('APP_ID_INVALID');
    if(typeof value!=='string'||!value||value.length>8192)throw Error('SECRET_INVALID');
    const v=await this.data();if(!v||v.version!==1)throw Error('VAULT_FORMAT_INVALID');
    const path=u.pathname,entry=await seal(key,value,aad(appId,u.origin,path));
    v.entries[appId]={...entry,origin:u.origin,path,appId};
    await this.storage.set({[VAULT_KEY]:v});this.lastUsed=Date.now();
  }
  async get(appId,url){
    const key=this.touch(),v=await this.data(),entry=v?.entries?.[appId];
    if(!entry)throw Error('SECRET_NOT_FOUND');
    const u=new URL(url);
    if(u.protocol!=='https:'||u.origin!==entry.origin||!(u.pathname===entry.path||u.pathname.startsWith(entry.path.endsWith('/')?entry.path:entry.path+'/')))throw Error('ORIGIN_OR_PATH_MISMATCH');
    const plaintext=await open(key,entry,aad(appId,entry.origin,entry.path));
    this.lastUsed=Date.now();return plaintext;
  }
  async remove(appId){this.touch();const v=await this.data();if(v?.entries){delete v.entries[appId];await this.storage.set({[VAULT_KEY]:v});}}
  async dropEncrypted(ids){
    // Deletion of encrypted blobs needs no unlock and cannot expose their plaintext.
    const v=await this.data();if(!v?.entries)return;
    for(const id of ids)delete v.entries[id];
    await this.storage.set({[VAULT_KEY]:v});
  }
  async exportEncrypted(){this.touch();return JSON.stringify(await this.data(),null,2);}
  async importEncrypted(raw){
    this.lock();const v=JSON.parse(raw);
    if(v?.version!==1||v.kdf!=='PBKDF2-SHA256'||!v.verify||!v.salt||!v.entries||Object.keys(v.entries).length>500)throw Error('INVALID_VAULT_EXPORT');
    await this.storage.set({[VAULT_KEY]:v});
  }
  async changePassword(oldPassword,newPassword){
    await this.unlock(oldPassword);const old=await this.data();const plains=[];
    for(const [id,e] of Object.entries(old.entries))plains.push({id,url:e.origin+e.path,secret:await this.get(id,e.origin+e.path)});
    // Single storage write: old encrypted state stays intact on failure.
    const salt=bytes(16),key=await derive(newPassword,salt),verify=await seal(key,'rf-portal2-vault-ok',checksum);
    const next={version:1,kdf:'PBKDF2-SHA256',iterations:ITERATIONS,salt:b64(salt),verify,entries:{}};
    for(const e of plains){const u=new URL(e.url);next.entries[e.id]={...(await seal(key,e.secret,aad(e.id,u.origin,u.pathname))),origin:u.origin,path:u.pathname,appId:e.id};}
    await this.storage.set({[VAULT_KEY]:next});this.key=key;this.lastUsed=Date.now();
    for(const p of plains)p.secret='';
  }
}
