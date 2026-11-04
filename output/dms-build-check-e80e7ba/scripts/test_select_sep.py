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

# Test 1: Đếm trong archived_orders với điều kiện ngày
sql1 = "SELECT count(*) FROM public.archived_orders WHERE ngay_xuat_hoa_don::text LIKE '2026-09%';"
print("1. Đơn tháng 9:", run_query(sql1))

# Test 2: Thêm LEFT JOIN cyber_car_status
sql2 = """
SELECT count(*) 
FROM public.archived_orders a
LEFT JOIN public.cyber_car_status cs ON UPPER(TRIM(cs.vin)) = UPPER(TRIM(a.vin))
WHERE a.ngay_xuat_hoa_don::text LIKE '2026-09%'
  AND (cs.has_td4 IS NOT TRUE OR cs.has_td4 IS NULL)
  AND (cs.so_ct_td4 IS NULL OR TRIM(cs.so_ct_td4) = '');
"""
print("2. Đơn tháng 9 chưa có TD4:", run_query(sql2))

# Test 3: Lấy danh sách 41 đơn này
sql3 = """
SELECT a.so_don_hang, a.vin, a.ten_khach_hang, a.ngay_xuat_hoa_don
FROM public.archived_orders a
LEFT JOIN public.cyber_car_status cs ON UPPER(TRIM(cs.vin)) = UPPER(TRIM(a.vin))
WHERE a.ngay_xuat_hoa_don::text LIKE '2026-09%'
  AND (cs.has_td4 IS NOT TRUE OR cs.has_td4 IS NULL)
  AND (cs.so_ct_td4 IS NULL OR TRIM(cs.so_ct_td4) = '')
LIMIT 5;
"""
print("3. Mẫu 5 đơn:", run_query(sql3))
