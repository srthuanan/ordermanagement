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

# 1. Kiểm tra đơn tháng 9 trong archived_orders
sql_archive_sep = """
SELECT so_don_hang, vin, ten_khach_hang, tvbh, ngay_xuat_hoa_don, ket_qua
FROM public.archived_orders
WHERE (ngay_xuat_hoa_don::text LIKE '2026-09%' OR ngay_xuat_hoa_don::text LIKE '%/09/2026%')
LIMIT 20;
"""
print("=== 1. ĐƠN THÁNG 9 TRONG archived_orders ===")
data_sep = run_query(sql_archive_sep)
print(f"Số lượng tìm thấy: {len(data_sep) if isinstance(data_sep, list) else data_sep}")
if isinstance(data_sep, list):
    for r in data_sep[:5]:
        print(r)

# 2. Kiểm tra tổng số đơn theo tháng trong archived_orders năm 2026
sql_months = """
SELECT substring(ngay_xuat_hoa_don::text from 1 for 7) as thang, count(*) 
FROM public.archived_orders 
WHERE ngay_xuat_hoa_don::text LIKE '2026-%'
GROUP BY thang
ORDER BY thang;
"""
print("\n=== 2. THỐNG KÊ CÁC THÁNG 2026 TRONG archived_orders ===")
print(run_query(sql_months))

# 3. Kiểm tra đơn tháng 9 trong yeucauxhd
sql_yeucau_sep = """
SELECT so_don_hang, vin, ten_khach_hang, tvbh, ngay_xuat_hoa_don, trang_thai
FROM public.yeucauxhd
WHERE (ngay_xuat_hoa_don::text LIKE '2026-09%' OR ngay_xuat_hoa_don::text LIKE '%/09/2026%')
LIMIT 20;
"""
print("\n=== 3. ĐƠN THÁNG 9 TRONG yeucauxhd ===")
data_yc = run_query(sql_yeucau_sep)
print(f"Số lượng tìm thấy: {len(data_yc) if isinstance(data_yc, list) else data_yc}")
