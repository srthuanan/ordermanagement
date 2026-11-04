const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const writes = [], notices = [], states = [];
let rejectCopy = false;
const exportsObject = {};
const code = ts.transpileModule(fs.readFileSync('components/StockView.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
vm.runInNewContext(code, { exports: exportsObject, console, setTimeout: () => 1, clearTimeout() {}, navigator: { clipboard: { writeText: async value => { if (rejectCopy) throw Error('Denied'); writes.push(value); } } }, require(name) {
  if (name === 'react') return { ...React, useState: value => { const i = states.length; states.push(value); return [value, next => { states[i] = next; }]; }, useMemo: fn => fn(), useCallback: fn => fn, useEffect() {}, useLayoutEffect() {}, useRef: value => ({ current: value }) };
  if (name.endsWith('/stringUtils')) return { includesNormalized: () => true };
  if (name.endsWith('/styleUtils')) return { getExteriorSwatchColor: () => '#777' };
  return { __esModule: true, default: () => null };
} });
function find(node, predicate) {
  if (!node || typeof node !== 'object') return;
  if (predicate(node)) return node;
  for (const child of React.Children.toArray(node.props?.children)) { const found = find(child, predicate); if (found) return found; }
}
(async () => {
  const vehicle = { VIN: 'RLNVBL9K4TT754394', 'Dòng xe': 'VF 3', 'Phiên bản': 'Plus', 'Trạng thái': 'Chưa ghép', 'Số máy': 'TZ160X3G26082800384' };
  const View = exportsObject.default.type || exportsObject.default;
  const tree = View({ stockData: [vehicle], allOrders: [], queuedVins: [], currentUser: 'Test', showToast: (...args) => notices.push(args), canHoldMore: true });
  const vin = find(tree, n => n.props.className === 'cmd-card-vin');
  const engine = find(tree, n => n.props.className === 'cmd-card-engine');
  await vin.props.onClick();
  await Promise.resolve(); await Promise.resolve();
  await engine.props.onClick();
  await Promise.resolve(); await Promise.resolve();
  assert.deepEqual(writes, [vehicle.VIN, vehicle['Số máy']]);
  assert.equal(states[0], null, 'Copy must not open the details drawer');
  assert.equal(states[2], vehicle.VIN + ':engine', 'Successful copy sets feedback');
  rejectCopy = true;
  await vin.props.onClick(); await Promise.resolve(); await Promise.resolve();
  assert.equal(notices.at(-1)[2], 'error');
  assert.equal(writes.length, 2);
  assert.ok(!find(tree, n => n.props.className === 'cmd-btn' && n.props.children === 'Chi tiết'));
  const card = find(tree, n => n.props.className === 'cmd-card');
  card.props.onClick({ target: { closest: () => ({}) } });
  assert.equal(states[0], null, 'Action buttons must not open details');
  card.props.onClick({ target: { closest: () => null } });
  assert.equal(states[0], vehicle, 'Clicking the card opens details');
  const held = { ...vehicle, 'Trạng thái': 'Đang giữ', 'Người Giữ Xe': 'Test', 'Thời Gian Hết Hạn Giữ': new Date(Date.now() + 10 * 60000).toISOString() };
  const heldTree = View({ stockData: [held], allOrders: [], queuedVins: [], currentUser: 'Test', showToast() {}, canHoldMore: true });
  const menu = find(heldTree, n => n.type === 'details' && n.props.className === 'cmd-action-menu');
  assert.ok(menu, 'Multiple actions must use the overflow menu');
  assert.ok(find(menu, n => n.type === 'button' && n.props.children === 'Gia hạn'));
  assert.ok(find(menu, n => n.type === 'button' && n.props.children === 'Hủy'));
  assert.ok(!find(menu, n => n.type === 'button' && n.props.children === 'Ghép'), 'Main action stays outside menu');
  let stopped = false;
  const menuState = { open: true };
  menu.props.onClick({ stopPropagation() { stopped = true; }, target: { closest: () => ({}) }, currentTarget: menuState });
  assert.equal(stopped, true);
  assert.equal(menuState.open, false, 'Selecting a secondary action closes the menu');
  const now = Date.parse('2026-10-30T10:00:00+07:00');
  const eligible = exportsObject.isHoldInFinalTwentyMinutes;
  for (const [minutes, expected] of [[21, false], [20, true], [19, true], [1, true], [0, false], [-1, false]]) {
    assert.equal(eligible({ ...held, 'Thời Gian Hết Hạn Giữ': new Date(now + minutes * 60000).toISOString() }, now), expected, `${minutes} minutes remaining`);
  }
  for (const expiry of ['', 'Vô thời hạn', 'invalid']) assert.equal(eligible({ ...held, 'Thời Gian Hết Hạn Giữ': expiry }, now), false);
  assert.equal(eligible({ ...held, 'Thời Gian Hết Hạn Giữ': '30/10/2026 10:20:00' }, now), true);
  assert.equal(eligible({ ...held, 'Trạng thái': 'Đã ghép' }, now), false);
  const earlyTree = View({ stockData: [{ ...held, 'Thời Gian Hết Hạn Giữ': new Date(Date.now() + 60 * 60000).toISOString() }], allOrders: [], queuedVins: [], currentUser: 'Test', showToast() {}, canHoldMore: true });
  assert.ok(!find(earlyTree, n => n.type === 'button' && n.props.children === 'Gia hạn'), 'Extension must stay hidden before final 20 minutes');
  assert.ok(!find(earlyTree, n => n.type === 'details' && n.props.className === 'cmd-action-menu'), 'Two actions must display directly without overflow');
  assert.ok(find(earlyTree, n => n.type === 'button' && n.props.children === 'Ghép'));
  assert.ok(find(earlyTree, n => n.type === 'button' && n.props.children === 'Hủy'));
  console.log('PASS: extension visible only during final 20 minutes; boundary, expired, indefinite, invalid and legacy timestamps checked.');
  console.log('PASS: VIN/engine copy, clipboard errors, no details button; card opens details while action buttons do not. Mock clipboard; no live writes.');
})().catch(error => { console.error(error); process.exitCode = 1; });
