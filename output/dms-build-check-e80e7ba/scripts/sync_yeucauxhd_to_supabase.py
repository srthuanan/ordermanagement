"""
sync_yeucauxhd_to_supabase.py
Đọc dữ liệu từ sheet "yeucauxhd" trên Google Sheets rồi push bản ghi MỚI lên Supabase.
Chỉ insert những yêu cầu chưa tồn tại (dựa trên so_don_hang).
"""

import os
import csv
import io
import requests
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# ===== CẤU HÌNH =====
SPREADSHEET_ID = "1CzYUfDAcwt4D64UIZIUC77lZ2lOYQ257xlmVXy2nZG0"
SHEET_NAME = "yeucauxhd"

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL", "https://jwvgxqrkjlbewvpkvucj.supabase.co")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

# Các cột hợp lệ trong bảng yeucauxhd trên Supabase
VALID_COLUMNS = [
    'chinh_sach', 'created_at', 'dong_xe', 'ghi_chu_admin', 'ghi_chu_ai',
    'hoa_hong_ung', 'id', 'ket_qua_gui_mail', 'ngay_coc', 'ngay_xuat_hoa_don',
    'ngay_yeu_cau', 'ngoai_that', 'noi_that', 'phien_ban', 'so_don_hang',
    'so_may', 'ten_khach_hang', 'thoi_gian_can_xe', 'trang_thai_vc', 'tvbh',
    'url_de_nghi_xhd', 'url_hoa_don_da_xuat', 'url_hop_dong', 'vin', 'vpoint'
]

HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
}


def fetch_sheet_data():
    """Đọc dữ liệu từ Google Sheet qua CSV export."""
    url = f"https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet={SHEET_NAME}"
    print(f"📥 Đang tải dữ liệu từ Google Sheet '{SHEET_NAME}'...")
    
    resp = requests.get(url, timeout=30)
    if resp.status_code != 200:
        print(f"❌ Lỗi tải sheet: HTTP {resp.status_code}")
        return []
    
    content = resp.content.decode('utf-8')
    reader = csv.reader(io.StringIO(content))
    rows = list(reader)
    
    if len(rows) < 2:
        print("⚠️ Sheet trống hoặc chỉ có header.")
        return []
    
    headers = rows[0]
    print(f"   📋 Headers từ sheet ({len(headers)} cột): {headers}")
    
    # Ánh xạ tên cột tiếng Việt (từ CUSTOM_CONFIGS trong GAS) sang snake_case DB
    LABEL_TO_KEY = {
        'Số thứ tự': None,  # Bỏ qua, không có trong DB
        'Tên khách hàng': 'ten_khach_hang',
        'Số đơn hàng': 'so_don_hang',
        'Dòng xe': 'dong_xe',
        'Phiên bản': 'phien_ban',
        'Ngoại thất': 'ngoai_that',
        'Nội thất': 'noi_that',
        'TVBH': 'tvbh',
        'Số VIN': 'vin',
        'Số máy': 'so_may',
        'Ngày yêu cầu': 'ngay_yeu_cau',
        'Ngày xuất hóa đơn': 'ngay_xuat_hoa_don',
        'Hoa hồng ứng': 'hoa_hong_ung',
        'V-Point': 'vpoint',
        'Chính sách': 'chinh_sach',
        'Ngày cọc': 'ngay_coc',
        'Hợp đồng': 'url_hop_dong',
        'Đề nghị XHĐ': 'url_de_nghi_xhd',
        'Hóa đơn đã xuất': 'url_hoa_don_da_xuat',
    }
    
    records = []
    for row in rows[1:]:
        obj = {}
        for i, h in enumerate(headers):
            if i >= len(row):
                continue
            
            h_stripped = h.strip()
            val = row[i].strip() if row[i] else ""
            
            # Thử ánh xạ từ tên tiếng Việt trước
            if h_stripped in LABEL_TO_KEY:
                col_name = LABEL_TO_KEY[h_stripped]
                if col_name is None:  # Bỏ qua cột STT
                    continue
            elif h_stripped in VALID_COLUMNS:
                # Header đã là snake_case (khớp trực tiếp)
                col_name = h_stripped
            else:
                # Không nhận dạng được cột → bỏ qua
                continue
            
            if val and col_name in VALID_COLUMNS:
                obj[col_name] = val
        
        # Phải có so_don_hang mới tính là bản ghi hợp lệ
        if obj.get("so_don_hang"):
            records.append(obj)
    
    print(f"   ✅ Đọc được {len(records)} bản ghi từ sheet.")
    return records


def fetch_existing_records():
    """Lấy danh sách so_don_hang đã tồn tại trên Supabase."""
    print("🔍 Đang kiểm tra các yêu cầu XHĐ đã có trên Supabase...")
    
    all_ids = []
    offset = 0
    limit = 1000
    
    while True:
        url = f"{SUPABASE_URL}/rest/v1/yeucauxhd?select=so_don_hang&offset={offset}&limit={limit}"
        resp = requests.get(url, headers=HEADERS, timeout=15)
        
        if resp.status_code != 200:
            print(f"❌ Lỗi fetch Supabase: HTTP {resp.status_code} - {resp.text[:200]}")
            return set()
        
        data = resp.json()
        if not data:
            break
        
        all_ids.extend([r["so_don_hang"] for r in data if r.get("so_don_hang")])
        offset += limit
        
        if len(data) < limit:
            break
    
    print(f"   📊 Supabase hiện có {len(all_ids)} yêu cầu XHĐ.")
    return set(all_ids)


def push_new_records(records, existing_ids):
    """Push các bản ghi mới (chưa có trên Supabase) lên database."""
    new_records = [r for r in records if r["so_don_hang"] not in existing_ids]
    
    if not new_records:
        print("\n🎉 Không có yêu cầu XHĐ mới để đồng bộ. Dữ liệu đã cập nhật!")
        return 0
    
    print(f"\n🚀 Tìm thấy {len(new_records)} yêu cầu XHĐ MỚI. Đang push lên Supabase...")
    
    # Clean up records - loại bỏ trường 'id' để Supabase tự sinh
    for rec in new_records:
        rec.pop("id", None)
        if "created_at" not in rec:
            rec["created_at"] = datetime.now().isoformat()
    
    # PostgREST yêu cầu tất cả objects trong bulk insert phải có cùng keys
    all_keys = set()
    for rec in new_records:
        all_keys.update(rec.keys())
    all_keys.discard("id")
    
    for rec in new_records:
        for key in all_keys:
            if key not in rec:
                rec[key] = None
    
    # Push theo chunks
    CHUNK_SIZE = 50
    total_success = 0
    total_failed = 0
    
    for i in range(0, len(new_records), CHUNK_SIZE):
        chunk = new_records[i:i + CHUNK_SIZE]
        chunk_num = (i // CHUNK_SIZE) + 1
        total_chunks = (len(new_records) + CHUNK_SIZE - 1) // CHUNK_SIZE
        
        url = f"{SUPABASE_URL}/rest/v1/yeucauxhd"
        resp = requests.post(
            url,
            headers={**HEADERS, "Prefer": "return=minimal"},
            json=chunk,
            timeout=30
        )
        
        if 200 <= resp.status_code < 300:
            total_success += len(chunk)
            print(f"   ✅ Chunk {chunk_num}/{total_chunks}: {len(chunk)} bản ghi OK")
        else:
            error_text = resp.text[:300]
            if "23505" in error_text or "already exists" in error_text:
                print(f"   ⚠️ Chunk {chunk_num}: Trùng khóa, thử upsert...")
                resp2 = requests.post(
                    f"{url}?on_conflict=so_don_hang",
                    headers={**HEADERS, "Prefer": "resolution=merge-duplicates"},
                    json=chunk,
                    timeout=30
                )
                if 200 <= resp2.status_code < 300:
                    total_success += len(chunk)
                    print(f"   ✅ Chunk {chunk_num}/{total_chunks}: Upsert {len(chunk)} bản ghi OK")
                else:
                    total_failed += len(chunk)
                    print(f"   ❌ Chunk {chunk_num}: UPSERT thất bại - {resp2.text[:200]}")
            else:
                total_failed += len(chunk)
                print(f"   ❌ Chunk {chunk_num}: Lỗi - {error_text}")
    
    return total_success, total_failed


def main():
    print("=" * 60)
    print("   🔄 ĐỒNG BỘ YEUCAUXHD: Google Sheet → Supabase")
    print("=" * 60)
    print()
    
    if not SUPABASE_SERVICE_KEY:
        print("❌ Thiếu SUPABASE_SERVICE_KEY trong .env!")
        return
    
    # 1. Đọc dữ liệu từ Sheet
    sheet_records = fetch_sheet_data()
    if not sheet_records:
        return
    
    # 2. Lấy danh sách đã có trên Supabase
    existing = fetch_existing_records()
    
    # 3. Push bản ghi mới
    result = push_new_records(sheet_records, existing)
    
    if isinstance(result, tuple):
        success, failed = result
        print()
        print("=" * 60)
        print(f"   📊 KẾT QUẢ: {success} thành công | {failed} thất bại")
        print("=" * 60)
    
    # 4. In danh sách mới push
    new_orders = [r["so_don_hang"] for r in sheet_records if r["so_don_hang"] not in existing]
    if new_orders:
        print(f"\n   📝 Danh sách yêu cầu XHĐ mới đã push:")
        for o in new_orders:
            print(f"      • {o}")


if __name__ == "__main__":
    main()
