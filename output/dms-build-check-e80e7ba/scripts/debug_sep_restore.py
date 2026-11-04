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

# 1. Kiểm tra 41 đơn tháng 9 chưa có TD4, xem chúng có trong donhang không:
sql1 = """
SELECT 
    a.so_don_hang,
    a.vin,
    d.so_don_hang as donhang_so_dh,
    d.ket_qua as donhang_ket_qua,
    d.ngay_xuat_hoa_don as donhang_ngay_xhd
FROM public.archived_orders a
LEFT JOIN public.donhang d ON d.so_don_hang = a.so_don_hang
LEFT JOIN public.cyber_car_status cs ON UPPER(TRIM(cs.vin)) = UPPER(TRIM(a.vin))
WHERE a.ngay_xuat_hoa_don::text LIKE '2026-09%'
  AND (cs.has_td4 IS NOT TRUE AND cs.so_ct_td4 IS NULL)
LIMIT 10;
"""
print("Kết quả kiểm tra:")
for r in run_query(sql1):
    print(r)
