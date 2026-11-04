const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

let notifications = 0;
let rpcCalls = 0;
let reads = 0;
let resolveNotifications;
const notificationPending = new Promise(resolve => { resolveNotifications = resolve; });
const client = {
  from() {
    const query = new Proxy({}, { get(_, key) {
      if (key === 'then') return resolve => { reads++; resolve({ data: [], error: null }); };
      return () => query;
    } });
    return query;
  },
  rpc: async () => { rpcCalls++; return { data: { status: 'SUCCESS', message: 'OK' }, error: null }; }
};
const exportsObject = {};
const source = fs.readFileSync('services/api/stockService.ts', 'utf8').replaceAll('import.meta', '({env:{}})');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
vm.runInNewContext(code, {
  exports: exportsObject, console, URLSearchParams, Date,
  window: { location: {}, localStorage: {}, fetch: async () => { throw new Error('Unexpected network'); } },
  localStorage: { getItem: () => String(Date.now()) },
  require(name) {
    if (name === '../supabaseClient') return { supabase: client, supabaseAdmin: client };
    if (name === './baseService') return { getStorageItem: () => 'admin' };
    if (name === './notificationService') return { createNotification: () => { notifications++; return notificationPending; } };
    if (name === './cyberBridge') return {};
    throw new Error('Unexpected import: ' + name);
  }
});
(async () => {
  const start = performance.now();
  const timeout = setTimeout(() => { console.error('FAIL: stock action waited for notification'); process.exit(1); }, 2000);
  assert.equal((await exportsObject.holdCar('TEST')).status, 'SUCCESS');
  assert.equal((await exportsObject.joinHoldQueue('TEST')).status, 'SUCCESS');
  assert.equal(notifications, 2);
  assert.equal(rpcCalls, 1);
  const first = exportsObject.processExpiredQueuePriorities();
  const second = exportsObject.processExpiredQueuePriorities();
  assert.equal(first, second, 'Concurrent queue cleanup must share one pass');
  await Promise.all([first, second]);
  assert.equal(reads, 3, 'One insert and two cleanup reads; no duplicate cleanup');
  await exportsObject.processExpiredQueuePriorities();
  assert.equal(reads, 5, 'Later cleanup still runs');
  resolveNotifications();
  clearTimeout(timeout);
  console.log(`PASS: holds and queue joins finish with notifications still pending; cleanup shares concurrent work and runs again later (${Math.round(performance.now() - start)} ms). Mock APIs, no live writes.`);
})().catch(error => { console.error(error); process.exit(1); });
