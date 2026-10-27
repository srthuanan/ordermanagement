const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const compile = path => ts.transpileModule(fs.readFileSync(path, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const loginCode = compile('components/LoginScreen.tsx');
const panelCode = compile('components/login/DesktopPasskeyControls.tsx');
function setup({ width = 1280, passwordResult, passkeyResult, registerResult, savedProfile = null } = {}) {
  const hooks = []; let cursor = 0; let successes = 0; let pending = false; let enrollments = 0; let passkeyCalls = 0;
  const notices = [];
  const controls = () => null;
  const mobileView = () => null;
  const auth = {
    isInteractiveLoginPending: () => pending,
    setInteractiveLoginPending: value => { pending = value; },
    login: async () => passwordResult || { success: true, username: 'user', email: 'user@example.com', consultantName: 'User', role: 'user' },
  };
  const passkeys = {
    isWebAuthnSupported: () => true, getSavedPasskeyProfile: () => savedProfile,
    loginWithPasskey: async remember => { passkeyCalls++; assert.equal(remember, true); return passkeyResult || { success: true }; },
    registerPasskey: async () => { enrollments++; return registerResult || { success: true }; },
  };
  const react = { ...React,
    useState: initial => {
      const i = cursor++;
      if (!(i in hooks)) hooks[i] = typeof initial === 'function' ? initial() : initial;
      return [hooks[i], value => { hooks[i] = typeof value === 'function' ? value(hooks[i]) : value; }];
    },
    useRef: initial => { const i = cursor++; if (!(i in hooks)) hooks[i] = { current: initial }; return hooks[i]; },
    useEffect: () => {},
  };
  const exports = {};
  vm.runInNewContext(loginCode, {
    exports, require: name => {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return require(name);
      if (name.includes('authService')) return auth;
      if (name.includes('passkeyService')) return passkeys;
      if (name.includes('DesktopPasskeyControls')) return { DesktopPasskeyControls: controls };
      if (name.includes('MobileLoginView')) return { MobileLoginView: mobileView };
      if (name === 'lucide-react') return require(name);
      if (name.includes('VinFastAnimatedLogo')) return { VinFastAnimatedLogo: () => null };
      return { default: 'asset' };
    },
    window: { innerWidth: width }, navigator: { userAgent: 'Windows' },
    localStorage: { getItem: () => null },
  });
  const render = () => { cursor = 0; return exports.default({ onLoginSuccess: () => { successes++; }, showToast: (...args) => notices.push(args) }); };
  function find(element, predicate) {
    if (!element || typeof element !== 'object') return null;
    if (predicate(element)) return element;
    for (const child of React.Children.toArray(element.props?.children)) {
      const match = find(child, predicate); if (match) return match;
    }
    return null;
  }
  const panel = () => find(render(), e => e.type === controls);
  const passwordLogin = async () => {
    find(render(), e => e.type === 'input' && e.props.type === 'text').props.onChange({ target: { value: 'user' } });
    find(render(), e => e.type === 'input' && e.props.type === 'password').props.onChange({ target: { value: 'password' } });
    return find(render(), e => e.type === 'form').props.onSubmit({ preventDefault() {} });
  };
  return { panel, passwordLogin, notices, render, find: predicate => find(render(), predicate), isMobile: () => render().type === mobileView, get successes() { return successes; }, get pending() { return pending; },
    get enrollments() { return enrollments; }, get passkeyCalls() { return passkeyCalls; } };
}
for (const width of [1024, 1440]) {
  const view = `${width}px desktop`;
  test(`${view}: password login waits for optional enrollment, then skip opens app`, async () => {
    const c = setup({ width });
    await c.passwordLogin();
    assert.equal(c.successes, 0); assert.equal(c.pending, true);
    assert.equal(c.panel().props.pendingAccount, 'user@example.com');
    assert.equal(c.panel().props.busy, true);
    c.panel().props.onContinue();
    assert.equal(c.successes, 1); assert.equal(c.pending, false);
  });
  test(`${view}: passkey sign-in verifies before opening app and blocks repeated clicks`, async () => {
    const c = setup({ width });
    const handler = c.panel().props.onSignIn;
    const task = handler();
    assert.equal(c.pending, true); assert.equal(c.successes, 0);
    await handler(); await task;
    assert.equal(c.passkeyCalls, 1); assert.equal(c.successes, 1); assert.equal(c.pending, false);
  });
}
test('cancelled passkey login stays on login screen and releases busy state', async () => {
  const c = setup({ passkeyResult: { success: false, message: 'Cancelled' } });
  await c.panel().props.onSignIn();
  assert.equal(c.successes, 0); assert.equal(c.pending, false); assert.equal(c.panel().props.busy, false);
  assert.equal(c.notices[0][1], 'Cancelled');
});
test('failed password does not offer enrollment or open app', async () => {
  const c = setup({ passwordResult: { success: false, message: 'Rejected' } });
  await c.passwordLogin();
  assert.equal(c.successes, 0); assert.equal(c.pending, false); assert.equal(c.panel().props.pendingAccount, undefined);
});
test('enrollment cancellation still completes already verified password login', async () => {
  const c = setup({ registerResult: { success: false, message: 'Cancelled' } });
  await c.passwordLogin(); await c.panel().props.onEnroll();
  assert.equal(c.enrollments, 1); assert.equal(c.successes, 1); assert.equal(c.pending, false);
});
test('existing matching local passkey skips enrollment prompt', async () => {
  const c = setup({ savedProfile: { email: 'user@example.com' } });
  await c.passwordLogin(); assert.equal(c.successes, 1); assert.equal(c.pending, false);
});
test('desktop button is a non-submit action and is disabled while busy', () => {
  const exports = {};
  vm.runInNewContext(panelCode, { exports, require });
  const html = renderToStaticMarkup(React.createElement(exports.DesktopPasskeyControls, {
    busy: true, enrolling: false, onSignIn() {}, onEnroll() {}, onContinue() {},
  }));
  assert.match(html, /type="button"/); assert.match(html, /disabled=""/); assert.match(html, /aria-busy="true"/);
  assert.match(html, /Windows Hello/); assert.match(html, /Passkey/);
});

test('phone viewport still uses the dedicated mobile login', () => {
  const c = setup({ width: 390 });
  assert.equal(c.isMobile(), true);
});
test('desktop can reveal and hide the password without submitting', () => {
  const c = setup();
  c.find(e => e.type === 'button' && e.props['aria-pressed'] === false).props.onClick();
  assert.equal(c.find(e => e.props?.id === 'desktop-login-password').props.type, 'text');
  c.find(e => e.type === 'button' && e.props['aria-pressed'] === true).props.onClick();
  assert.equal(c.find(e => e.props?.id === 'desktop-login-password').props.type, 'password');
});
test('forgot password opens a recovery form and can return to login', () => {
  const c = setup();
  c.find(e => e.type === 'button' && e.props.className?.includes('hover:underline')).props.onClick();
  assert.ok(c.find(e => e.props?.id === 'desktop-recovery-email'));
  assert.equal(c.panel(), null);
  c.find(e => e.type === 'button' && e.props.className?.includes('mx-auto')).props.onClick();
  assert.ok(c.find(e => e.props?.id === 'desktop-login-username'));
});
