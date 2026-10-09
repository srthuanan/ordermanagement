import os
import requests
from dotenv import load_dotenv

load_dotenv()

token = os.environ.get('SUPABASE_ACCESS_TOKEN')
ref = 'jwvgxqrkjlbewvpkvucj'

def run_query(sql):
    resp = requests.post(
        f"https://api.supabase.com/v1/projects/{ref}/database/query",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={"query": sql},
        timeout=30
    )
    return resp.json()

# Kiểm tra 85 đơn tháng 9 và trạng thái TD4 của chúng
sql = """
SELECT 
    a.so_don_hang,
    a.vin,
    a.ten_khach_hang,
    a.tvbh,
    a.ngay_xuat_hoa_don,
    cs.has_td4,
    cs.so_ct_td4,
    k.vi_tri as vi_tri_kho
FROM public.archived_orders a
LEFT JOIN public.cyber_car_status cs ON UPPER(TRIM(cs.vin)) = UPPER(TRIM(a.vin))
LEFT JOIN public.khoxe k ON UPPER(TRIM(k.vin)) = UPPER(TRIM(a.vin))
WHERE a.ngay_xuat_hoa_don::text LIKE '2026-09%'
ORDER BY a.ngay_xuat_hoa_don DESC;
"""

orders = run_query(sql)
print(f"Tổng số đơn tháng 9: {len(orders)}")

no_td4 = []
has_td4 = []

for o in orders:
    if o.get('has_td4') or o.get('so_ct_td4'):
        has_td4.append(o)
    else:
        no_td4.append(o)

print(f"Số đơn ĐÃ CÓ TD4 (Đã giao xe): {len(has_td4)}")
print(f"Số đơn CHƯA CÓ TD4: {len(no_td4)}")

print("\n--- DANH SÁCH ĐƠN THÁNG 9 CHƯA CÓ TD4 ---")
for idx, o in enumerate(no_td4, 1):
    print(f"{idx}. ĐH: {o.get('so_don_hang')} | VIN: {o.get('vin')} | KH: {o.get('ten_khach_hang')} | TVBH: {o.get('tvbh')} | Ngày XHĐ: {o.get('ngay_xuat_hoa_don')} | Kho: {o.get('vi_tri_kho')}")
