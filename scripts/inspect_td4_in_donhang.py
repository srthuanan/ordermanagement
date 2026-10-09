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

# 1. Kiểm tra cấu trúc các cột hiện tại của bảng donhang
sql_cols = """
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'donhang'
ORDER BY ordinal_position;
"""
print("--- CÁC CỘT TRONG BẢNG DONHANG ---")
cols = [r['column_name'] for r in run_query(sql_cols)]
print(cols)

# 2. Kiểm tra những đơn trong donhang hiện tại xem đơn nào ĐÃ CÓ TD4 trên cyber_car_status
sql_td4 = """
SELECT 
    d.so_don_hang,
    d.vin,
    d.ten_khach_hang,
    d.ngay_xuat_hoa_don,
    d.ket_qua,
    cs.has_td4,
    cs.so_ct_td4,
    cs.has_dnx,
    cs.so_ct_dnx
FROM public.donhang d
LEFT JOIN public.cyber_car_status cs ON UPPER(TRIM(cs.vin)) = UPPER(TRIM(d.vin))
WHERE (cs.has_td4 = true OR (cs.so_ct_td4 IS NOT NULL AND TRIM(cs.so_ct_td4) <> ''));
"""
print("\n--- CÁC ĐƠN TRONG DONHANG ĐANG CÓ TD4 TRÊN CYBER_CAR_STATUS ---")
td4_orders = run_query(sql_td4)
print(f"Số lượng đơn trong donhang đang có TD4: {len(td4_orders)}")
for o in td4_orders:
    print(o)
