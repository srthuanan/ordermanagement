const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, api, capture) {
  const exports = {}, states = [];
  const code = ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
  const react = { useState: value => { const i=states.length;states.push(value);return [value,next=>{states[i]=typeof next==='function'?next(states[i]):next;}]; },useCallback:fn=>fn,useEffect:()=>{},useMemo:fn=>fn(),useRef:value=>({current:value}) };
  vm.runInNewContext(code,{exports,console,setTimeout,clearTimeout,sessionStorage:{getItem:()=>null,removeItem:()=>{}},require:name=>{
    if(name==='react')return react;
    if(name==='swr')return (key,fetcher)=>{capture.fetcher=fetcher;return {data:undefined,error:null,mutate:()=>Promise.resolve()}};
    if(name.endsWith('/apiService'))return api;
    if(name.endsWith('/supabaseClient'))return {supabase:{}};
    if(name.endsWith('/satelliteWarehouseService'))return {enrichTransitCarsWithRealLocations:data=>data};
    if(name.endsWith('/activityLogger'))return {logStaffActivity:()=>capture.logs++};
    throw new Error('Unexpected dependency: '+name);
  }});
  return {exports,states};
}
(async()=>{
  const ordersCapture={};
  let ordersResult={status:'ERROR',message:'Phiên đăng nhập đã hết hạn'};
  const orders=load('hooks/useVinFastApi.ts',{getPaginatedData:async()=>ordersResult},ordersCapture);
  orders.exports.useVinFastApi('Test',false);
  await assert.rejects(ordersCapture.fetcher(),/Phiên đăng nhập đã hết hạn/);
  ordersResult={status:'SUCCESS',data:[{'Số đơn hàng':'TEST-001'}]};
  assert.equal((await ordersCapture.fetcher()).data.length,1);
  const stockCapture={};
  const stock=load('hooks/useStockApi.ts',{getStockData:async()=>({status:'ERROR',message:'Không đọc được kho'}),getMyQueuedVins:async()=>[]},stockCapture);
  // Capture the stock fetcher independently of the queue fetcher.
  const swrSource=fs.readFileSync('hooks/useStockApi.ts','utf8');
  const match=swrSource.match(/useSWR\('stockData',\s*(async \(\) => \{[\s\S]*?\n    \}), \{/);
  assert.ok(match);
  const fetchStock=new Function('apiService','return ('+match[1]+')')({getStockData:async()=>({status:'ERROR',message:'Không đọc được kho'})});
  await assert.rejects(fetchStock(),/Không đọc được kho/);
  stock.exports.useStockApi();
  const notices=[],capture={logs:0};let releaseResult={status:'ERROR',message:'Không có quyền nhả xe'};let holdResult={status:'ERROR',message:'Xe đã được giữ bởi người khác'};let refetches=0;
  const operations=load('hooks/useOrderOperations.ts',{holdCar:async()=>holdResult,releaseCar:async()=>releaseResult,joinHoldQueue:async()=>({status:'ERROR',message:'Đã ở trong hàng chờ'}),leaveHoldQueue:async()=>({status:'SUCCESS',message:'Đã hủy chờ'}),autoSyncDmsRadarIfNeeded:async()=>{}},capture);
  const handlers=operations.exports.useOrderOperations({showToast:(title,message,type)=>notices.push({title,message,type}),hideToast:()=>{},refetchStock:()=>{refetches++},refetchHistory:()=>{},setAllHistoryData:()=>{}});
  await handlers.handleHoldCar('TEST-VIN');assert.equal(notices.at(-1).type,'error');assert.equal(capture.logs,0);
  await handlers.handleReleaseCar('TEST-VIN');assert.equal(notices.at(-1).type,'error');assert.match(notices.at(-1).message,/Không có quyền/);assert.equal(capture.logs,0);
  await handlers.handleJoinQueue('TEST-VIN');assert.equal(notices.at(-1).type,'error');assert.match(notices.at(-1).message,/hàng chờ/);
  releaseResult={status:'SUCCESS',message:'Đã nhả'};await handlers.handleReleaseCar('TEST-VIN');assert.equal(notices.at(-1).type,'success');assert.equal(capture.logs,1);
  holdResult=undefined;await handlers.handleHoldCar('TEST-VIN');assert.equal(notices.at(-1).type,'error');assert.equal(capture.logs,1);
  assert.equal(operations.states.at(-1),null,'Processing state must clear after success and failure.');
  assert.ok(refetches>=1);
  console.log('PASS: order/stock API failures surface as errors; valid order data loads; failed holds/releases/queue never show false success; no activity logs on failed actions; processing state clears. APIs mocked, no live writes.');
})().catch(error=>{console.error(error);process.exitCode=1});
