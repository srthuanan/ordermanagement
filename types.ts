// FIX: Replaced the entire content of this file which was an incorrect copy of index.tsx.
// This file now contains the centralized type definitions for the application,
// resolving numerous "has no exported member" errors.
export interface Order {
    "Số đơn hàng": string;
    "Tên khách hàng": string;
    "Dòng xe": string;
    "Phiên bản": string;
    "Ngoại thất": string;
    "Nội thất": string;
    "Thời gian nhập": string; // ISO Date string
    "Tên tư vấn bán hàng": string;
    "Kết quả": string; // e.g., "Chưa ghép", "Đã ghép"
    "Trạng thái VC"?: string;
    VIN?: string;
    "Thời gian ghép"?: string; // ISO Date string
    "Ghi chú hủy"?: string;
    LinkHoaDonDaXuat?: string;
    LinkHopDong?: string;
    LinkDeNghiXHD?: string;
    "Số động cơ"?: string;
    "Ngày xuất hóa đơn"?: string;
    "PO PIN"?: string;
    "CHÍNH SÁCH"?: string;
    "Ngày cọc"?: string;
    "BÁO BÁN"?: boolean | string;
    "KẾT QUẢ GỬI MAIL"?: string;
    // other potential fields from components
    [key: string]: any; // Allow for other properties
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
    [key: string]: any; // Allow for other properties
}

export interface VcRequest {
    "Thời gian YC": string;
    "Người YC": string;
    "Tên khách hàng": string;
    "Số đơn hàng": string;
    "VIN": string;
    "Loại KH": 'Cá nhân' | 'Công ty';
    "Mã KH DMS": string;
    "Link CCCD Mặt Trước": string;
    "Link CCCD Mặt Sau": string;
    "Link Cavet Xe Mặt Trước": string;
    "Link Cavet Xe Mặt Sau": string;
    "Link GPKD": string;
    "Trạng thái xử lý": string;
    [key: string]: any;
}


export interface SortConfig {
    key: keyof Order | keyof VcRequest;
    direction: 'asc' | 'desc';
}

export interface StockSortConfig {
    key: keyof StockVehicle;
    direction: 'asc' | 'desc';
}

export interface AnalyticsData {
    pendingRequestCount: { [key: string]: number };
    stockStatus: { [key: string]: { count: number, isSlowMoving: boolean } };
}

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'danger';

export interface Notification {
    id: string;
    message: string;
    timestamp: string; // ISO Date string
    isRead: boolean;
    link?: string;
    type: NotificationType;
}

// FIX: Added ActionType to centralize the definition of possible admin actions.
export type ActionType = 'approve' | 'supplement' | 'pendingSignature' | 'uploadInvoice' | 'cancel' | 'resend' | 'vinclub' | 'manualMatch' | 'requestInvoice' | 'unmatch' | 'approveVc' | 'rejectVc';