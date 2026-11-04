import os
import requests
from dotenv import load_dotenv

# Load biến môi trường từ file .env
load_dotenv('.env')

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("REST API: Lỗi - Thiếu VITE_SUPABASE_URL hoặc SUPABASE_SERVICE_KEY trong .env")
    exit(1)

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

print("Đang tải dữ liệu từ yeucauxhd...")
response = requests.get(f"{SUPABASE_URL}/rest/v1/yeucauxhd?select=so_don_hang,chinh_sach", headers=headers)

if response.status_code >= 400:
    print(f"Lỗi truy vấn: {response.text}")
    import sys
    sys.exit(1)

rows = response.json()
print(f"Tìm thấy {len(rows)} bản ghi.")

count_updated = 0

for row in rows:
    so_don_hang = row.get("so_don_hang")
    chinh_sach = row.get("chinh_sach") or ""
    
    if not chinh_sach:
        continue
    
    # Tìm xem có chứa AI note không
    markers = ["⚠️", "✅", "🚨", "ℹ️"]
    first_idx = -1
    for m in markers:
        idx = chinh_sach.find(m)
        if idx != -1:
            if first_idx == -1 or idx < first_idx:
                first_idx = idx
                
    if first_idx != -1:
        # Tách chính sách thành 2 phần
        clean_policy = chinh_sach[:first_idx].strip()
        # Loại bỏ dấu phẩy ở cuối nếu có
        if clean_policy.endswith(','):
            clean_policy = clean_policy[:-1].strip()
            
        ai_note = chinh_sach[first_idx:].strip()
        
        print(f"\n[{so_don_hang}] Phát hiện ghi chú AI!")
        print(f"  - Chính sách cũ: {chinh_sach}")
        print(f"  - Chính sách mới: {clean_policy}")
        print(f"  - Ghi chú AI mới: {ai_note}")
        
        # Gọi API PATCH để cập nhật
        patch_data = {
            "chinh_sach": clean_policy,
            "ghi_chu_ai": ai_note
        }
        
        patch_resp = requests.patch(
            f"{SUPABASE_URL}/rest/v1/yeucauxhd?so_don_hang=eq.{so_don_hang}",
            headers=headers,
            json=patch_data
        )
        if patch_resp.status_code >= 400:
            print(f"  -> LỖI CẬP NHẬT: {patch_resp.text}")
            if "Could not find the 'ghi_chu_ai'" in patch_resp.text:
                print("  => Vui lòng CHẠY LỆNH SQL THÊM CỘT `ghi_chu_ai` vào database trước khi tiếp tục!")
                break
        else:
            print("  -> CẬP NHẬT THÀNH CÔNG")
            count_updated += 1
            
print(f"\nĐã hoàn thành! (Cập nhật {count_updated} bản ghi)")
