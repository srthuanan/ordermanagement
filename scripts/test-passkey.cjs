const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync('services/passkeyService.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
function setup({ supported = true, restore = true, auth = {} } = {}) {
  const values = new Map();
  const storage = { getItem: k => values.get(k) ?? null, setItem: (k,v) => values.set(k,v), removeItem: k => values.delete(k) };
  let restores = 0;
  const exports = {};
  vm.runInNewContext(source, {
    exports, require: name => name === './supabaseClient' ? { supabase: { auth } } : {
      restoreSession: async () => { restores++; storage.setItem('currentUser', 'server-user'); return restore; },
    },
    window: { isSecureContext: supported, PublicKeyCredential: {} }, navigator: { credentials: {} },
    PublicKeyCredential: { isUserVerifyingPlatformAuthenticatorAvailable: async () => supported },
    localStorage: storage, sessionStorage: storage,
  });
  return { service: exports, values, get restores() { return restores; } };
}
test('unsupported device cannot authenticate', async () => {
  const c = setup({ supported: false });
  assert.equal((await c.service.loginWithPasskey()).success, false);
  assert.equal(c.restores, 0);
});
test('legacy local profile cannot grant login', () => {
  const c = setup(); c.values.set('vf_passkey_profile', JSON.stringify({ username: 'admin', token: 'old' }));
  assert.equal(c.service.getSavedPasskeyProfile(), null);
  assert.equal(c.values.has('vf_passkey_profile'), false);
});
test('cancelled ceremony does not restore session', async () => {
  const c = setup({ auth: { signInWithPasskey: async () => ({ error: { name: 'NotAllowedError' } }) } });
  assert.equal((await c.service.loginWithPasskey()).success, false);
  assert.equal(c.restores, 0);
});
test('server session works without a saved profile and uses server identity', async () => {
  const c = setup({ auth: { signInWithPasskey: async () => ({ data: { session: {}, user: { id: 'uid', email: 'user@example.com' } } }) } });
  const result = await c.service.loginWithPasskey(false);
  assert.equal(result.success, true); assert.equal(result.profile.username, 'server-user');
  assert.equal(c.values.get('rememberMe'), 'false'); assert.equal(c.restores, 1);
});
test('device/session rejection prevents login', async () => {
  const c = setup({ restore: false, auth: { signInWithPasskey: async () => ({ data: { session: {}, user: { email: 'user@example.com' } } }) } });
  assert.equal((await c.service.loginWithPasskey()).success, false);
});
test('registration binds to verified user and stores no token or role', async () => {
  const c = setup({ auth: {
    getUser: async () => ({ data: { user: { email: 'user@example.com' } } }),
    registerPasskey: async () => ({ data: { id: 'passkey-id' } }),
  } });
  const user = { username: 'user', consultantName: 'User', email: 'user@example.com', role: 'admin', token: 'secret' };
  assert.equal((await c.service.registerPasskey(user)).success, true);
  const saved = JSON.parse(c.values.get('vf_passkey_profile'));
  assert.equal(saved.token, undefined); assert.equal(saved.role, undefined); assert.equal(saved.version, 2);
  assert.equal((await c.service.registerPasskey({ ...user, email: 'other@example.com' })).success, false);
});
