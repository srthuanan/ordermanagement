import os
import requests
from dotenv import load_dotenv

load_dotenv()

token = os.environ.get('SUPABASE_ACCESS_TOKEN')
ref = 'jwvgxqrkjlbewvpkvucj'

# Chỉ giữ lại trong donhang:
# 1. Các đơn chưa xuất hóa đơn (ngay_xuat_hoa_don IS NULL)
# 2. Các đơn tháng trước (tháng 09/2026) và tháng hiện tại (tháng 10/2026)
# Toàn bộ các đơn hàng lịch sử cũ trước tháng 09/2026 (năm 2024, 2025, đầu 2026) thuộc về archived_orders, xóa khỏi donhang.

sql = """
WITH deleted AS (
    DELETE FROM public.donhang 
    WHERE ngay_xuat_hoa_don IS NOT NULL 
      AND ngay_xuat_hoa_don < '2026-09-01'::timestamptz
    RETURNING so_don_hang
)
SELECT COUNT(*) as deleted_count FROM deleted;
"""

resp = requests.post(
    f"https://api.supabase.com/v1/projects/{ref}/database/query",
    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    json={"query": sql},
    timeout=30
)

print("Kết quả:", resp.status_code, resp.json())

# Đếm lại số đơn trong donhang hiện tại
sql_count = "SELECT COUNT(*) as total_donhang FROM public.donhang;"
resp_cnt = requests.post(
    f"https://api.supabase.com/v1/projects/{ref}/database/query",
    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    json={"query": sql_count},
    timeout=30
)
print("Số đơn trong donhang hiện tại:", resp_cnt.json())
