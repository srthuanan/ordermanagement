const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=fs.readFileSync('dms-radar-extension/ndp-session.js','utf8');
const key='ndp-fe-storage';
const token=exp=>'header.'+Buffer.from(JSON.stringify({username:'0925821888',permissions:['capability:vhkd_01'],exp})).toString('base64url')+'.signature';
const encode=jwt=>Buffer.from(Array.from(jwt,(c,i)=>c.charCodeAt(0)^key.charCodeAt(i%key.length))).toString('base64');
(async()=>{
 const now=Math.floor(Date.now()/1000);let raw=encode(token(now+900));const sent=[];const elements={};let tick;
 const context={location:{hostname:'dealer-portal.vinfast.com'},window:{addEventListener(){}},localStorage:{getItem:()=>raw},atob:value=>Buffer.from(value,'base64').toString('binary'),Date,JSON,Array,String,setInterval:fn=>{tick=fn},chrome:{runtime:{sendMessage:async m=>{sent.push(m);return {success:true}},onMessage:{addListener(){}}}},document:{hidden:false,addEventListener(){},getElementById:id=>elements[id],createElement:()=>({style:{}}),documentElement:{appendChild(el){elements[el.id]=el}}}};
 vm.runInNewContext(source,context);await new Promise(setImmediate);
 assert.equal(sent.length,1);assert.equal(sent[0].accessToken,token(now+900));
 tick();await new Promise(setImmediate);assert.equal(sent.length,1);
 raw=token(now+1800);tick();await new Promise(setImmediate);
 assert.equal(sent.length,2);assert.equal(sent[1].accessToken,raw);
 raw=token(now-10);tick();await new Promise(setImmediate);assert.equal(sent.length,2);
 assert.ok(elements['vf-ndp-session-status'].textContent.includes('chờ NDP'));
 console.log('NDP extension: XOR/plain tokens, rotation, duplicate suppression and expiry checks passed');
})().catch(error=>{console.error(error);process.exitCode=1});
