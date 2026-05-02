"""
check_supabase_data.py
Kiểm tra toàn diện dữ liệu trên Supabase: trùng lặp, xung đột, dữ liệu bất hợp lý.
"""

import os
import requests
from collections import Counter
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
}

issues_found = 0

def fetch_all(table, select="*"):
    """Fetch toàn bộ dữ liệu từ 1 bảng."""
    all_data = []
    offset = 0
    limit = 1000
    while True:
        url = f"{SUPABASE_URL}/rest/v1/{table}?select={select}&offset={offset}&limit={limit}"
        resp = requests.get(url, headers=HEADERS, timeout=15)
        if resp.status_code != 200:
            print(f"  ❌ Lỗi fetch {table}: {resp.status_code}")
            return []
        data = resp.json()
        if not data:
            break
        all_data.extend(data)
        if len(data) < limit:
            break
        offset += limit
    return all_data


def print_header(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def print_issue(msg):
    global issues_found
    issues_found += 1
    print(f"  ⚠️  [{issues_found}] {msg}")


def print_ok(msg):
    print(f"  ✅ {msg}")


def check_donhang(data):
    """Kiểm tra bảng donhang."""
    print_header("🔍 KIỂM TRA BẢNG DONHANG")
    print(f"  📊 Tổng số bản ghi: {len(data)}")
    
    # 1. Trùng lặp so_don_hang
    so_don_hang_list = [r.get("so_don_hang") for r in data if r.get("so_don_hang")]
    dupes = [k for k, v in Counter(so_don_hang_list).items() if v > 1]
    if dupes:
        print_issue(f"TRÙNG LẶP so_don_hang ({len(dupes)} đơn):")
        for d in dupes:
            count = so_don_hang_list.count(d)
            print(f"      • {d} (xuất hiện {count} lần)")
    else:
        print_ok(f"Không trùng lặp so_don_hang ({len(so_don_hang_list)} đơn unique)")
    
    # 2. Thiếu trường bắt buộc
    missing_ten_kh = [r["so_don_hang"] for r in data if not r.get("ten_khach_hang")]
    missing_tvbh = [r["so_don_hang"] for r in data if not r.get("ten_tu_van_ban_hang")]
    missing_sdh = [r for r in data if not r.get("so_don_hang")]
    
    if missing_sdh:
        print_issue(f"CÓ {len(missing_sdh)} bản ghi KHÔNG CÓ số đơn hàng!")
        for r in missing_sdh[:5]:
            print(f"      • id={r.get('id')}, ten_kh={r.get('ten_khach_hang')}")
    else:
        print_ok("Tất cả bản ghi đều có so_don_hang")
    
    if missing_ten_kh:
        print_issue(f"Thiếu tên khách hàng ({len(missing_ten_kh)} đơn):")
        for s in missing_ten_kh[:5]:
            print(f"      • {s}")
        if len(missing_ten_kh) > 5:
            print(f"      ... và {len(missing_ten_kh)-5} đơn khác")
    else:
        print_ok("Tất cả đều có tên khách hàng")
    
    if missing_tvbh:
        print_issue(f"Thiếu TVBH ({len(missing_tvbh)} đơn):")
        for s in missing_tvbh[:5]:
            print(f"      • {s}")
        if len(missing_tvbh) > 5:
            print(f"      ... và {len(missing_tvbh)-5} đơn khác")
    else:
        print_ok("Tất cả đều có TVBH")
    
    # 3. Kiểm tra trạng thái ket_qua hợp lệ
    VALID_KET_QUA = [
        None, '', 'Chưa ghép xe', 'Đã ghép xe', 'Đã xuất hóa đơn', 
        'Đã hủy', 'Đã bổ sung', 'Chờ duyệt'
    ]
    invalid_status = [(r["so_don_hang"], r.get("ket_qua")) for r in data 
                      if r.get("ket_qua") and r["ket_qua"] not in VALID_KET_QUA]
    if invalid_status:
        print_issue(f"Trạng thái ket_qua BẤT THƯỜNG ({len(invalid_status)} đơn):")
        for sdh, kq in invalid_status[:10]:
            print(f"      • {sdh}: '{kq}'")
    else:
        print_ok("Tất cả ket_qua đều hợp lệ")
    
    # 4. Thống kê ket_qua
    kq_counter = Counter(r.get("ket_qua", "(trống)") or "(trống)" for r in data)
    print(f"\n  📈 THỐNG KÊ TRẠNG THÁI:")
    for kq, count in kq_counter.most_common():
        print(f"      • {kq}: {count}")
    
    # 5. Đơn ghép xe nhưng không có VIN
    ghep_no_vin = [r["so_don_hang"] for r in data 
                   if r.get("ket_qua") == "Đã ghép xe" and not r.get("vin")]
    if ghep_no_vin:
        print_issue(f"Đã ghép xe nhưng KHÔNG CÓ VIN ({len(ghep_no_vin)} đơn):")
        for s in ghep_no_vin[:5]:
            print(f"      • {s}")
    else:
        print_ok("Tất cả đơn 'Đã ghép xe' đều có VIN")
    
    # 6. Đơn xuất HĐ nhưng không có VIN
    xhd_no_vin = [r["so_don_hang"] for r in data 
                  if r.get("ket_qua") == "Đã xuất hóa đơn" and not r.get("vin")]
    if xhd_no_vin:
        print_issue(f"Đã xuất HĐ nhưng KHÔNG CÓ VIN ({len(xhd_no_vin)} đơn):")
        for s in xhd_no_vin[:5]:
            print(f"      • {s}")
    else:
        print_ok("Tất cả đơn 'Đã xuất HĐ' đều có VIN")
    
    # 7. Trùng VIN (2 đơn active cùng VIN)
    active_vins = [r.get("vin") for r in data 
                   if r.get("vin") and r.get("ket_qua") not in ("Đã hủy", "Đã xuất hóa đơn")]
    vin_dupes = [k for k, v in Counter(active_vins).items() if v > 1]
    if vin_dupes:
        print_issue(f"TRÙNG VIN trên đơn hàng active ({len(vin_dupes)} VIN):")
        for vin in vin_dupes:
            owners = [r["so_don_hang"] for r in data if r.get("vin") == vin 
                      and r.get("ket_qua") not in ("Đã hủy", "Đã xuất hóa đơn")]
            print(f"      • VIN {vin}: {', '.join(owners)}")
    else:
        print_ok("Không trùng VIN trên các đơn active")
    
    # 8. Dữ liệu ngày tháng bất thường
    import re
    date_issues = []
    for r in data:
        for field in ['ngay_coc', 'ngay_xuat_hoa_don', 'thoi_gian_ghep', 'thoi_gian_nhap']:
            val = r.get(field)
            if val and isinstance(val, str) and val.strip():
                # Kiểm tra xem có phải dạng ISO hoặc date hợp lệ không
                if not re.match(r'^\d{4}-\d{2}-\d{2}', val) and not re.match(r'^\d{2}/\d{2}/\d{4}', val):
                    date_issues.append((r["so_don_hang"], field, val[:50]))
    if date_issues:
        print_issue(f"Ngày tháng ĐỊNH DẠNG LẠ ({len(date_issues)} trường):")
        for sdh, field, val in date_issues[:5]:
            print(f"      • {sdh}.{field} = '{val}'")
    else:
        print_ok("Dữ liệu ngày tháng đều hợp lệ")


def check_yeucauxhd(data, donhang_data):
    """Kiểm tra bảng yeucauxhd."""
    print_header("🔍 KIỂM TRA BẢNG YEUCAUXHD")
    print(f"  📊 Tổng số bản ghi: {len(data)}")
    
    donhang_sdh = set(r.get("so_don_hang") for r in donhang_data if r.get("so_don_hang"))
    
    # 1. Trùng lặp
    sdh_list = [r.get("so_don_hang") for r in data if r.get("so_don_hang")]
    dupes = [k for k, v in Counter(sdh_list).items() if v > 1]
    if dupes:
        print_issue(f"TRÙNG so_don_hang trong yeucauxhd ({len(dupes)}):")
        for d in dupes:
            print(f"      • {d}")
    else:
        print_ok(f"Không trùng lặp ({len(sdh_list)} unique)")
    
    # 2. Yêu cầu XHĐ mồ côi (không có đơn hàng tương ứng)
    orphans = [sdh for sdh in sdh_list if sdh not in donhang_sdh]
    if orphans:
        print_issue(f"YÊU CẦU XHĐ MỒ CÔI - không có đơn hàng tương ứng ({len(orphans)}):")
        for o in orphans:
            print(f"      • {o}")
    else:
        print_ok("Tất cả yêu cầu XHĐ đều có đơn hàng tương ứng")
    
    # 3. Xung đột thông tin giữa donhang và yeucauxhd
    conflicts = []
    for yc in data:
        sdh = yc.get("so_don_hang")
        if not sdh:
            continue
        
        matching_dh = [r for r in donhang_data if r.get("so_don_hang") == sdh]
        if not matching_dh:
            continue
        
        dh = matching_dh[0]
        
        # So sánh các trường chung
        for field_yc, field_dh in [
            ("ten_khach_hang", "ten_khach_hang"),
            ("dong_xe", "dong_xe"),
            ("phien_ban", "phien_ban"),
            ("vin", "vin"),
            ("ngoai_that", "ngoai_that"),
            ("noi_that", "noi_that"),
        ]:
            val_yc = (yc.get(field_yc) or "").strip()
            val_dh = (dh.get(field_dh) or "").strip()
            
            if val_yc and val_dh and val_yc != val_dh:
                conflicts.append((sdh, field_yc, val_yc, val_dh))
    
    if conflicts:
        print_issue(f"XUNG ĐỘT dữ liệu giữa donhang ↔ yeucauxhd ({len(conflicts)} trường):")
        for sdh, field, yc_val, dh_val in conflicts:
            print(f"      • {sdh}.{field}:")
            print(f"        yeucauxhd = '{yc_val}'")
            print(f"        donhang   = '{dh_val}'")
    else:
        print_ok("Dữ liệu nhất quán giữa donhang ↔ yeucauxhd")


def check_khoxe(donhang_data):
    """Kiểm tra bảng khoxe và liên kết với donhang."""
    khoxe_data = fetch_all("khoxe")
    print_header("🔍 KIỂM TRA BẢNG KHOXE")
    print(f"  📊 Tổng số xe trong kho: {len(khoxe_data)}")
    
    # 1. Trùng VIN trong khoxe
    vin_list = [r.get("vin") for r in khoxe_data if r.get("vin")]
    vin_dupes = [k for k, v in Counter(vin_list).items() if v > 1]
    if vin_dupes:
        print_issue(f"TRÙNG VIN trong kho xe ({len(vin_dupes)}):")
        for v in vin_dupes[:5]:
            print(f"      • {v}")
    else:
        print_ok(f"Không trùng VIN ({len(vin_list)} xe)")
    
    # 2. VIN trong donhang mà không có trong khoxe
    khoxe_vins = set(vin_list)
    donhang_vins = set(r.get("vin") for r in donhang_data 
                       if r.get("vin") and r.get("ket_qua") not in ("Đã hủy",))
    orphan_vins = donhang_vins - khoxe_vins - {None, ''}
    if orphan_vins:
        print_issue(f"VIN trong đơn hàng nhưng KHÔNG CÓ trong kho xe ({len(orphan_vins)}):")
        for v in list(orphan_vins)[:5]:
            owners = [r["so_don_hang"] for r in donhang_data if r.get("vin") == v]
            print(f"      • {v} (đơn: {', '.join(owners)})")
        if len(orphan_vins) > 5:
            print(f"      ... và {len(orphan_vins)-5} VIN khác")
    else:
        print_ok("Tất cả VIN trong đơn hàng đều có trong kho xe")


def check_archived_orders(donhang_data):
    """Kiểm tra bảng archived_orders."""
    archived = fetch_all("archived_orders")
    print_header("🔍 KIỂM TRA BẢNG ARCHIVED_ORDERS")
    print(f"  📊 Tổng số đơn đã lưu trữ: {len(archived)}")
    
    if not archived:
        print_ok("Bảng trống, bỏ qua")
        return
    
    # 1. Trùng lặp
    sdh_list = [r.get("so_don_hang") for r in archived if r.get("so_don_hang")]
    dupes = [k for k, v in Counter(sdh_list).items() if v > 1]
    if dupes:
        print_issue(f"TRÙNG so_don_hang trong archived ({len(dupes)}):")
        for d in dupes[:5]:
            print(f"      • {d}")
    else:
        print_ok(f"Không trùng lặp ({len(sdh_list)} unique)")
    
    # 2. Đơn vừa ở donhang vừa ở archived (xung đột)
    donhang_sdh = set(r.get("so_don_hang") for r in donhang_data if r.get("so_don_hang"))
    both = set(sdh_list) & donhang_sdh
    if both:
        print_issue(f"ĐƠN HÀNG TỒN TẠI Ở CẢ 2 BẢNG donhang + archived ({len(both)}):")
        for s in list(both)[:10]:
            dh = next((r for r in donhang_data if r.get("so_don_hang") == s), {})
            ar = next((r for r in archived if r.get("so_don_hang") == s), {})
            print(f"      • {s}: donhang.ket_qua='{dh.get('ket_qua', '')}', archived.ket_qua='{ar.get('ket_qua', '')}'")
    else:
        print_ok("Không xung đột giữa donhang ↔ archived_orders")


def main():
    print()
    print("╔══════════════════════════════════════════════════════════╗")
    print("║     🩺 KIỂM TRA SỨC KHỎE DỮ LIỆU SUPABASE            ║")
    print("╚══════════════════════════════════════════════════════════╝")
    
    if not SUPABASE_SERVICE_KEY:
        print("❌ Thiếu SUPABASE_SERVICE_KEY!")
        return
    
    # Fetch dữ liệu
    print("\n⏳ Đang tải dữ liệu từ Supabase...")
    donhang = fetch_all("donhang")
    yeucauxhd = fetch_all("yeucauxhd")
    print(f"   donhang: {len(donhang)} | yeucauxhd: {len(yeucauxhd)}")
    
    # Chạy kiểm tra
    check_donhang(donhang)
    check_yeucauxhd(yeucauxhd, donhang)
    check_khoxe(donhang)
    check_archived_orders(donhang)
    
    # Tổng kết
    print_header("📋 TỔNG KẾT")
    if issues_found == 0:
        print("  🎉 TUYỆT VỜI! Không phát hiện vấn đề nào!")
    else:
        print(f"  ⚠️ Phát hiện {issues_found} vấn đề cần xem xét.")
    print()


if __name__ == "__main__":
    main()
