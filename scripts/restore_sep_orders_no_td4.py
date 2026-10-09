import os
import requests
from dotenv import load_dotenv

load_dotenv()

token = os.environ.get('SUPABASE_ACCESS_TOKEN')
ref = 'jwvgxqrkjlbewvpkvucj'

sql = """
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
    LEFT JOIN public.donhang d ON d.so_don_hang = a.so_don_hang
    LEFT JOIN public.cyber_car_status cs ON UPPER(TRIM(cs.vin)) = UPPER(TRIM(a.vin))
    WHERE a.ngay_xuat_hoa_don::text LIKE '2026-09%'
      AND (cs.has_td4 IS NOT TRUE AND cs.so_ct_td4 IS NULL)
      AND d.so_don_hang IS NULL
    ON CONFLICT (so_don_hang) DO NOTHING
    RETURNING so_don_hang
)
SELECT COUNT(*) as restored_count FROM inserted;
"""

resp = requests.post(
    f"https://api.supabase.com/v1/projects/{ref}/database/query",
    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    json={"query": sql},
    timeout=30
)

print("Kết quả khôi phục đơn tháng 9 chưa có TD4:", resp.status_code, resp.json())

# Đếm lại tổng đơn trong donhang
sql_check = "SELECT COUNT(*) as total_active FROM public.donhang;"
resp_chk = requests.post(
    f"https://api.supabase.com/v1/projects/{ref}/database/query",
    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    json={"query": sql_check},
    timeout=30
)
print("Tổng đơn hàng hiện tại trong donhang:", resp_chk.json())
