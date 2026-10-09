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

# 1. Tìm trong archived_orders và donhang với tên Lê Văn Hoàng hoặc tháng 9
print("--- TÌM THEO TÊN LÊ VĂN HOÀNG ---")
sql1 = "SELECT so_don_hang, vin, ten_khach_hang, ngay_xuat_hoa_don, ket_qua FROM public.archived_orders WHERE LOWER(ten_khach_hang) LIKE '%lê văn hoàng%' OR LOWER(ten_khach_hang) LIKE '%le van hoang%';"
print("Archived:", run_query(sql1))

sql2 = "SELECT so_don_hang, vin, ten_khach_hang, ngay_xuat_hoa_don, ket_qua FROM public.donhang WHERE LOWER(ten_khach_hang) LIKE '%lê văn hoàng%' OR LOWER(ten_khach_hang) LIKE '%le van hoang%';"
print("Donhang:", run_query(sql2))

# 2. Xem các phiếu DNX gần nhất trong interactions
print("\n--- CÁC PHIẾU DNX GẦN NHẤT TRONG INTERACTIONS ---")
sql3 = """
SELECT id, category, actor_name, target_id, metadata->>'so_ct_dnx' as so_ct_dnx, metadata->>'vin' as vin, metadata->>'customer_name' as customer_name, metadata->>'order_number' as order_number, created_at
FROM public.interactions
WHERE category = 'TRANSFER_REQUEST' OR metadata->>'so_ct_dnx' IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
"""
print("DNX interactions:", run_query(sql3))
