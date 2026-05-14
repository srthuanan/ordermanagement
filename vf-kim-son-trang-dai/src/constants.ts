import {
  LayoutDashboard,
  ShoppingBag,
  Boxes,
  ClipboardList,
  Calculator,
  Users
} from 'lucide-react';
import { OrderStatus, StockStatus, ProfileRow } from './types';

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
  dashboard: ['admin', 'sales'],
  orders: ['admin', 'sales'],
  inventory: ['admin', 'sales'],
  invoices: ['admin'],
  pricing: ['admin', 'sales'],
  staff: ['admin']
};

export function canAccessTab(role: AppRole, tabKey: TabKey) {
  return roleTabAccess[tabKey].includes(role);
}

export function getVisibleTabs(role: AppRole) {
  return tabs.filter((tab) => canAccessTab(role, tab.key as TabKey));
}

export function canCreateOrder(role: AppRole) {
  return ['admin', 'sales'].includes(role);
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
  'VF 6': ['Eco Tiêu chuẩn', 'Eco Nâng cấp', 'Plus Tiêu chuẩn', 'Plus Nâng cấp'],
  'VF 7': ['Eco', 'Eco_HUD', 'Plus_Metal Tiêu chuẩn', 'Plus_Metal Nâng cấp', 'Plus Tiêu chuẩn', 'Plus Nâng cấp'],
  'VF 8': ['Eco Tiêu chuẩn', 'Eco Nâng cấp', 'Plus'],
  'VF 9': ['Eco_3ZONES', 'Plus_Metal_3ZONES', 'Plus_CAP_Metal_3ZONES'],
  HERIO: ['HERIO'],
  NERIO: ['NERIO'],
  LIMO: ['LIMO'],
  MINIO: ['MINIO'],
  'EC Van': ['Base', 'Plus', 'Plus_Cửa trượt']
};

export const allPossibleVersions = Array.from(new Set(Object.values(versionsMap).flat())).sort();

export const defaultExteriors = [
  'Brahminy White (CE18)',
  'Neptune Grey (CE14)',
  'Jet Black (CE11)',
  'Crimson Red (CE1M)',
  'Vinfast Blue (CE1N)',
  'Zenith Grey (CE1V)',
  'Sunset ORB (CE1A)',
  'Yellow (CE1U)',
  'Deep Ocean (CE1H)',
  'Silver (CE17)'
];

export const defaultInteriors = ['Black', 'Brown', 'Beige', 'Grey'];

export const interiorColorRules: Array<{ models: string[]; versions?: string[]; colors: string[] }> = [
  { models: ['vf 3', 'vf 5'], colors: ['Black'] },
  {
    models: ['vf 6', 'vf 7', 'vf 8', 'vf 9'],
    versions: ['plus', 'plus tiêu chuẩn', 'plus nâng cấp', 'plus_metal tiêu chuẩn', 'plus_metal nâng cấp', 'plus_metal_3zones', 'plus_cap_metal_3zones'],
    colors: ['Black', 'Brown', 'Beige']
  },
  {
    models: ['vf 6', 'vf 7', 'vf 8', 'vf 9'],
    versions: ['eco', 'eco_hud', 'eco tiêu chuẩn', 'eco nâng cấp', 'eco_3zones'],
    colors: ['Black']
  },
  { models: ['herio', 'nerio', 'limo', 'ec van'], colors: ['Black', 'Brown'] },
  { models: ['minio'], colors: ['Grey'] }
];

export const defaultSalesPolicies = [
  'Ưu đãi giao xe tháng hiện hành',
  'Hỗ trợ lãi suất ngân hàng',
  'Thu cũ đổi mới xe điện'
];

export const vehicleLines = Object.keys(versionsMap);
export const vehicleVersions = allPossibleVersions;
export const vehicleColors = defaultExteriors;
export const vehicleInteriors = defaultInteriors;
export const staffNames = ['Kim Anh', 'Hải Đăng', 'Thanh Phúc', 'Quản lý cửa hàng'];

export const roleLabels: Record<ProfileRow['role'], string> = {
  admin: 'Admin',
  sales: 'TVBH',
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
