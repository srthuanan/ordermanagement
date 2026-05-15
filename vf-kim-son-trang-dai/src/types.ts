import type { LucideIcon } from 'lucide-react';

export type OrderStatus =
  | 'Chưa ghép'
  | 'Đã ghép'
  | 'Chờ phê duyệt'
  | 'Đã phê duyệt'
  | 'Yêu cầu bổ sung'
  | 'Đã bổ sung'
  | 'Chờ ký hóa đơn'
  | 'Đã xuất hóa đơn'
  | 'Đã hủy';
export type StockStatus = 'Chưa ghép' | 'Đang giữ' | 'Đã ghép';
export type SyncState = 'loading' | 'live' | 'sample' | 'error' | 'success' | 'idle';

export interface Order {
  id: string;
  customer: string;
  phone: string;
  area: string;
  line: string;
  version: string;
  exterior: string;
  interior: string;
  staff: string;
  status: OrderStatus;
  vin: string;
  createdAt: string;
  depositDate: string;
  needDate: string;
  pairedAt: string;
  policy: string;
  cancelNote: string;
  engineNo: string;
  needDateIso: string | null;
  depositAmount?: number | null;
  invoiceAddress?: string | null;
  contractCode?: string | null;
  paymentMethod?: string | null;
}

export interface InventoryItem {
  vin: string;
  line: string;
  version: string;
  exterior: string;
  interior: string;
  status: StockStatus;
  holder: string;
  holderUsername: string;
  holdExpiry: string;
  location: string;
  engineNo: string;
  latitude: number | null;
  longitude: number | null;
  isExtensionRequested: boolean;
  extensionReason: string;
  extensionEvidenceUrl: string;
  extensionCount: number;
}

export interface NewOrderInput {
  orderId: string;
  customer: string;
  line: string;
  version: string;
  exterior: string;
  interior: string;
  staff: string;
  depositDate: string;
  needDate: string;
  pairedVin?: string;
  depositAmount?: number | null;
  invoiceAddress?: string | null;
  contractCode?: string | null;
  paymentMethod?: string | null;
}

// Bảng Supabase (Database Rows)
export interface CustomerRow {
  full_name: string;
  phone: string;
  area: string | null;
}

export interface DonhangRow {
  so_don_hang: string;
  ten_tu_van_ban_hang: string;
  ten_khach_hang: string;
  dong_xe: string;
  phien_ban: string;
  ngoai_that: string;
  noi_that: string;
  ngay_coc: string | null;
  thoi_gian_can_xe: string | null;
  thoi_gian_nhap: string;
  ket_qua: string;
  trang_thai_gui_mail: string | null;
  vin: string | null;
  so_may: string | null;
  thoi_gian_ghep: string | null;
  so_ngay_ghep: number | null;
  ngay_xuat_hoa_don: string | null;
  chinh_sach: string | null;
  ghi_chu_huy: string | null;
  created_at: string;
  updated_at: string;
  so_tien_coc: number | null;
  dia_chi_xhd: string | null;
  ma_hop_dong: string | null;
  tm_vay: string | null;
}

export interface KhoxeRow {
  vin: string;
  dong_xe: string;
  phien_ban: string;
  ngoai_that: string;
  noi_that: string;
  trang_thai: string;
  nguoi_giu_xe: string | null;
  username_giu_xe: string | null;
  thoi_gian_het_han_giu: string | null;
  vi_tri: string | null;
  ngay_nhap: string | null;
  ngay_van_tai: string | null;
  so_may: string | null;
  latitude: number | null;
  longitude: number | null;
  is_extension_requested: boolean;
  extension_reason: string | null;
  extension_evidence_url: string | null;
  extension_count: number;
}

export interface VehicleLocationRow {
  vin: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface YeucauxhdRow {
  id: string;
  so_don_hang: string;
  ten_khach_hang: string;
  vin: string | null;
  tvbh: string | null;
  dong_xe: string | null;
  phien_ban: string | null;
  ngoai_that: string | null;
  noi_that: string | null;
  ngay_coc: string | null;
  ngay_yeu_cau: string | null;
  so_tien_khach_da_dong: number | null;
  dia_chi: string | null;
  so_hop_dong: string | null;
  ngay_ky_hop_dong: string | null;
  hinh_thuc_tt: string | null;
  nguon_khach: string | null;
  ma_vso: string | null;
  mua_bao_hiem: boolean | null;
  dang_ky_xe: boolean | null;
  gia_cong_bo: number | null;
  ghi_chu: string | null;
  coc: boolean | null;
  url_hop_dong: string | null;
  url_de_nghi_xhd: string | null;
  url_hoa_don_da_xuat: string | null;
  so_may: string | null;
  ngay_xuat_hoa_don: string | null;
  ket_qua_gui_mail: string | null;
  ghi_chu_ai: string | null;
  ghi_chu_admin: string | null;
  trang_thai_xu_ly: string | null;
  xe_xang_vin: string | null;
  xe_xang_hang: string | null;
  xe_xang_model: string | null;
  requested_by: string | null;
  requested_by_name: string | null;
  requested_by_username: string | null;
  link_de_nghi_xhd: string | null;
  chinh_sach: string | null;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  approved_by_name: string | null;
  approved_by_username: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileRow {
  id: string;
  full_name: string;
  role: 'admin' | 'sales';
  email?: string | null;
  invite_status?: 'invite_sent' | 'recovery_sent' | 'active' | 'canceled' | null;
  invited_at?: string | null;
  activated_at?: string | null;
  canceled_at?: string | null;
  last_message?: string | null;
  created_at: string;
}

export interface TabConfig {
  key: string;
  label: string;
  icon: LucideIcon;
}

export interface CarActivityRow {
  id: string;
  action:
    | 'hold'
    | 'release'
    | 'pair'
    | 'unpair'
    | 'expire_hold'
    | 'request_invoice'
    | 'finalize_invoice'
    | 'cancel_order'
    | 'queue_join'
    | 'queue_leave'
    | 'queue_prioritized';
  so_don_hang: string | null;
  vin: string | null;
  actor_name: string | null;
  actor_username: string | null;
  detail: string | null;
  created_at: string;
}

export interface SalesPolicyRow {
  ten_chinh_sach: string;
  dong_xe: string | null;
}

export interface UpdateOrderInput {
  orderId: string;
  customer: string;
  line: string;
  version: string;
  exterior: string;
  interior: string;
  staff: string;
  depositDate: string;
  needDate: string;
  depositAmount?: number | null;
  invoiceAddress?: string | null;
  contractCode?: string | null;
  paymentMethod?: string | null;
}
