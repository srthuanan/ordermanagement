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

# Kiểm tra xem còn đơn hàng nào trong archived_orders mà chưa có TD4 nhưng đang thiếu trong donhang không:
sql = """
SELECT 
    a.so_don_hang,
    a.vin,
    a.ten_khach_hang,
    a.ngay_xuat_hoa_don,
    cs.has_td4,
    cs.so_ct_td4
FROM public.archived_orders a
LEFT JOIN public.donhang d ON d.so_don_hang = a.so_don_hang
LEFT JOIN public.cyber_car_status cs ON UPPER(TRIM(cs.vin)) = UPPER(TRIM(a.vin))
WHERE d.so_don_hang IS NULL
  AND a.ngay_xuat_hoa_don::text LIKE '2026-09%'
  AND (cs.has_td4 IS NOT TRUE AND (cs.so_ct_td4 IS NULL OR TRIM(cs.so_ct_td4) = ''));
"""

res = run_query(sql)
print("Số đơn tháng 9 chưa có TD4 nhưng bị thiếu trong donhang:", len(res))
for r in res:
    print(r)
