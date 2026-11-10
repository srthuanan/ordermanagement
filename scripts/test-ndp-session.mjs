import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {sessionClaims, allowedSessionRequest, saveNdpSession, sessionStatus} from './ndp-session-store.mjs';
const claims={sub:'test-user',username:'0925821888',permissions:['capability:vhkd_01'],dealerCodes:['N31913'],exp:Math.floor(Date.now()/1000)+900};
const token=(data)=>'header.'+Buffer.from(JSON.stringify(data)).toString('base64url')+'.signature';
const ok=async()=>({ok:true,json:async()=>({id:'test-user',username:'0925821888'})});
test('only loopback extension origins can ingest sessions',()=>{
 assert.ok(allowedSessionRequest('127.0.0.1','chrome-extension://'+'a'.repeat(32)));
 assert.ok(allowedSessionRequest('::1','chrome-extension://'+'a'.repeat(32)));
 assert.equal(allowedSessionRequest('192.168.1.1','chrome-extension://'+'a'.repeat(32)),false);
 assert.equal(allowedSessionRequest('127.0.0.1','https://evil.example'),false);
 assert.equal(allowedSessionRequest('127.0.0.1',undefined),false);
});
test('rejects expired, wrong-account and malformed credentials',()=>{
 assert.throws(()=>sessionClaims(token({...claims,exp:1})));
 assert.throws(()=>sessionClaims(token({...claims,username:'someone-else'})));
 assert.throws(()=>sessionClaims(token({...claims,dealerCodes:[]})));
 assert.throws(()=>sessionClaims('bad'));
});
test('verifies with NDP and saves atomically without leaking tokens',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'ndp-session-test-'));
 try {
  let probes=0;
  const accessToken=token(claims);
  const saved=await saveNdpSession(dir,{accessToken},async()=>{probes++;return ok()});
  assert.ok(saved.success);assert.equal(probes,1);
  assert.equal(JSON.stringify(saved).includes(accessToken),false);
  const status=await sessionStatus(dir);assert.ok(status.connected);assert.equal(JSON.stringify(status).includes(accessToken),false);
  await saveNdpSession(dir,{accessToken},async()=>{throw Error('should not revalidate unchanged token')});
  assert.equal(probes,1);
  const newer=token({...claims,exp:claims.exp+900});
  await saveNdpSession(dir,{accessToken:newer},ok);
  const ignored=await saveNdpSession(dir,{accessToken},ok);assert.ok(ignored.ignoredOlder);
  assert.equal(JSON.parse(await fs.readFile(path.join(dir,'ndp_token_config.json'),'utf8')).accessToken,newer);
  await assert.rejects(()=>saveNdpSession(dir,{accessToken:token({...claims,exp:claims.exp+1800})},async()=>({ok:false,status:401})));
  assert.equal(JSON.parse(await fs.readFile(path.join(dir,'ndp_token_config.json'),'utf8')).accessToken,newer);
 } finally {await fs.rm(dir,{recursive:true,force:true});}
});
