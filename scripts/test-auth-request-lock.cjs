const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { createClient } = require('@supabase/supabase-js');
const source = ts.createSourceFile('index.tsx', fs.readFileSync('index.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let listener;
function visit(node) {
  if (ts.isCallExpression(node) && node.expression.getText(source).endsWith('auth.onAuthStateChange')) listener = node.arguments[0];
  ts.forEachChild(node, visit);
}
visit(source);
assert.ok(listener, 'The real root auth listener must exist.');
assert.ok(!listener.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword), 'The auth listener itself must not await Supabase.');
const user = { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@example.invalid', created_at: new Date().toISOString(), app_metadata: {}, user_metadata: {} };
const payload = Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated' })).toString('base64url');
const token = 'eyJhbGciOiJIUzI1NiJ9.' + payload + '.test-signature';
async function exercise(defer) {
  const calls = [];
  const client = createClient('https://test.supabase.co', 'sb_publishable_test', {
    global: { fetch: async (input) => {
      const pathname = new URL(String(input)).pathname; calls.push(pathname);
      return new Response(JSON.stringify(pathname.includes('/auth/') ? user : [{ username: 'test', full_name: 'Test', role: 'TVBH' }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, lock: async (_name, _timeout, fn) => fn() },
  });
  await client.auth.initialize();
  let completed = false;
  const restore = async () => { await client.auth.getUser(); await client.auth.getSession(); await client.from('users').select('username'); completed = true; };
  let rootAuthenticated = false;
  const fixedListener = new Function('authService','window','sessionStorage','initialFlow','isResettingPassword','setIsAuthenticated','setResetContext','setIsResettingPassword','setIsInitialLoading', `let authRestoreTimer=null,authRestoreRunning=false,authEventVersion=0,disposed=false;return (${listener.getText(source)});`)(
    { isInteractiveLoginPending: () => false, restoreSession: async () => { await restore(); return true; } },
    { location: { hash: '' }, innerWidth: 1200 }, { getItem: () => null }, { context: 'recovery-disabled', isResetting: false }, false,
    value => { rootAuthenticated = value; }, () => {}, () => {}, () => {},
  );
  const { data: { subscription } } = client.auth.onAuthStateChange(defer ? fixedListener : async (event) => { if (event === 'SIGNED_IN') await restore(); });
  const operation = client.auth.setSession({ access_token: token, refresh_token: 'test-only' });
  const resolved = await Promise.race([operation.then(() => true), new Promise(resolve => setTimeout(() => resolve(false), 350))]);
  if (resolved) await new Promise(resolve => setTimeout(resolve, 50));
  subscription.unsubscribe();
  return { resolved, completed, requests: calls.length, rootAuthenticated };
}
(async () => {
  const old = await exercise(false);
  const fixed = await exercise(true);
  console.log('Existing async auth listener:', JSON.stringify(old));
  console.log('Deferred auth restore:', JSON.stringify(fixed));
  assert.equal(fixed.resolved, true);
  assert.equal(fixed.completed, true);
  assert.equal(fixed.rootAuthenticated, true);
  console.log('PASS: session restore and follow-up database reads complete outside the auth callback. All network responses are synthetic.');
})().catch(error => { console.error(error); process.exitCode = 1; });
