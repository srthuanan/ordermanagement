// This file now contains the centralized type definitions for the application,
// resolving numerous "has no exported member" errors.

export type AdminSubView = 'invoices' | 'pending' | 'paired' | 'matching' | 'vc' | 'phongkd' | 'stats' | 'incomplete_cars' | 'super_edit' | 'inquiries' | 'holds' | 'policies' | 'don_ton' | 'ai_knowledge' | 'ai_health' | 'management' | 'inventory' | 'system' | 'policy_summary' | 'pricing_calculator' | 'maintenance_fee';

export interface Order {
  "Số đơn hàng": string;
  "Tên khách hàng": string;
  "Dòng xe": string;
  "Phiên bản": string;
  "Ngoại thất": string;
  "Nội thất": string;
  "Thời gian nhập": string; // ISO Date string
  "Thời gian cần xe"?: string; // ISO Date string (Expected delivery date)
  "Tên tư vấn bán hàng": string;
  "Kết quả": string; // e.g., "Chưa ghép", "Đã ghép"
  VIN?: string;
  "Thời gian ghép"?: string; // ISO Date string
  "Ghi chú hủy"?: string;
  "Thời gian hủy"?: string;
  LinkHoaDonDaXuat?: string;
  LinkHopDong?: string;
  LinkDeNghiXHD?: string;
  "Số máy"?: string;
  "Mã DMS"?: string;
  "Ngày xuất hóa đơn"?: string;
  "Hoa hồng ứng"?: string;
  "Điểm Vpoint sử dụng"?: string;
  "CHÍNH SÁCH"?: string;
  "Số tiền hoa hồng ứng trước"?: number;
  "Ngày cọc"?: string;
  "BÁO BÁN"?: boolean | string;
  "KẾT QUẢ GỬI MAIL"?: string;
  "Trạng thái VC"?: string;
  // other potential fields from components
  [key: string]: any; // Allow for other properties
}

export interface VcRequest {
  "Số đơn hàng": string;
  "Tên khách hàng": string;
  "Thời gian YC": string;
  "Người YC": string;
  "Loại YC": string;
  "Trạng thái xử lý": string;
  "Ghi chú": string;
  "URL hình ảnh"?: string; // Make optional for backward compatibility / new flow
  "FileUrls"?: string; // JSON string of document URLs
  "Mã KH DMS"?: string;
  VIN?: string;
  [key: string]: any;
}


export interface StockVehicle {
  VIN: string;
  "Dòng xe": string;
  "Phiên bản": string;
  "Ngoại thất": string;
  "Nội thất": string;
  "Trạng thái": string; // e.g., "Chưa ghép", "Đang giữ"
  "Người Giữ Xe"?: string;
  "Thời Gian Hết Hạn Giữ"?: string; // ISO Date string
  "Vị trí"?: string;
  "Thời gian nhập"?: string; // ISO Date string
  "Ngày vận tải"?: string;
  "Mã DMS"?: string;
  "Số máy"?: string;
  [key: string]: any; // Allow for other properties
}

// Defines the structure for a test drive booking record.
export interface TestDriveBooking {
  soPhieu: string;
  ngayThuXe: string;
  loaiXe: string;
  thoiGianKhoiHanh: string;
  thoiGianTroVe: string;
  tenKhachHang: string;
  loTrinh: string;
  dienThoai: string;
  email: string;
  diaChi: string;
  tuLai: string;
  dacDiem: string;
  gplxSo: string;
  hieuLucGPLX: string;
  ngayCamKet: string;
  tenTuVan: string;
  bienSo?: string;
  gplxHang?: string;
  coSo?: string;
  cmndO?: string;
  cmndNoiCap?: string;
  cmndNgayCap?: string;
  odoBefore?: string;
  imagesBefore?: string; // JSON string of image URLs
  odoAfter?: string;
  imagesAfter?: string; // JSON string of image URLs
  [key: string]: any;
}


export interface SortConfig {
  key: keyof Order;
  direction: 'asc' | 'desc';
}

export interface StockSortConfig {
  key: keyof StockVehicle;
  direction: 'asc' | 'desc';
}

export interface VcSortConfig {
  key: keyof VcRequest;
  direction: 'asc' | 'desc';
}

export interface TestDriveSortConfig {
  key: keyof TestDriveBooking;
  direction: 'asc' | 'desc';
}


export interface AnalyticsData {
  pendingRequestCount: { [key: string]: number };
  stockStatus: { [key: string]: { count: number, isSlowMoving: boolean } };
}

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'danger' | 'stock_hero' | 'broadcast';

export interface Notification {
  id: string;
  message: string;
  timestamp: string; // ISO Date string
  isRead: boolean;
  link?: string;
  targetView?: string;
  targetId?: string;
  type: NotificationType;
}

export type ActionType = 'approve' | 'supplement' | 'pendingSignature' | 'uploadInvoice' | 'cancel' | 'resend' | 'manualMatch' | 'requestInvoice' | 'unmatch' | 'approveVc' | 'rejectVc' | 'vinclub' | 'confirmVc' | 'edit' | 'pair' | 'migrateToDrive' | 'reScan';

export interface LogEntry {
  "Thời gian": string;
  "Hành động": string;
  "Chi tiết": string;
}

export interface ActiveUser {
  email: string;
  fullName?: string;
  lastSeen: string;
}

export type User = { name: string, role: string, username: string };

export interface MaintenanceFee {
  id: string;
  ten_tvbh: string;
  month: number;
  year: number;
  amount: number;
  status: 'pending' | 'paid' | 'exempt';
  paid_at?: string;
  created_at?: string;
  updated_at?: string;
}

export type InquiryStatus = 'pending' | 'auto_found' | 'manual_responded' | 'not_found' | 'held' | 'auto_checking';

export interface CarInquiry {
  id: string;
  created_at: string;
  tvbh_name: string;
  tvbh_email: string;
  model: string;
  version: string;
  exterior_color: string;
  interior_color: string;
  status: InquiryStatus;
  admin_response?: string;
  matched_vin?: string;
  responded_at?: string;
  is_read_by_admin: boolean;
  is_read_by_tvbh: boolean;
  chat_history?: any[];
}

declare global {
  interface Window {
    electronAPI: {
      ping: () => Promise<string>;
      onUpdateAvailable: (callback: (info: any) => void) => void;
      onUpdateDownloaded: (callback: (info: any) => void) => void;
      onDownloadProgress: (callback: (progressObj: any) => void) => void;
      onUpdateError: (callback: (error: string) => void) => void;
      startDownload: () => void;
      quitAndInstall: () => void;
      removeAllListeners: (channel: string) => void;
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
    };
  }
}