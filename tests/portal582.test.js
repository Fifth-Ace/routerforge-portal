import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../portal-center.js',import.meta.url),'utf8');
const start=src.indexOf(" $('unlock-vault').onclick=");
const end=src.indexOf("\n $('lock-vault').onclick=",start);
assert.ok(start>=0&&end>start,'Vault click handler found');
const clickCode=src.slice(start,end);
const wire=new Function('$','vault','refreshTokenFlags','resumeEnabledMonitors','updateVault','render','status','showError',clickCode);
const sleep=()=>new Promise(resolve=>setTimeout(resolve,0));
function fixture({authError=null,monitorError=null,refreshError=null,restored=0}={}){
 let unlocked=false;
 const master={value:'correct-password-for-test'};
 const statuses=[],errors=[],events=[];
 const vault={
  data:async()=>({version:1}),
  unlock:async pass=>{events.push('auth');if(authError)throw Error(authError);assert.equal(pass,'correct-password-for-test');unlocked=true;},
  lock:()=>{unlocked=false;events.push('lock');},
  get unlocked(){return unlocked;}
 };
 const unlockButton={onclick:null};
 const $=id=>id==='master'?master:id==='unlock-vault'?unlockButton:undefined;
 const refreshTokenFlags=async()=>{events.push('flags');if(refreshError)throw Error(refreshError);};
 const resumeEnabledMonitors=async()=>{events.push('resume');if(monitorError)throw Error(monitorError);return restored;};
 const updateVault=()=>events.push('update:'+unlocked);
 const render=()=>events.push('render');
 const status=(msg,bad=false)=>statuses.push([msg,bad]);
 const showError=e=>errors.push(e.message);
 wire($,vault,refreshTokenFlags,resumeEnabledMonitors,updateVault,render,status,showError);
 return {vault,master,statuses,errors,events,unlockButton};
}
test('R5.8.2 Vault stays unlocked if 3x-ui resume fails after correct password',async()=>{
 const f=fixture({monitorError:'TOKEN_REJECTED'});
 f.unlockButton.onclick();await sleep();
 assert.equal(f.vault.unlocked,true);
 assert.equal(f.master.value,'');
 assert.deepEqual(f.errors,[]);
 assert.ok(f.statuses.some(([msg])=>msg.startsWith('Vault разблокирован.')));
 assert.ok(f.statuses.some(([msg,bad])=>bad&&msg.includes('VAULT_UNLOCKED_MONITOR_RESUME_FAILED: TOKEN_REJECTED')));
 assert.ok(f.events.indexOf('update:true')>f.events.indexOf('auth'));
 assert.ok(f.events.indexOf('update:true')<f.events.indexOf('resume'));
});
test('R5.8.2 UI status refresh fails separately without claiming bad password',async()=>{
 const f=fixture({refreshError:'UI_DENIED'});f.unlockButton.onclick();await sleep();
 assert.equal(f.vault.unlocked,true);assert.deepEqual(f.errors,[]);
 assert.ok(f.statuses.some(([msg,bad])=>bad&&msg.includes('VAULT_UNLOCKED_UI_REFRESH_FAILED: UI_DENIED')));
 assert.ok(!f.events.includes('resume'));
});
test('R5.8.2 real wrong password remains a genuine Vault failure',async()=>{
 const f=fixture({authError:'BAD_PASSWORD'});f.unlockButton.onclick();await sleep();
 assert.equal(f.vault.unlocked,false);assert.deepEqual(f.errors,['BAD_PASSWORD']);
 assert.ok(!f.events.includes('resume'));
 assert.deepEqual(f.statuses,[]);
});
test('R5.8.2 successful resume keeps canonical unlocked state',async()=>{
 const f=fixture({restored:1});f.unlockButton.onclick();await sleep();
 assert.equal(f.vault.unlocked,true);assert.deepEqual(f.errors,[]);
 assert.ok(f.statuses.some(([msg])=>msg.includes('возобновлено серверов: 1')));
});
