

export interface Order {
  "Tên tư vấn bán hàng": string;
  "Tên khách hàng": string;
  "Số đơn hàng": string;
  "Dòng xe": string;
  "Phiên bản": string;
  "Ngoại thất": string;
  "Nội thất": string;
  "Ngày cọc": string;
  "Thời gian nhập": string;
  "Kết quả": string;
  "VIN": string;
  "Thời gian ghép": string;
  "Số ngày ghép": number;
  "LinkHoaDonDaXuat"?: string;
  "Trạng thái VC"?: string;
  "Ghi chú hủy"?: string;
  "LinkHopDong"?: string;
  "LinkDeNghiXHD"?: string;
}

export interface StockVehicle {
  "VIN": string;
  "Dòng xe": string;
  "Phiên bản": string;
  "Ngoại thất": string;
  "Nội thất": string;
  "Trạng thái": "Chưa ghép" | "Đang giữ" | "Xe trưng bày";
  "Ngày về kho": string;
  "Vị trí": string;
  "Người Giữ Xe"?: string;
  "Thời Gian Giữ Xe"?: string;
  "Thời Gian Hết Hạn Giữ"?: string;
}

export interface AnalyticsData {
  pendingRequestCount: Record<string, number>;
  stockStatus: Record<string, { count: number; isSlowMoving: boolean }>;
}

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  key: keyof Order;
  direction: SortDirection;
}

export interface StockSortConfig {
  key: keyof StockVehicle;
  direction: SortDirection;
}


export type NotificationType = 'success' | 'info' | 'warning' | 'error' | 'danger';

export interface Notification {
  id: string;
  message: string;
  timestamp: string;
  type: NotificationType;
  link?: string;
  isRead: boolean;
}