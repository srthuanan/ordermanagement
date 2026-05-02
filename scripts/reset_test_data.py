import os
import requests
import json
from datetime import datetime

# Cấu hình Supabase
SUPABASE_URL = "https://jwvgxqrkjlbewvpkvucj.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dmd4cXJramxiZXd2cGt2dWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNTUyNywiZXhwIjoyMDg4MTAxNTI3fQ.R8XaLf9RuB9ICMM3Uti4faIOgN0Beui9pxh-Vy-t4rU"

headers = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json"
}

# 1. Xóa dữ liệu cũ
print("🧹 Đang xóa dữ liệu cũ...")
# Xóa trong yeucauxhd trước (do có thể có ràng buộc)
res_del_xhd = requests.delete(f"{SUPABASE_URL}/rest/v1/yeucauxhd?so_don_hang=ilike.N31920-VSO-26-44-111%", headers=headers)
res_del_dh = requests.delete(f"{SUPABASE_URL}/rest/v1/donhang?so_don_hang=ilike.N31920-VSO-26-44-111%", headers=headers)

if res_del_dh.status_code in [200, 201, 204]:
    print("✅ Đã dọn dẹp Database.")
else:
    print(f"⚠️ Lỗi dọn dẹp: {res_del_dh.status_code}")

# 2. Xóa file PDF cũ
if os.path.exists('pdf'):
    for f in os.listdir('pdf'):
        if f.startswith('N31920-VSO-26-44-111'):
            os.remove(os.path.join('pdf', f))
    print("✅ Đã dọn dẹp thư mục pdf/.")

# 3. Tạo lại dữ liệu mới
ADVISOR_NAME = "PHẠM THÀNH NHÂN"
STATUS = "Chờ ký hóa đơn"
orders_dh = []
orders_xhd = []

print(f"🚀 Đang tạo lại 6 đơn hàng mẫu mới...")
for i in range(1, 7):
    order_id = f"N31920-VSO-26-44-111{i}"
    now = datetime.now().isoformat()
    
    orders_dh.append({
        "so_don_hang": order_id,
        "ten_khach_hang": f"Khách hàng Mẫu {i}",
        "ten_tu_van_ban_hang": ADVISOR_NAME,
        "ma_dms": f"DMS-{3000+i}",
        "dong_xe": "VF 7",
        "phien_ban": "Plus",
        "ngoai_that": "Đỏ (Crimson Red)",
        "noi_that": "Đen",
        "ket_qua": STATUS,
        "vin": f"VIN26NEW{i:03d}",
        "so_may": f"ENG26NEW{i:03d}",
        "thoi_gian_nhap": now
    })
    
    orders_xhd.append({
        "so_don_hang": order_id,
        "ten_khach_hang": f"Khách hàng Mẫu {i}",
        "tvbh": ADVISOR_NAME,
        "ma_dms": f"DMS-{3000+i}",
        "dong_xe": "VF 7",
        "phien_ban": "Plus",
        "ngoai_that": "Đỏ (Crimson Red)",
        "noi_that": "Đen",
        "vin": f"VIN26NEW{i:03d}",
        "so_may": f"ENG26NEW{i:03d}",
        "ngay_yeu_cau": now,
        "url_hop_dong": "https://placehold.co/400",
        "url_de_nghi_xhd": "https://placehold.co/400"
    })
    
    # Tạo lại file PDF luôn
    pdf_name = f"pdf/{order_id}.pdf"
    os.makedirs('pdf', exist_ok=True)
    with open(pdf_name, 'wb') as f:
        f.write(b'%PDF-1.1\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 24 Tf 100 700 Td (Verified Invoice {i}) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000062 00000 n\n0000000109 00000 n\n0000000189 00000 n\ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n291\n%%EOF')

# Chèn lại Database
requests.post(f"{SUPABASE_URL}/rest/v1/donhang", headers=headers, data=json.dumps(orders_dh))
requests.post(f"{SUPABASE_URL}/rest/v1/yeucauxhd", headers=headers, data=json.dumps(orders_xhd))

print("✨ Hoàn tất! Dữ liệu đã sạch và sẵn sàng để test lại.")
