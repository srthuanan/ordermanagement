const fs = require('node:fs');
const ts = require('typescript');
const assert = require('node:assert/strict');
(async () => {
 const src = fs.readFileSync('services/api/ndpEvidence.ts', 'utf8');
 const js = ts.transpileModule(src, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const mod = {exports:{}}; new Function('exports','module',js)(mod.exports,mod);
 const {evaluateNdpEvidence: check, validNdpInvoiceDate: date} = mod.exports;
 const good = {orderNumber:'N31913VSO2611001',yanaOrderNumber:'N31913-VSO-26-08-0103',vin:'RLNV5JSE6TH792566',dealerCode:'N31913',status:'INVOICED'};
 const run = rows => check(rows,[good.yanaOrderNumber],good.vin,'N31913');
 assert.ok(run([good]).record);
 for(const bad of [{...good,orderNumber:'OTHER',yanaOrderNumber:'OTHER'},{...good,vin:'RLNV5JSE6TH792567'},{...good,dealerCode:'N31911'},...['NOT_INVOICED','SOLD','CANCELLED','APPROVED'].map(status=>({...good,status}))]) assert.equal(run([bad]).record,undefined);
 assert.equal(run([good,{...good,orderNumber:'N31913VSO2611002'}]).record,undefined);
 assert.equal(run([good,{...good,status:'CANCELLED'}]).record,undefined);
 assert.equal(date('2026-02-30'),null); assert.equal(date('2099-11-01'),null); assert.equal(date('2026-11-01T08:00:00Z'),'2026-11-01'); assert.equal(date(null),null);
 console.log('14 NDP evidence/date assertions passed');
})();

(async () => {
 const helperJs = ts.transpileModule(fs.readFileSync('services/api/ndpEvidence.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const helper = {exports:{}}; new Function('exports','module',helperJs)(helper.exports,helper);
 const serviceJs = ts.transpileModule(fs.readFileSync('services/api/invoiceService.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const target = {orderNo:'N31913-VSO-26-08-0103',vin:'RLNV5JSE6TH792566',currentStatus:'Đã phê duyệt'};
 const record = {orderNumber:'N31913VSO2611001',yanaOrderNumber:target.orderNo,vin:target.vin,dealerCode:'N31913',status:'INVOICED'};
 for(const scenario of ['success','write-error','changed-state','expired','wrong-vin','already-completed']) {
   let updates = 0, logs = 0, requests = 0; const filters = [];
   const db = {from(table) {
      if(table === 'donhanghienhuu') return {select(){return this},in:async()=>({data:[]})};
      assert.equal(table,'donhang');
      return {update(patch){updates++; assert.equal(patch.ngay_xuat_hoa_don,undefined);return this},eq(k,v){filters.push([k,v]);return this},select:async()=> scenario === 'write-error' ? {error:{message:'denied'}} : {data: scenario === 'changed-state' ? [] : [{so_don_hang:target.orderNo}]}};
   }};
   const fakeRequire = path => {
      if(path === '../supabaseClient') return {supabase:db,supabaseAdmin:db};
      if(path === './ndpEvidence') return helper.exports;
      if(path === './cyberBridge') return {executeCyberApi:async(url)=>{requests++;assert.equal(url,'/api/ndp/order-evidence');return scenario==='expired'?{success:false,error:'expired'}:{success:true,records:[scenario==='wrong-vin'?{...record,vin:'OTHER'}:record]}}};
      if(path === './baseService') return {logAction:async()=>{logs++}};
      return {};
   };
   const module = {exports:{}};new Function('require','exports','module',serviceJs)(fakeRequire,module.exports,module);
   const result = await module.exports.checkNdpApprovedOrders([{...target,currentStatus:scenario==='already-completed'?'Đã xuất hóa đơn':target.currentStatus}]);
   assert.equal(result.transitioned_count,scenario==='success'?1:0);
   assert.equal(result.unprocessed.length,scenario==='success'?0:1);
   assert.equal(logs,scenario==='success'?1:0);
   assert.equal(updates,['success','write-error','changed-state'].includes(scenario)?1:0);
   if(updates) {assert.ok(filters.some(([k,v])=>k==='ket_qua'&&v==='Đã phê duyệt'));assert.ok(filters.some(([k,v])=>k==='vin'&&v===target.vin));}
   if(scenario==='already-completed') assert.equal(requests,0);
 }
 console.log('6 NDP workflow scenarios passed');
})().catch(error=>{console.error(error);process.exitCode=1});
