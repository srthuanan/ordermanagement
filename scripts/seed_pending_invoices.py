import os
import requests
import json
from datetime import datetime

# Cấu hình kết nối Supabase
SUPABASE_URL = "https://jwvgxqrkjlbewvpkvucj.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU"

headers = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

ADVISOR_NAME = "PHẠM THÀNH NHÂN"
STATUS = "Chờ ký hóa đơn"

orders_dh = []
orders_xhd = []

# Định dạng mới: N31920-VSO-26-44-1111
for i in range(1, 7):
    # N31920-VSO-26-44-1111, 1112, ...
    order_id = f"N31920-VSO-26-44-{1110+i}"
    now = datetime.now().isoformat()
    
    orders_dh.append({
        "so_don_hang": order_id,
        "ten_khach_hang": f"Khách hàng Mẫu {i}",
        "ten_tu_van_ban_hang": ADVISOR_NAME,
        "ma_dms": f"DMS-{2000+i}",
        "dong_xe": "VF 9",
        "phien_ban": "Plus",
        "ngoai_that": "Xanh (Deep Ocean)",
        "noi_that": "Nâu",
        "ket_qua": STATUS,
        "vin": f"VIN26{i:05d}",
        "so_may": f"ENG26{i:05d}",
        "thoi_gian_nhap": now
    })
    
    orders_xhd.append({
        "so_don_hang": order_id,
        "ten_khach_hang": f"Khách hàng Mẫu {i}",
        "tvbh": ADVISOR_NAME,
        "ma_dms": f"DMS-{2000+i}",
        "dong_xe": "VF 9",
        "phien_ban": "Plus",
        "ngoai_that": "Xanh (Deep Ocean)",
        "noi_that": "Nâu",
        "vin": f"VIN26{i:05d}",
        "so_may": f"ENG26{i:05d}",
        "ngay_yeu_cau": now,
        "url_hop_dong": "https://placehold.co/400",
        "url_de_nghi_xhd": "https://placehold.co/400"
    })

print(f"🚀 Đang cập nhật 6 đơn hàng mẫu với định dạng mới: N31920-VSO-26-44-1111...")

# Sử dụng upsert (on_conflict=so_don_hang) để tránh trùng lặp nếu chạy lại
res_dh = requests.post(f"{SUPABASE_URL}/rest/v1/donhang", headers={**headers, "Prefer": "resolution=merge-duplicates"}, data=json.dumps(orders_dh))
res_xhd = requests.post(f"{SUPABASE_URL}/rest/v1/yeucauxhd", headers={**headers, "Prefer": "resolution=merge-duplicates"}, data=json.dumps(orders_xhd))

if res_dh.status_code in [200, 201, 204] and res_xhd.status_code in [200, 201, 204]:
    print("✅ Đã tạo/Cập nhật thành công 6 đơn hàng với định dạng mới.")
else:
    print(f"❌ Lỗi: DH({res_dh.status_code}), XHD({res_xhd.status_code})")
    print(res_dh.text)

print("\n✨ Done!")
