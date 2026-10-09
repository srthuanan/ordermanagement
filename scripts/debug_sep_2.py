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

# Lấy 5 đơn tháng 9 bất kỳ từ archived_orders
sql = "SELECT so_don_hang, vin, ngay_xuat_hoa_don FROM public.archived_orders WHERE ngay_xuat_hoa_don::text LIKE '2026-09%' LIMIT 5;"
print("Raw archived sep:", run_query(sql))

# Kiểm tra xem các đơn đó có trong donhang không
sql2 = "SELECT so_don_hang, vin, ngay_xuat_hoa_don FROM public.donhang WHERE so_don_hang IN (SELECT so_don_hang FROM public.archived_orders WHERE ngay_xuat_hoa_don::text LIKE '2026-09%');"
print("Donhang sep count:", len(run_query(sql2)))
