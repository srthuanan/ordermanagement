import json

with open("scripts/vinclub_full_details.json", "r", encoding="utf-8") as f:
    data = json.load(f)

yeucau_list = data.get("yeucauvc_list", [])

approved = [y for y in yeucau_list if y.get("trang_thai_xu_ly") == "Đã phê duyệt"]
rejected = [y for y in yeucau_list if y.get("trang_thai_xu_ly") == "Từ chối ycvc"]

print(f"=== DANH SÁCH {len(approved)} KHÁCH HÀNG / ĐƠN HÀNG ĐÃ ĐƯỢC PHÊ DUYỆT VINCLUB ===")
for idx, item in enumerate(approved, 1):
    so_dh = item.get("so_don_hang") or "N/A"
    ten_kh = item.get("ten_khach_hang") or "N/A"
    ma_dms = item.get("ma_kh_dms") or "N/A"
    nguoi_yc = item.get("nguoi_yc") or "N/A"
    tg_yc = item.get("thoi_gian_yc") or "N/A"
    loai_yc = item.get("loai_yc") or "N/A"
    ghi_chu = item.get("ghi_chu") or ""
    vin = item.get("vin") or "N/A"
    print(f"{idx:02d}. Đơn hàng: {so_dh} | KH: {ten_kh} | Mã DMS: {ma_dms} | Loại YC: {loai_yc} | Người YC: {nguoi_yc} | Ngày: {tg_yc} | VIN: {vin}")

print(f"\n=== DANH SÁCH {len(rejected)} YÊU CẦU TỪ CHỐI / GỠ VINCLUB ===")
for idx, item in enumerate(rejected, 1):
    so_dh = item.get("so_don_hang") or "N/A"
    ten_kh = item.get("ten_khach_hang") or "N/A"
    ma_dms = item.get("ma_kh_dms") or "N/A"
    ghi_chu = item.get("ghi_chu") or ""
    print(f"{idx:02d}. Đơn hàng: {so_dh} | KH: {ten_kh} | Mã DMS: {ma_dms} | Ghi chú: {ghi_chu}")
