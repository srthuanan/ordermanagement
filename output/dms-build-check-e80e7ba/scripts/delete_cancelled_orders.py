import os
import requests
from dotenv import load_dotenv

load_dotenv()

token = os.environ.get('SUPABASE_ACCESS_TOKEN')
ref = 'jwvgxqrkjlbewvpkvucj'

sql = """
WITH deleted AS (
    DELETE FROM public.donhang 
    WHERE ket_qua ILIKE 'Đã hủy%'
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

print("Kết quả xóa đơn đã hủy:", resp.status_code, resp.json())

# Đếm lại tổng đơn trong bảng donhang
sql_check = "SELECT COUNT(*) as total_active FROM public.donhang;"
resp_chk = requests.post(
    f"https://api.supabase.com/v1/projects/{ref}/database/query",
    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    json={"query": sql_check},
    timeout=30
)
print("Tổng đơn hàng hiện tại trong donhang:", resp_chk.json())
