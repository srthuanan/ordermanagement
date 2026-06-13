import sys

file_path = "c:\\Users\\USER\\Documents\\ordermanagement\\vf-kim-son-trang-dai\\src\\services\\apiService.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# I will replace the whole mapOrderRow function safely
start_idx = content.find('export function mapOrderRow')
end_idx = content.find('  };\n}', start_idx) + 6

if start_idx == -1 or end_idx == -1:
    print("Could not find mapOrderRow")
    sys.exit(1)

new_func = """export function mapOrderRow(row: DonhangRow, customerMap: Map<string, CustomerRow>): Order {
  const customer = customerMap.get(row.ten_khach_hang.toLowerCase());
  const normalized = row.ket_qua.trim().toLowerCase();
  const status: Order['status'] = normalized.includes('hủy')
    ? 'Đã hủy'
    : normalized.includes('xuất hóa đơn')
      ? 'Đã xuất hóa đơn'
      : normalized.includes('chờ phê duyệt')
        ? 'Chờ phê duyệt'
        : normalized.includes('đã phê duyệt')
          ? 'Đã phê duyệt'
          : normalized.includes('yêu cầu bổ sung')
            ? 'Yêu cầu bổ sung'
            : normalized.includes('đã bổ sung')
              ? 'Đã bổ sung'
              : normalized.includes('chờ ký hóa đơn')
                ? 'Chờ ký hóa đơn'
                : normalized.includes('đã ghép')
                  ? 'Đã ghép'
                  : 'Chưa ghép';

  const isWarning = (() => {
    if (status === 'Đã ghép' && row.thoi_gian_ghep) {
      const pairedTime = new Date(row.thoi_gian_ghep).getTime();
      const now = new Date().getTime();
      const diffDays = Math.floor((now - pairedTime) / (1000 * 60 * 60 * 24));
      return diffDays >= 3;
    }
    return false;
  })();

  const warningMessage = (() => {
    if (status === 'Đã ghép' && row.thoi_gian_ghep) {
      const pairedTime = new Date(row.thoi_gian_ghep).getTime();
      const now = new Date().getTime();
      const diffDays = Math.floor((now - pairedTime) / (1000 * 60 * 60 * 24));
      if (diffDays >= 3) {
        return `Đã phân bổ xe ${diffDays} ngày chưa có động thái XHĐ!`;
      }
    }
    return undefined;
  })();

  return {
    id: row.so_don_hang,
    customer: row.ten_khach_hang,
    phone: customer?.phone ?? 'Chưa có SĐT',
    area: customer?.area ?? 'Chưa có khu vực',
    line: row.dong_xe,
    version: row.phien_ban || row.dong_xe,
    exterior: row.ngoai_that || 'Chưa có màu',
    interior: row.noi_that || 'Chưa có nội thất',
    staff: row.ten_tu_van_ban_hang,
    status,
    vin: row.vin ?? '',
    createdAt: formatLocalDateTime(new Date(row.thoi_gian_nhap)),
    depositDate: row.ngay_coc ? new Intl.DateTimeFormat('vi-VN').format(new Date(row.ngay_coc)) : 'Chưa có',
    needDate: row.thoi_gian_can_xe ? new Intl.DateTimeFormat('vi-VN').format(new Date(row.thoi_gian_can_xe)) : 'Chưa có',
    needDateIso: row.thoi_gian_can_xe ?? null,
    pairedAt: row.thoi_gian_ghep ? formatLocalDateTime(new Date(row.thoi_gian_ghep)) : 'Chưa ghép',
    policy: row.chinh_sach ?? '',
    cancelNote: row.ghi_chu_huy ?? '',
    engineNo: row.so_may ?? '',
    depositAmount: row.so_tien_coc ?? row.so_tien_khach_da_dong ?? null,
    soTienKhachDaDong: row.so_tien_khach_da_dong ?? row.so_tien_coc ?? null,
    ngayKyHopDong: row.ngay_ky_hop_dong ?? null,
    invoiceAddress: row.dia_chi ?? null,
    contractCode: row.so_hop_dong ?? null,
    paymentMethod: row.hinh_thuc_tt ?? null,
    linkHopDong: row.link_hop_dong ?? null,
    linkDeNghiXhd: row.link_de_nghi_xhd ?? null,
    linkHoaDonDaXuat: row.link_hoa_don_da_xuat ?? null,
    nguonKhach: row.nguon_khach ?? null,
    muaBaoHiem: row.mua_bao_hiem ?? null,
    dangKyXe: row.dang_ky_xe ?? null,
    xeXangVin: row.xe_xang_vin ?? null,
    xeXangHang: row.xe_xang_hang ?? null,
    xeXangModel: row.xe_xang_model ?? null,
    giaCongBo: row.gia_cong_bo ?? null,
    isWarning,
    warningMessage
  };
}"""

new_content = content[:start_idx] + new_func + content[end_idx:]

with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_content)

print("mapOrderRow rewritten successfully.")
