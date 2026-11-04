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

sql_insert = """
WITH inserted AS (
    INSERT INTO public.donhang (
        so_don_hang, ten_khach_hang, dong_xe, phien_ban, ngoai_that, noi_that,
        ten_tu_van_ban_hang, vin, so_may, ma_dms, ngay_coc, ngay_xuat_hoa_don,
        chinh_sach, ket_qua, link_hoa_don_da_xuat, trang_thai_vc, created_at
    )
    SELECT 
        a.so_don_hang, a.ten_khach_hang, a.dong_xe, a.phien_ban, a.ngoai_that, a.noi_that,
        a.tvbh, a.vin, a.so_may, a.ma_dms,
        CASE WHEN a.ngay_coc IS NOT NULL THEN a.ngay_coc::text ELSE NULL END,
        a.ngay_xuat_hoa_don::timestamptz,
        a.chinh_sach,
        'Đã xuất hóa đơn',
        a.url_hoa_don_da_xuat,
        a.trang_thai_vc,
        a.created_at
    FROM public.archived_orders a
    LEFT JOIN public.cyber_car_status cs ON UPPER(TRIM(cs.vin)) = UPPER(TRIM(a.vin))
    WHERE a.ngay_xuat_hoa_don::text LIKE '2026-09%'
      AND (cs.has_td4 IS NOT TRUE OR cs.has_td4 IS NULL)
      AND (cs.so_ct_td4 IS NULL OR TRIM(cs.so_ct_td4) = '')
    ON CONFLICT (so_don_hang) DO UPDATE SET
        ket_qua = 'Đã xuất hóa đơn',
        ngay_xuat_hoa_don = EXCLUDED.ngay_xuat_hoa_don,
        vin = EXCLUDED.vin,
        so_may = EXCLUDED.so_may,
        ma_dms = EXCLUDED.ma_dms
    RETURNING so_don_hang
)
SELECT count(*) as total_restored FROM inserted;
"""

res = run_query(sql_insert)
print("Kết quả insert vào donhang:", res)

# Đếm lại tổng đơn trong donhang
sql_total = "SELECT count(*) as total_donhang FROM public.donhang;"
print("Tổng đơn trong donhang hiện tại:", run_query(sql_total))

# Đếm đơn theo trạng thái
sql_by_status = "SELECT ket_qua, count(*) FROM public.donhang GROUP BY ket_qua ORDER BY count(*) DESC;"
print("Thống kê theo trạng thái:", run_query(sql_by_status))
