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
    if resp.status_code >= 400:
        raise Exception(f"HTTP {resp.status_code}: {resp.text}")
    return resp.json()

print("--- KHÔI PHỤC ĐƠN HÀNG THÁNG 9 CHƯA CÓ TD4 (XỬ LÝ CẢ EMPTY STRING '') ---")
sql_restore = """
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
    WHERE d.so_don_hang IS NULL
      AND a.ngay_xuat_hoa_don::text LIKE '2026-09%'
      AND (cs.has_td4 IS NOT TRUE AND (cs.so_ct_td4 IS NULL OR TRIM(cs.so_ct_td4) = ''))
    ON CONFLICT (so_don_hang) DO NOTHING
    RETURNING so_don_hang, vin, ten_khach_hang, ten_tu_van_ban_hang
)
SELECT * FROM inserted;
"""

res = run_query(sql_restore)
print(f"Số lượng đơn vừa được khôi phục: {len(res)}")
for r in res:
    print(" ->", r)

sql_check_target = """
SELECT so_don_hang, vin, ten_khach_hang, ket_qua, ngay_xuat_hoa_don 
FROM public.donhang 
WHERE so_don_hang = 'N31923-VSO-26-09-0189';
"""
print("\nKiểm tra lại đơn N31923-VSO-26-09-0189 trong donhang:")
print(run_query(sql_check_target))

print("\nTổng số đơn hàng hiện tại trong donhang:")
print(run_query("SELECT COUNT(*) as total_donhang FROM public.donhang;"))
