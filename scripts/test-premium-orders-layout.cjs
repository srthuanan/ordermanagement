const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const Dropdown = () => null;
const Stub = () => null;
const Badge = ({ status }) => React.createElement('span', { className: 'premium-status' }, status);
const react = { ...React, useEffect() {}, useMemo: callback => callback(), useCallback: callback => callback,
    useState: value => [typeof value === 'function' ? value() : value, () => {}], useRef: value => ({ current: value }) };
function load(file, extra = {}) {
    const exports = {};
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    vm.runInNewContext(code, { exports, console, setTimeout, clearTimeout, require: name => {
        if (name === 'react') return react;
        if (name.endsWith('.css')) return {};
        if (name.endsWith('/MultiSelectDropdown')) return Dropdown;
        if (name.endsWith('/StatusBadge')) return Badge;
        if (name.endsWith('/CarImage')) return ({ model }) => React.createElement('img', { alt: model, src: '../../public/pictures/vf6-ce18.webp' });
        if (name.endsWith('/useVehicleConfig')) return { useVehicleConfig: () => ({ versionsMap: {}, allPossibleVersions: [], vehicleLines: [], vehicleColors: [], vehicleInteriors: [] }) };
        if (name.endsWith('/styleUtils')) return { getExteriorColorStyle: () => ({}), getInteriorColorStyle: () => ({}), getExteriorSwatchColor: () => '#fff' };
        if (name.endsWith('/designTokenService')) return { getCarChameleonTheme: () => ({ primaryHex: '#224477', primaryRgb: '34,68,119' }) };
        if (name.endsWith('/stringUtils')) return { formatShortWarehouseName: value => value, cleanCyberContractCode: value => value, formatShortExteriorColor: value => value };
        if (extra[name]) return extra[name];
        if (name.startsWith('.')) return new Proxy({}, { get: () => Stub });
        return require(name);
    } }, { filename: file });
    return exports;
}
function find(node, predicate) {
    if (!node || typeof node !== 'object') return;
    if (predicate(node)) return node;
    for (const child of React.Children.toArray(node.props?.children)) { const match = find(child, predicate); if (match) return match; }
}
const { default: Workspace, orderStatusTone } = load('components/orders/PremiumOrdersWorkspace.tsx');
const { OrderDetailView: Detail } = load('components/OrderDetailView.tsx');
const order = { 'Số đơn hàng': 'N31913-VSO-26-10-0115', 'Tên khách hàng': 'TRẦN VĂN LỢI', 'Dòng xe': 'VF 6', 'Phiên bản': 'Eco', 'Ngoại thất': 'White (CE18)', 'Nội thất': 'Black', 'Kết quả': 'Chờ phê duyệt', VIN: 'RLLVAGND7TH836455', 'Thời gian nhập': '28/10/2026 11:03:19', 'Thời gian ghép': '28/10/2026 11:03:19', 'Ngày cọc': '26/07/2026', 'Số máy': 'VFCAJB267210268', 'Tên tư vấn bán hàng': 'LÊ THỊ HƯƠNG TRÀ', 'CHÍNH SÁCH': 'VTLX2 - 9%' };
const filters = { keyword: '', carModel: [], version: [], status: [], exterior: [] };
let selected, changed, statisticsOpened = false, approval;
const props = { orders: [order], visibleOrders: [order], selectedOrderId: order['Số đơn hàng'], filteredCount: 1, filters,
    onFilterChange: value => { changed = value; }, onReset() {}, onSelect: value => { selected = value; }, onRefresh() {}, onStats() { statisticsOpened = true; },
    loading: false, error: null, processingOrder: null, loadMoreRef: { current: null }, onLoadMore() {}, hasArchives: false, loadingArchives: false, onLoadArchives() {}, children: null };
const tree = Workspace(props);
find(tree, node => node.props.className === 'premium-order-row').props.onClick();
assert.equal(selected, order);
find(tree, node => node.type === 'input').props.onChange({ target: { value: 'VIN-123' } });
assert.equal(changed.keyword, 'VIN-123');
find(tree, node => node.props['aria-label'] === 'Thống kê đơn hàng').props.onClick();
assert.equal(statisticsOpened, true);
assert.equal(orderStatusTone('Chờ phê duyệt'), 'amber');
assert.equal(orderStatusTone('Đã xuất hóa đơn'), 'green');
const detailProps = { presentation: 'workspace', order, onOpenApproval: value => { approval = value; } };
const detail = Detail(detailProps);
find(detail, node => node.props.className === 'premium-primary').props.onClick();
assert.equal(approval, order);
assert.ok(!find(Detail({ ...detailProps, onOpenApproval: undefined }), node => node.props.className === 'premium-primary'));
assert.ok(!find(Detail({ ...detailProps, isReferenceAccount: true }), node => node.props.className === 'premium-primary'));
const html = renderToStaticMarkup(detail);
assert.ok(html.includes(order.VIN));
assert.ok(html.includes('VTLX2 - 9%'));
assert.ok(html.includes('Ngày Cọc'));
assert.ok(html.includes('Giấy Ra Cổng'));
const empty = renderToStaticMarkup(Detail({ presentation: 'workspace', order: null }));
assert.ok(empty.includes('Chọn một đơn hàng'));
console.log('PASS: selection, search, navigation, restricted actions, approval routing, real order details and empty state');

const { default: Header } = load('components/layout/Header.tsx', {
    '../context/GlobalNotificationContext': { useGlobalNotificationContext: () => ({ notification: null, isDismissed: true }) },
    '../ui/HolidayThemeDecorator': { isMidAutumnSeason: () => false, isHalloweenSeason: () => false },
});
let activeView;
const sidebar = Header({ presentation: 'sidebar', activeView: 'orders', setActiveView: value => { activeView = value; }, currentUser: 'Test', currentUserName: 'Test', isStockEnabled: true, isCrmEnabled: true, isCurrentUserAdmin: false, notifications: [], notificationContainerRef: { current: null } });
assert.ok(find(sidebar, node => node.type === 'header').props.className.includes('app-sidebar-navigation'));
const nav = find(sidebar, node => node.type === 'nav');
assert.equal(nav.props['aria-label'], 'Điều hướng chính');
find(nav, node => node.props.title === 'Kho xe').props.onClick();
assert.equal(activeView, 'stock');
for (const label of ['Đơn Hàng', 'Cọc Tồn', 'KHTN', 'Lái Thử', 'Lịch Sử']) assert.ok(find(nav, node => node.props.title === label));
assert.ok(find(sidebar, node => node.props['aria-controls'] === 'notification-sheet'));
assert.ok(find(sidebar, node => node.props['aria-controls'] === 'app-profile-menu'));
assert.ok(!find(tree, node => node.type === 'nav'));
console.log('PASS: single desktop sidebar, navigation callbacks, notification and account access');

if (process.argv.includes('--preview')) (async () => {
    const postcss = require('postcss');
    const tailwind = require('tailwindcss');
    const css = await postcss([tailwind({ content: ['components/OrderDetailView.tsx', 'components/orders/PremiumOrdersWorkspace.tsx'], corePlugins: { preflight: true } })]).process('@tailwind base; @tailwind utilities;', { from: undefined });
    const names = ['TRẦN VĂN LỢI', 'LÊ THỊ THU HIỀN', 'NGUYỄN THỊ BÍCH TRÂM', 'NGUYỄN PHÚC TRIỀU', 'TRẦN THỊ NGỌC HÀ', 'NGUYỄN BÁ AN', 'HUỲNH TẤN TRIỀU'];
    const orders = names.map((name, index) => ({ ...order, 'Tên khách hàng': name, 'Số đơn hàng': index ? `N31913-VSO-26-10-011${index}` : order['Số đơn hàng'], 'Kết quả': index % 2 ? 'Đã ghép' : 'Chờ phê duyệt' }));
    const markup = renderToStaticMarkup(Workspace({ ...props, orders, visibleOrders: orders, filteredCount: orders.length, children: detail }));
    fs.mkdirSync('output/premium-orders', { recursive: true });
    fs.writeFileSync('output/premium-orders/preview.html', `<!doctype html><html lang="vi"><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css.css}\n${fs.readFileSync('components/orders/orders-premium.css', 'utf8')}\nhtml,body{height:100%;margin:0}</style><body>${markup}</body></html>`);
    console.log('Preview:', path.resolve('output/premium-orders/preview.html'));
})().catch(error => { console.error(error); process.exitCode = 1; });
