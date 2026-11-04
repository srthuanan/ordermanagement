const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const StatusBadge = ({ status }) => React.createElement('span', null, status);
const Dropdown = () => null;
function load(file, { openFilters = false } = {}) {
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const exports = {};
    vm.runInNewContext(code, { exports, document: { body: {} }, require: name => {
        if (name === 'react') return { ...React, useEffect() {}, useMemo: callback => callback(), useRef: value => ({ current: value }), useState: value => [openFilters || value, () => {}] };
        if (name === 'react-dom') return { createPortal: child => child };
        if (name.endsWith('/StatusBadge')) return StatusBadge;
        if (name.endsWith('/MultiSelectDropdown')) return Dropdown;
        return require(name);
    } }, { filename: file });
    return exports.default;
}
function find(node, predicate) {
    if (!node || typeof node !== 'object') return;
    if (predicate(node)) return node;
    for (const child of React.Children.toArray(node.props?.children)) { const match = find(child, predicate); if (match) return match; }
}
const order = { 'Số đơn hàng': 'REAL-001', 'Tên khách hàng': '<script>Customer</script>', 'Dòng xe': 'VF 5', 'Phiên bản': 'Plus', 'Ngoại thất': 'White', 'Nội thất': 'Black', 'Kết quả': 'Đã ghép', VIN: 'REALVIN001', 'Thời gian nhập': 'null', 'Tên tư vấn bán hàng': 'Consultant' };
const filters = { keyword: '', carModel: [], version: [], status: [], exterior: [] };
const props = { orders: [order], visibleOrders: [order], filteredCount: 1, filters, onFilterChange() {}, onReset() {}, sortConfig: null, onSort() {}, processingOrder: null, onSelect() {}, loading: false, error: null, readOnly: false, onCreate() {}, onRefresh() {}, onStats() {}, onLoadMore() {}, loadMoreRef: { current: null }, hasArchives: false, loadingArchives: false, onLoadArchives() {} };
const Workspace = load('components/orders/DesktopOrdersWorkspace.tsx');
let selected, sorted;
const table = Workspace({ ...props, onSelect: value => { selected = value; }, onSort: key => { sorted = key; } });
const html = renderToStaticMarkup(table);
assert.ok(html.includes('REAL-001'));
assert.ok(html.includes('REALVIN001'));
assert.ok(html.includes('&lt;script&gt;Customer&lt;/script&gt;'));
assert.ok(!html.includes('<script>Customer'));
find(table, node => node.props.className === 'orders-table-open').props.onClick({ stopPropagation() {} });
assert.equal(selected, order);
find(table, node => node.type === 'th' && node.props.children?.props?.children?.[0] === 'Xe / Phiên bản').props.children.props.onClick();
assert.equal(sorted, 'Dòng xe');
assert.ok(!renderToStaticMarkup(Workspace({ ...props, readOnly: true })).includes('orders-page-create'));
assert.ok(!html.includes('>null<'));
console.log('PASS: original record selection, safe rendering, column sorting, read-only actions, missing dates');

const ExpandedWorkspace = load('components/orders/DesktopOrdersWorkspace.tsx', { openFilters: true });
let changed;
const expanded = ExpandedWorkspace({ ...props, onFilterChange: value => { changed = value; } });
const modelDropdown = find(expanded, node => node.type === Dropdown && node.props.id === 'orders-facet-carModel');
modelDropdown.props.onChange(['VF 5']);
assert.equal(changed.carModel[0], 'VF 5');
const statusTab = find(expanded, node => node.type === 'button' && React.Children.toArray(node.props.children)[0] === 'Đã ghép');
statusTab.props.onClick();
assert.equal(changed.status[0], 'Đã ghép');
console.log('PASS: model facets and quick status tabs update the existing filters');

const Sheet = load('components/orders/OrderDetailsSheet.tsx');
let closed = 0;
const sheet = Sheet({ order, children: 'Existing detail workflow', onClose: () => { closed++; }, onNavigate() {}, canPrevious: false, canNext: true });
const dialog = find(sheet, node => node.props.role === 'dialog');
assert.equal(dialog.props['aria-modal'], 'true');
dialog.props.onKeyDown({ key: 'Escape', target: { closest: () => null }, stopPropagation() {}, preventDefault() {} });
assert.equal(closed, 1);
assert.ok(!find(sheet, node => node.props.className === 'orders-sheet-admin-menu'));
console.log('PASS: sheet dismissal and administrator-only navigation');
