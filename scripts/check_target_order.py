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

print("--- KIỂM TRA ĐƠN N31923-VSO-26-09-0189 ---")
sql_donhang = "SELECT so_don_hang, vin, ten_khach_hang, ngay_xuat_hoa_don, ket_qua FROM public.donhang WHERE so_don_hang = 'N31923-VSO-26-09-0189';"
print("Trong donhang:", run_query(sql_donhang))

sql_archived = "SELECT so_don_hang, vin, ten_khach_hang, ngay_xuat_hoa_don, ket_qua FROM public.archived_orders WHERE so_don_hang = 'N31923-VSO-26-09-0189';"
print("Trong archived_orders:", run_query(sql_archived))

sql_cyber = "SELECT vin, ma_kho, ten_kho, has_td4, so_ct_td4, has_dnx, so_ct_dnx FROM public.cyber_car_status WHERE vin = 'RLLVAG8C6TH831671';"
print("Trong cyber_car_status:", run_query(sql_cyber))

sql_khoxe = "SELECT vin, vi_tri FROM public.khoxe WHERE vin = 'RLLVAG8C6TH831671';"
print("Trong khoxe:", run_query(sql_khoxe))
