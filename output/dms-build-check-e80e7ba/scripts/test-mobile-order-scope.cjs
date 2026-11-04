const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = (file) => ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
const dataFile = source('hooks/useAppData.ts');
function find(node, predicate) {
  if (predicate(node)) return node;
  let match;
  ts.forEachChild(node, child => { match ||= find(child, predicate); });
  return match;
}
function declaration(file, name) {
  const node = find(file, n => ts.isVariableDeclaration(n) && n.name.getText(file) === name);
  assert.ok(node, `Missing ${name}`);
  return ts.transpileModule(`const ${node.getText(file)};`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
}
const normalization = declaration(source('services/authService.ts'), 'normalizeName');
const permissionCode = `${normalization}\n${declaration(dataFile, 'usersToView')}\n${declaration(dataFile, 'historyData')}\nhistoryData;`;
const order = (number, consultant) => ({ 'Số đơn hàng': number, 'Tên tư vấn bán hàng': consultant });
const rows = [order('OWN', 'Nguyễn Văn An'), order('TEAM', 'Trần Bình'), order('OTHER', 'Lê Chi')];
function visible({ currentUser = 'Nguyễn Văn An', userRole = 'Tư vấn bán hàng', isCurrentUserAdmin = false, teamData = {}, records = rows } = {}) {
  return vm.runInNewContext(permissionCode, {
    currentUser, userRole, isCurrentUserAdmin, teamData, mergedAllHistoryData: records,
    useMemo: callback => callback(),
  }).map(item => item['Số đơn hàng']);
}
const ids = result => Array.from(result);
test('consultant can see only their own orders', () => {
  assert.deepEqual(ids(visible()), ['OWN']);
});
test('team manager can see their own and assigned team orders only', () => {
  assert.deepEqual(ids(visible({ userRole: 'Trưởng Phòng Kinh Doanh', teamData: { 'Nguyễn Văn An': ['Trần Bình'] } })), ['OWN', 'TEAM']);
});
test('manager without loaded team data falls back to own orders', () => {
  assert.deepEqual(ids(visible({ userRole: 'Trưởng Phòng Kinh Doanh' })), ['OWN']);
});
test('administrator retains access to all orders', () => {
  assert.deepEqual(ids(visible({ isCurrentUserAdmin: true })), ['OWN', 'TEAM', 'OTHER']);
});
test('name normalization matches case, extra spaces and Unicode composition', () => {
  assert.deepEqual(ids(visible({ currentUser: '  NGUYỄN   VĂN AN  '.normalize('NFD') })), ['OWN']);
});
test('orders received on refresh do not broaden consultant scope', () => {
  assert.deepEqual(ids(visible({ records: [...rows, order('NEW_OTHER', 'Trần Bình'), order('NEW_OWN', 'Nguyễn Văn An')] })), ['OWN', 'NEW_OWN']);
});
test('mobile and desktop consume the same role-filtered historyData', () => {
  const app = source('App.tsx');
  const mobile = find(app, n => ts.isJsxSelfClosingElement(n) && n.tagName.getText(app) === 'MobileOrdersView');
  assert.ok(mobile);
  const orders = mobile.attributes.properties.find(p => ts.isJsxAttribute(p) && p.name.getText(app) === 'orders');
  assert.equal(orders.initializer.expression.getText(app), 'historyData');
  const desktop = find(app, n => ts.isCallExpression(n) && n.expression.getText(app) === 'useOrderFiltering');
  assert.ok(desktop);
  const desktopOrders = desktop.arguments[0].properties.find(p => p.name?.getText(app) === 'allHistoryData');
  assert.equal(desktopOrders.initializer.getText(app), 'historyData');
});
