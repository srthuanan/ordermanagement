import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("VITE_SUPABASE_URL")
anon_key = os.getenv("VITE_SUPABASE_ANON_KEY")

headers = {
    "apikey": anon_key,
    "Authorization": f"Bearer {anon_key}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

print("=== KIỂM TRA BẢO MẬT KHO XE (RLS) BẰNG PYTHON ===")

# 1. Test GET (Xem) - Nên thành công
print("\n1. Đang thử lấy dữ liệu kho xe (Không đăng nhập)...")
try:
    res = requests.get(f"{url}/rest/v1/khoxe?select=id&limit=1", headers=headers)
    if res.status_code == 200:
        print("✅ THÀNH CÔNG: Lấy dữ liệu kho xe thành công (Phù hợp với Policy 3 - Xem).")
    else:
        print(f"❌ THẤT BẠI: {res.status_code} - {res.text}")
except Exception as e:
    print(f"Lỗi: {e}")

# 2. Test POST (Thêm xe) - Nên thất bại
print("\n2. Đang thử chèn 1 xe giả vào kho xe (Không đăng nhập)...")
try:
    payload = {"Số khung": "FAKE_VIN_123", "Màu xe": "Đỏ", "Dòng xe": "VF8"}
    res = requests.post(f"{url}/rest/v1/khoxe", headers=headers, json=payload)
    if res.status_code in [401, 403, 404]:
        print(f"✅ BỊ CHẶN: Hệ thống ĐÃ CHẶN hành động thêm xe giả (HTTP {res.status_code}). RLS hoạt động tốt!")
    else:
        print(f"❌ NGUY HIỂM: Thêm xe thành công hoặc lỗi không mong đợi. Status: {res.status_code}, Response: {res.text}")
except Exception as e:
    print(f"Lỗi: {e}")

# 3. Test PATCH (Cập nhật trạng thái) - Nên thất bại
print("\n3. Đang thử cập nhật (Giữ xe) một xe bất kỳ (Không đăng nhập)...")
try:
    payload = {"Trạng thái": "Đang giữ"}
    # Thử update 1 dòng bất kỳ
    res = requests.patch(f"{url}/rest/v1/khoxe?limit=1", headers=headers, json=payload)
    if res.status_code in [401, 403, 404]: # 404 có thể xảy ra nếu RLS chặn dòng đó
        print(f"✅ BỊ CHẶN: Hệ thống ĐÃ CHẶN hành động sửa thông tin (HTTP {res.status_code}). RLS hoạt động tốt!")
    else:
        print(f"❌ NGUY HIỂM: Sửa xe thành công hoặc lỗi không mong đợi. Status: {res.status_code}, Response: {res.text}")
except Exception as e:
    print(f"Lỗi: {e}")

print("\nKẾT LUẬN: Nếu các hành động chèn/sửa bị chặn, nghĩa là hệ thống bảo mật RLS đã hoạt động đúng như thiết kế.")
