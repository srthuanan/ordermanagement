"""
sync_donhang_to_supabase.py
Đọc dữ liệu từ sheet "donhang" trên Google Sheets rồi push bản ghi MỚI lên Supabase.
Chỉ insert những đơn hàng chưa tồn tại (dựa trên so_don_hang).
"""

import os
import csv
import io
import json
import requests
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# ===== CẤU HÌNH =====
SPREADSHEET_ID = "1CzYUfDAcwt4D64UIZIUC77lZ2lOYQ257xlmVXy2nZG0"
SHEET_NAME = "donhang"

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL", "https://jwvgxqrkjlbewvpkvucj.supabase.co")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

# Các cột hợp lệ trong bảng donhang trên Supabase
VALID_COLUMNS = [
    'canh_bao_qua_han', 'canh_bao_sai_dms', 'created_at', 'dong_xe',
    'ghi_chu_huy', 'id', 'ket_qua', 'link_hoa_don_da_xuat', 'ngay_coc',
    'ngay_xuat_hoa_don', 'ngoai_that', 'noi_that', 'phien_ban', 'so_don_hang',
    'so_ngay_ghep', 'ten_khach_hang', 'ten_tu_van_ban_hang', 'thoi_gian_ghep',
    'thoi_gian_huy', 'thoi_gian_nhap', 'trang_thai_vc', 'vin'
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
    print(f"   📋 Headers từ sheet: {headers}")
    
    records = []
    for row in rows[1:]:
        obj = {}
        for i, h in enumerate(headers):
            if i < len(row):
                # Chuẩn hóa tên cột: nếu header đã là snake_case thì dùng luôn
                col_name = h.strip()
                val = row[i].strip() if row[i] else ""
                
                # Chỉ lấy các cột hợp lệ trong DB
                if col_name in VALID_COLUMNS and val:
                    obj[col_name] = val
        
        # Phải có so_don_hang mới tính là bản ghi hợp lệ
        if obj.get("so_don_hang"):
            records.append(obj)
    
    print(f"   ✅ Đọc được {len(records)} bản ghi từ sheet.")
    return records


def fetch_existing_orders():
    """Lấy danh sách so_don_hang đã tồn tại trên Supabase."""
    print("🔍 Đang kiểm tra các đơn hàng đã có trên Supabase...")
    
    all_orders = []
    offset = 0
    limit = 1000
    
    while True:
        url = f"{SUPABASE_URL}/rest/v1/donhang?select=so_don_hang&offset={offset}&limit={limit}"
        resp = requests.get(url, headers=HEADERS, timeout=15)
        
        if resp.status_code != 200:
            print(f"❌ Lỗi fetch Supabase: HTTP {resp.status_code} - {resp.text[:200]}")
            return set()
        
        data = resp.json()
        if not data:
            break
        
        all_orders.extend([r["so_don_hang"] for r in data if r.get("so_don_hang")])
        offset += limit
        
        if len(data) < limit:
            break
    
    print(f"   📊 Supabase hiện có {len(all_orders)} đơn hàng.")
    return set(all_orders)


def push_new_records(records, existing_orders):
    """Push các bản ghi mới (chưa có trên Supabase) lên database."""
    new_records = [r for r in records if r["so_don_hang"] not in existing_orders]
    
    if not new_records:
        print("\n🎉 Không có đơn hàng mới để đồng bộ. Dữ liệu đã cập nhật!")
        return 0
    
    print(f"\n🚀 Tìm thấy {len(new_records)} đơn hàng MỚI. Đang push lên Supabase...")
    
    # Clean up records - loại bỏ trường 'id' để Supabase tự sinh
    for rec in new_records:
        rec.pop("id", None)
        # Xử lý trường created_at nếu không có
        if "created_at" not in rec:
            rec["created_at"] = datetime.now().isoformat()
    
    # QUAN TRỌNG: PostgREST yêu cầu tất cả objects trong bulk insert phải có cùng keys
    # Thu thập tất cả keys xuất hiện rồi chuẩn hóa
    all_keys = set()
    for rec in new_records:
        all_keys.update(rec.keys())
    # Loại bỏ key 'id' khỏi danh sách (để Supabase tự sinh)
    all_keys.discard("id")
    
    for rec in new_records:
        for key in all_keys:
            if key not in rec:
                rec[key] = None
    
    # Push theo chunks để tránh timeout
    CHUNK_SIZE = 50
    total_success = 0
    total_failed = 0
    
    for i in range(0, len(new_records), CHUNK_SIZE):
        chunk = new_records[i:i + CHUNK_SIZE]
        chunk_num = (i // CHUNK_SIZE) + 1
        total_chunks = (len(new_records) + CHUNK_SIZE - 1) // CHUNK_SIZE
        
        url = f"{SUPABASE_URL}/rest/v1/donhang"
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
            # Thử upsert nếu insert thất bại (có thể do trùng khóa)
            if "23505" in error_text or "already exists" in error_text:
                print(f"   ⚠️ Chunk {chunk_num}: Một số bản ghi đã tồn tại, thử upsert...")
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
    print("   🔄 ĐỒNG BỘ DONHANG: Google Sheet → Supabase")
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
    existing = fetch_existing_orders()
    
    # 3. Push bản ghi mới
    result = push_new_records(sheet_records, existing)
    
    if isinstance(result, tuple):
        success, failed = result
        print()
        print("=" * 60)
        print(f"   📊 KẾT QUẢ: {success} thành công | {failed} thất bại")
        print("=" * 60)
    
    # 4. In danh sách đơn hàng mới đã push
    new_orders = [r["so_don_hang"] for r in sheet_records if r["so_don_hang"] not in existing]
    if new_orders:
        print(f"\n   📝 Danh sách đơn hàng mới đã push:")
        for o in new_orders:
            print(f"      • {o}")


if __name__ == "__main__":
    main()
