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

print("=== 1. XÓA BỎ TRIGGER TRÊN BẢNG KHOXE & SỬA TRIGGER CYBER_CAR_STATUS ===")
sql_fix_triggers = """
-- 1. Xóa hoàn toàn trigger tự động xóa đơn khi xe về Thuận An trên bảng khoxe
DROP TRIGGER IF EXISTS trg_khoxe_auto_archive ON public.khoxe;
DROP FUNCTION IF EXISTS trg_auto_archive_retained_order_khoxe();

-- 2. Sửa trigger trên cyber_car_status: CHỈ XÓA KHI XE THỰC SỰ ĐÃ CÓ PHIẾU TD4 (Giao xe hoàn tất)
-- TUYỆT ĐỐI BỎ ĐIỀU KIỆN K83 / THUẬN AN
CREATE OR REPLACE FUNCTION trg_auto_archive_retained_order_cyber()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.has_td4 = true OR NEW.so_ct_td4 IS NOT NULL) THEN
        INSERT INTO archived_orders (
            so_don_hang, ten_khach_hang, dong_xe, phien_ban, ngoai_that, noi_that,
            tvbh, vin, so_may, ma_dms, ngay_coc, ngay_xuat_hoa_don,
            chinh_sach, ket_qua, created_at, updated_at
        )
        SELECT 
            d.so_don_hang, d.ten_khach_hang, d.dong_xe, d.phien_ban, d.ngoai_that, d.noi_that,
            d.ten_tu_van_ban_hang, d.vin, d.so_may, d.ma_dms,
            CASE 
                WHEN d.ngay_coc IS NULL OR TRIM(d.ngay_coc) = '' THEN NULL
                WHEN d.ngay_coc ~ '^\\d{4}-\\d{2}-\\d{2}' THEN d.ngay_coc::DATE
                WHEN d.ngay_coc ~ '^\\d{1,2}/\\d{1,2}/\\d{4}' THEN to_date(d.ngay_coc, 'DD/MM/YYYY')
                ELSE NULL
            END,
            d.ngay_xuat_hoa_don::DATE,
            d.chinh_sach, 'Đã xuất hóa đơn', NOW(), NOW()
        FROM donhang d
        WHERE UPPER(TRIM(d.vin)) = UPPER(TRIM(NEW.vin))
        AND d.ngay_xuat_hoa_don IS NOT NULL
        AND d.ngay_xuat_hoa_don::DATE < date_trunc('month', CURRENT_DATE)::DATE
        ON CONFLICT (so_don_hang) DO NOTHING;

        DELETE FROM donhang
        WHERE UPPER(TRIM(vin)) = UPPER(TRIM(NEW.vin))
        AND ngay_xuat_hoa_don IS NOT NULL
        AND ngay_xuat_hoa_don::DATE < date_trunc('month', CURRENT_DATE)::DATE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Đảm bảo trigger cyber_car_status được gắn lại chuẩn xác
DROP TRIGGER IF EXISTS trg_cyber_car_status_auto_archive ON public.cyber_car_status;
CREATE TRIGGER trg_cyber_car_status_auto_archive
AFTER INSERT OR UPDATE ON public.cyber_car_status
FOR EACH ROW
EXECUTE FUNCTION trg_auto_archive_retained_order_cyber();
"""

res_trig = run_query(sql_fix_triggers)
print("Kết quả sửa Trigger:", res_trig)

print("\n=== 2. TÌM VÀ KHÔI PHỤC ĐƠN HÀNG CỦA XE RLLVAG8C0TH836543 VÀ CÁC ĐƠN CHƯA CÓ TD4 ===")
sql_find_and_restore = """
WITH restored AS (
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
      AND (cs.has_td4 IS NOT TRUE AND cs.so_ct_td4 IS NULL)
      AND (
          UPPER(TRIM(a.vin)) = 'RLLVAG8C0TH836543'
          OR a.ngay_xuat_hoa_don::text LIKE '2026-09%'
      )
    ON CONFLICT (so_don_hang) DO NOTHING
    RETURNING so_don_hang, vin, ten_khach_hang, ten_tu_van_ban_hang
)
SELECT * FROM restored;
"""

res_restored = run_query(sql_find_and_restore)
print("Đơn hàng đã được khôi phục về bảng donhang:")
for r in res_restored:
    print(" ->", r)

sql_verify = """
SELECT so_don_hang, vin, ten_khach_hang, ket_qua, ngay_xuat_hoa_don 
FROM public.donhang 
WHERE UPPER(TRIM(vin)) = 'RLLVAG8C0TH836543';
"""
print("\nKiểm tra trạng thái xe RLLVAG8C0TH836543 trong bảng donhang:")
print(run_query(sql_verify))

print("\nTổng số đơn trong donhang hiện tại:")
print(run_query("SELECT COUNT(*) as total_donhang FROM public.donhang;"))
