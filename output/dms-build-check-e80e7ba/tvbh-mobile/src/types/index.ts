export interface StockVehicle {
  VIN: string;
  vin: string;
  "Dòng xe": string;
  dong_xe: string;
  "Phiên bản": string;
  phien_ban: string;
  "Ngoại thất": string;
  ngoai_that: string;
  "Nội thất": string;
  noi_that: string;
  "Trạng thái": string;
  trang_thai: string; // 'Chưa ghép' | 'Đã ghép' | 'Đang giữ'
  "Người Giữ Xe"?: string | null;
  nguoi_giu_xe?: string | null;
  "Thời Gian Hết Hạn Giữ"?: string | null;
  thoi_gian_het_han_giu?: string | null;
  thoi_gian_giu?: string | null;
  "Vị trí"?: string | null;
  vi_tri?: string | null;
  vi_tri_kho?: string | null;
  so_ngay_ton?: number;
  gia_niem_yet?: number;
  pin_kem_theo?: string | null;
  "Thời gian nhập"?: string | null;
  ngay_nhap?: string | null;
  "Số máy"?: string | null;
  so_may?: string | null;
  "Số COC"?: string | null;
  so_coc?: string | null;
  "Ngày COC về"?: string | null;
  ngay_coc_ve?: string | null;
  queue?: string[];
  telemetry?: {
    lat: number;
    lng: number;
    speed?: number;
    heading?: number;
    captured_at?: string;
  } | null;
}

export interface OrderItem {
  id?: string;
  "Số đơn hàng": string;
  so_don_hang: string;
  "Tên khách hàng": string;
  ten_khach_hang: string;
  "Tên tư vấn bán hàng": string;
  ten_tu_van_ban_hang: string;
  "Dòng xe": string;
  dong_xe: string;
  "Phiên bản": string;
  phien_ban: string;
  "Ngoại thất": string;
  ngoai_that: string;
  "Nội thất": string;
  noi_that: string;
  VIN?: string;
  vin?: string;
  "Kết quả": string;
  ket_qua: string;
  "Ngày cọc"?: string;
  ngay_coc?: string;
  "Thời gian nhập"?: string;
  thoi_gian_nhap?: string;
  "Thời gian ghép"?: string;
  thoi_gian_ghep?: string;
  "Ngày xuất hóa đơn"?: string;
  ngay_xuat_hoa_don?: string;
  "CHÍNH SÁCH"?: string;
  chinh_sach?: string;
  LinkHoaDonDaXuat?: string;
  link_hoa_don_da_xuat?: string;
  LinkHopDong?: string;
  link_hop_dong?: string;
  LinkDeNghiXHD?: string;
  link_de_nghi_xhd?: string;
  ghi_chu_admin?: string;
  "Trạng thái VC"?: string;
  trang_thai_vc?: string;
  "Mã HĐ Cyber"?: string;
  ma_hd_cyber?: string;
  "Số CT DNX"?: string;
  so_ct_dnx?: string;
  "Số CT TD4"?: string;
  so_ct_td4?: string;
  ghi_chu_xuat_xe?: string;
  "Ngày COC về"?: string;
  ngay_coc_ve?: string;
}

export interface InvoiceRequestPayload {
  so_don_hang?: string;
  vin: string;
  dong_xe: string;
  phien_ban: string;
  ngoai_that: string;
  noi_that: string;
  ten_khach_hang: string;
  so_dien_thoai: string;
  cmnd_cccd?: string;
  dia_chi?: string;
  ten_tu_van_ban_hang: string;
  chinh_sach: string[];
  hoa_hong?: string;
  vpoint?: string;
  ghi_chu?: string;
  ma_hd_cyber?: string;
  file_hop_dong_uri?: string;
  file_de_nghi_uri?: string;
  file_unc_uri?: string;
}

export interface UserPermissions {
  isAdmin: boolean;
  isManager: boolean;
  isTvbh: boolean;
  canHoldCar: boolean;
  canRequestInvoice: boolean;
  canViewAllOrders: boolean;
  canViewTeamOrders: boolean;
  canApproveInvoice: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: string;
  manager_id?: string | null;
  is_blocked?: boolean;
  block_reason?: string | null;
  created_at?: string;
  permissions: UserPermissions;
  teamMembers?: string[];
}
