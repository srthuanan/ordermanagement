import os
import requests
from dotenv import load_dotenv

load_dotenv()

token = os.environ.get('SUPABASE_ACCESS_TOKEN')
ref = 'jwvgxqrkjlbewvpkvucj'

def run_query(sql):
    resp = requests.post(
        f'https://api.supabase.com/v1/projects/{ref}/database/query',
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
        json={'query': sql},
        timeout=30
    )
    return resp.json()

q = """
SELECT so_don_hang, vin, ten_khach_hang, ngay_xuat_hoa_don, url_hop_dong, url_de_nghi_xhd, url_hoa_don_da_xuat
FROM public.archived_orders
WHERE ngay_xuat_hoa_don::text LIKE '2026-09%'
LIMIT 10;
"""
print(run_query(q))
