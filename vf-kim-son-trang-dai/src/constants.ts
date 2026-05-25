import {
  LayoutDashboard,
  ShoppingBag,
  Boxes,
  ClipboardList,
  Calculator,
  Users
} from 'lucide-react';
import { OrderStatus, StockStatus, ProfileRow } from './types';

export const API_URL = 'https://script.google.com/macros/s/AKfycbwC_Xw8YcudogtxpPJztqjFdttcL4tgDaHIdgFWqGcnZ0M44oH6KVb-2r52OKPtLex0Fg/exec';
export const ADMIN_USER = 'PHẠM THÀNH NHÂN';

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const tabs = [
  { key: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { key: 'orders', label: 'Đơn hàng', icon: ShoppingBag },
  { key: 'inventory', label: 'Kho xe', icon: Boxes },
  { key: 'invoices', label: 'Yêu cầu HĐ', icon: ClipboardList },
  { key: 'pricing', label: 'Tính giá', icon: Calculator },
  { key: 'staff', label: 'Nhân sự', icon: Users }
] as const;

export type TabKey = (typeof tabs)[number]['key'];
export type AppRole = ProfileRow['role'];

const roleTabAccess: Record<TabKey, AppRole[]> = {
  dashboard: ['admin', 'manager'],
  orders: ['admin', 'sales', 'manager'],
  inventory: ['admin', 'sales', 'manager'],
  invoices: ['admin'],
  pricing: ['admin', 'sales', 'manager'],
  staff: ['admin', 'manager']
};

export function canAccessTab(role: AppRole, tabKey: TabKey) {
  return roleTabAccess[tabKey].includes(role);
}

export function getVisibleTabs(role: AppRole) {
  return tabs.filter((tab) => canAccessTab(role, tab.key as TabKey));
}

export function canCreateOrder(role: AppRole) {
  return true;
}

export function canHoldVehicle(role: AppRole) {
  return ['admin', 'sales', 'manager'].includes(role);
}

export function canPairOrder(role: AppRole) {
  return role === 'admin';
}

export function canManageOrderActions(role: AppRole) {
  return ['admin', 'sales', 'manager'].includes(role);
}

export function canManageInventory(role: AppRole) {
  return role === 'admin';
}

export function canOverrideHeldVehicle(role: AppRole) {
  return role === 'admin';
}

export function canApproveInvoice(role: AppRole) {
  return role === 'admin';
}

export function canManagePricingConfig(role: AppRole) {
  return role === 'admin';
}

export function canManageStaff(role: AppRole) {
  return role === 'admin';
}

export const versionsMap: Record<string, string[]> = {
  'VF 3': ['Base', 'Base Tiêu chuẩn 2', 'Plus'],
  'VF 5': ['Plus'],
  'VF 6': ['Eco Tiêu chuẩn', 'Eco Nâng cấp', 'Plus Tiêu chuẩn', 'Plus Nâng cấp', 'Plus_US', 'Plus Tiêu chuẩn 1', 'Plus Tiêu chuẩn 2'],
  'VF 7': ['Eco', 'Eco_HUD', 'Plus_Metal Nâng cấp', 'Plus_Metal Tiêu chuẩn', 'Plus Tiêu chuẩn', 'Plus Nâng cấp', 'Eco Tiêu chuẩn 1', 'Eco Tiêu chuẩn 2', 'Eco_HUD Tiêu chuẩn 1', 'Eco_HUD Tiêu chuẩn 2', 'Plus_Metal Tiêu chuẩn 1', 'Plus_Metal Tiêu chuẩn 2', 'Plus Tiêu chuẩn 2', 'Plus Tiêu chuẩn 1', 'Plus_Metal Tiêu chuẩn 1 (FWD)', 'Plus_Metal Tiêu chuẩn 1 (AWD)', 'Plus_Metal Tiêu chuẩn 2 (1 Cầu)', 'Plus_Metal Tiêu chuẩn 2 (2 Cầu)'],
  'VF 8': ['Eco Tiêu chuẩn', 'Eco Nâng cấp', 'Plus', 'Eco_US', 'Plus_US'],
  'VF 9': ['Plus_CAP_Metal_3ZONES', 'Plus_Metal_3ZONES', 'Eco_3ZONES', 'Plus_Metal', 'Plus_CAP_Metal', 'Plus_CAP'],
  HERIO: ['HERIO'],
  NERIO: ['NERIO'],
  LIMO: ['LIMO'],
  'VF LIMO': ['MPV 7'],
  MINIO: ['MINIO'],
  'EC Van': ['Base', 'Plus', 'Plus_Cửa trượt']
};

export const allPossibleVersions = [
  'Base', 'Plus', 'Plus Tiêu chuẩn', 'Plus Nâng cấp', 'Eco', 'Eco_HUD', 'Eco Tiêu chuẩn', 'Eco Nâng cấp',
  'Plus_Metal Tiêu chuẩn', 'Plus_Metal Nâng cấp', 'Plus_CAP_Metal', 'Plus_Metal_3ZONES', 'Eco_3ZONES',
  'Plus_CAP_Metal_3ZONES', 'HERIO', 'NERIO', 'LIMO', 'MINIO', 'MPV 7',
  'Plus_US', 'Plus Tiêu chuẩn 1', 'Plus Tiêu chuẩn 2', 'Eco Tiêu chuẩn 1', 'Eco Tiêu chuẩn 2',
  'Eco_HUD Tiêu chuẩn 1', 'Eco_HUD Tiêu chuẩn 2', 'Plus_Metal Tiêu chuẩn 1', 'Plus_Metal Tiêu chuẩn 2',
  'Base Tiêu chuẩn 2', 'Plus_Metal Tiêu chuẩn 1 (FWD)', 'Plus_Metal Tiêu chuẩn 1 (AWD)',
  'Plus_Metal Tiêu chuẩn 2 (1 Cầu)', 'Plus_Metal Tiêu chuẩn 2 (2 Cầu)',
  'EC Van', 'Plus_Cửa trượt', 'Plus_CAP', 'Eco_US'
];

export const defaultExteriors = [
  'Brahminy White (CE18)', 'Yellow (CE1U)', 'Sunset ORB (CE1A)', 'Crimson Red (CE1M)',
  'Vinfast Blue (CE1N)', 'Neptune Grey (CE14)', 'Jet Black (CE11)', 'Electric Blue (CE1J)',
  'Zenith Grey (CE1V)', 'Jet Black Roof- Summer Yellow Body (111U)',
  'Brahminy White Roof- Aquatic Azure Body (181Y)', 'Brahminy White Roof- Rose Pink Body (1821)',
  'Brahminy White Roof - Iris Berry Body (181X)', 'Urbant Mint (CE1W)', 'Vinbus Green (CE2B)',
  'Deep Ocean (CE1H)', 'Brahminy White Roof- Summer Yellow Body (181U)', 'Iris Berry (CE1X)',
  'Zenith Grey-desat Silver Roof (171V)', 'Urbant Mint Green - Desat Silv (171W)',
  'Ivy Green-desat Silver Roof (1722)', 'Atlantic Blue-Aquatic Azure Ro (1Y26)',
  'Jet Black-Champagne Creme Roof (2311)', 'Infinity Blanc _ Silky White R (2418)',
  'Champagne Creme - Matte Champa (2523)', 'Jet Black - Graphite Roof (2811)',
  'Crimson Velvet - Mystery Bronz (2927)', 'Ivy_Green_GNE (CE22)', 'Champagne_Creme_YLG (CE23)',
  'Crimson Red - Jet Black Roof (111M)', 'Infinity Blanc_Zenith Grey Roof (1v18)',
  'Deep Ocean_Jet Black Roof (111H)', 'Alantic Blue_Denim Blue Roof (2A26)',
  'Jet Black_Mystery Bronze Roof (2911)', 'Champagne Creme_Infinity Blanc Roof (1823)',
  'Silver (CE17)', 'Pink Gold (CE2K)', 'Solar Ruby (CE2Q)', 'Moonlit Ocean (CE2J)',
  'Infinity Blanc Roof-Sky Blue (182G)', 'Introspective Brown (CE2N)'
];

export const defaultInteriors = ['Black', 'Brown', 'Beige', 'Grey'];

export const interiorColorRules: Array<{ models: string[]; versions?: string[]; colors: string[] }> = [
  { models: ['vf 3', 'vf 5'], colors: ['Black'] },
  {
    models: ['vf 6', 'vf 7', 'vf 8', 'vf 9'],
    versions: ['plus tiêu chuẩn', 'plus nâng cấp', 'plus', 'plus_metal nâng cấp', 'plus_metal tiêu chuẩn', 'plus_cap_metal_3zones', 'plus_metal_3zones', 'plus_cap_metal', 'plus_metal', 'plus_us', 'plus tiêu chuẩn 1', 'plus tiêu chuẩn 2', 'plus_metal tiêu chuẩn 1', 'plus_metal tiêu chuẩn 2', 'plus_metal tiêu chuẩn 1 (fwd)', 'plus_metal tiêu chuẩn 1 (awd)', 'plus_metal tiêu chuẩn 2 (1 cầu)', 'plus_metal tiêu chuẩn 2 (2 cầu)', 'plus_cap'],
    colors: ['Black', 'Brown', 'Beige']
  },
  {
    models: ['vf 6', 'vf 7', 'vf 8', 'vf 9'],
    versions: ['eco tiêu chuẩn', 'eco nâng cấp', 'eco', 'eco_hud', 'eco_3zones', 'eco tiêu chuẩn 1', 'eco tiêu chuẩn 2', 'eco_hud tiêu chuẩn 1', 'eco_hud tiêu chuẩn 2', 'eco_us'],
    colors: ['Black']
  },
  { models: ['herio', 'nerio', 'limo', 'vf limo', 'ec van'], colors: ['Black', 'Brown'] },
  { models: ['minio'], colors: ['Grey'] }
];

export const VALID_IMAGES_BY_MODEL: Record<string, string[]> = {
  vf3: ['181u', '181y', '1821', 'ce18', 'ce1j', 'ce1m', 'ce1v', 'ce1w', 'ce1x', 'ce2q', '182g'],
  vf5: ['111u', '181y', 'ce11', 'ce14', 'ce18', 'ce1m', 'ce1n', 'ce1v', 'ce1w', 'ce1x', 'ce2q'],
  vf6: ['ce11', 'ce14', 'ce18', 'ce1h', 'ce1m', 'ce1n', 'ce1v', 'ce1w', 'ce2q'],
  vf7: ['ce11', 'ce14', 'ce17', 'ce18', 'ce1h', 'ce1m', 'ce1n', 'ce1v', 'ce1w', 'ce2q'],
  vf8: ['ce11', 'ce14', 'ce18', 'ce1h', 'ce1m', 'ce1n', 'ce1v', 'ce1w', 'ce22', 'ce2q'],
  vf9: ['ce11', 'ce14', 'ce17', 'ce18', 'ce1h', 'ce1m', 'ce1n', 'ce1w', 'ce22', 'ce2q'],
  ecvan: ['ce18', 'ce1m', 'ce1u', 'ce1w', 'ce2q'],
  herio: ['ce11', 'ce17', 'ce1m', 'ce1u', 'ce2q'],
  limo: ['ce11', 'ce17', 'ce18', 'ce1m', 'ce1u', 'ce2q'],
  vflimo: ['ce11', 'ce17', 'ce18', 'ce1m', 'ce1u', 'ce2q', 'ce2j', 'ce2n'],
  nerio: ['ce11', 'ce17', 'ce1m', 'ce1u', 'ce2q']
};

export const defaultSalesPolicies = [
  'Chương trình Mãnh liệt vì tương lai xanh - Hỗ trợ lãi suất (7%)',
  'VinClub hạng Gold 0,5%',
  'Chính sách ưu đãi cho VF 9 VIN 2025',
  'Chính sách ưu đãi cho VF 7 VIN 2025',
  'Chính sách ưu đãi [Eco 1 cầu (bản Việt Nam)] - 20Tr',
  'Quy đổi 1 năm BHVC cho VF 5 (Trả góp)',
  'Chính sách ưu đãi cho Nerio Green VIN 2025',
  'Chính sách ưu đãi [Eco 2 cầu (bản Việt Nam)] - 50Tr',
  'Giảm 10% (MLTTVN)',
  'Chương trình tặng Voucher giờ Trái Đất - 7Tr',
  'Ưu đãi [Eco/Plus] - Miễn phí màu nâng cao',
  'Tặng 1 năm BHVC cho VF 5',
  'Chương trình tặng Voucher giờ Trái Đất - 10Tr',
  'Giảm 6% (MLTTVN)',
  'Chính sách ưu đãi Tiên phong VF LIMO - 15Tr',
  'Quy đổi 1 năm BHVC cho VF 5 (Trả thẳng)',
  'Chương trình tặng Voucher giờ Trái Đất - 15Tr',
  'Chính sách ưu đãi [Plus - Tiêu chuẩn 1 (2 cầu)] - 50Tr',
  'Tặng 2 năm BHVC cho các xe VF 6 Eco và Limo Green Vin 2025',
  'Chương trình Mãnh liệt vì tương lai xanh - Hỗ trợ lãi suất (5%)',
  'Chính sách ưu đãi cho VF 8 VIN 2025',
  'Chính sách ưu đãi [Eco – Tiêu chuẩn 1] - 3Tr',
  'VinClub hạng Platinum 1%',
  'Chương trình tặng Voucher giờ Trái Đất - 5Tr',
  'Chính sách ưu đãi [VF7 Plus Nâng cấp] - 50Tr',
  'Chính sách ưu đãi cho VF 5 VIN 2025',
  'Chương trình thu xăng đổi điện',
  'Chính sách Mua xe 0 đồng',
  'Chính sách ưu đãi cho VF 6 Plus VIN 2025',
  'Chính sách ưu đãi xe công vụ',
  'VinClub hạng Diamond 1,5%',
  'Chương trình tặng Voucher giờ Trái Đất - 20Tr',
  'Quy đổi 2 năm BHVC cho các xe VF 6 Eco và Limo Green Vin 2025',
  'Tặng 2 năm BHVC cho xe VF LIMO',
  'Chính sách ưu đãi cho VF 3 VIN 2025',
  'Chính sách ưu đãi cho Herio Green VIN 2025',
  'Chính sách ưu đãi [Plus - Tiêu chuẩn 1 (1 cầu)] - 50Tr',
  'Chính sách ưu đãi khách hàng ngành Công an và Quân đội'
];

export const vehicleLines = Object.keys(versionsMap);
export const vehicleVersions = allPossibleVersions;
export const vehicleColors = defaultExteriors;
export const vehicleInteriors = defaultInteriors;
export const staffNames = ['Kim Anh', 'Hải Đăng', 'Thanh Phúc', 'Quản lý cửa hàng'];

export const roleLabels: Record<ProfileRow['role'], string> = {
  admin: 'Admin',
  manager: 'TPKD',
  sales: 'TVBH',
  warehouse: 'Kho xe',
  delivery: 'Giao xe',
  staff: 'Nhân sự'
};

export const statusTone: Record<OrderStatus, string> = {
  'Chưa ghép': 'status pending',
  'Đã ghép': 'status shipping',
  'Chờ phê duyệt': 'status preparing',
  'Đã phê duyệt': 'status shipping',
  'Yêu cầu bổ sung': 'status pending',
  'Đã bổ sung': 'status preparing',
  'Chờ ký hóa đơn': 'status shipping',
  'Đã xuất hóa đơn': 'status done',
  'Đã hủy': 'status canceled'
};

export const stockTone: Record<StockStatus, string> = {
  'Chưa ghép': 'status pending',
  'Đang giữ': 'status preparing',
  'Đã ghép': 'status done'
};
