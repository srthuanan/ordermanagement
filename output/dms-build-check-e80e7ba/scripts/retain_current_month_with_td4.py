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

print("=== 1. CẬP NHẬT TRIGGER: ĐƠN THÁNG HIỆN TẠI VẪN GIỮ LẠI DÙ CÓ TD4 ===")
sql_update_trigger = """
CREATE OR REPLACE FUNCTION trg_auto_archive_retained_order_cyber()
RETURNS TRIGGER AS $$
DECLARE
    v_has_td4 BOOLEAN;
    v_td4_so_ct TEXT;
    v_dnx_so_ct TEXT;
    v_note TEXT;
BEGIN
    v_has_td4 := (NEW.has_td4 = true OR (NEW.so_ct_td4 IS NOT NULL AND TRIM(NEW.so_ct_td4) <> ''));
    v_td4_so_ct := NULLIF(TRIM(NEW.so_ct_td4), '');
    v_dnx_so_ct := NULLIF(TRIM(NEW.so_ct_dnx), '');
    
    v_note := CASE 
        WHEN v_has_td4 THEN 'Đã có phiếu giao xe TD4: ' || COALESCE(v_td4_so_ct, 'TD4')
        WHEN (NEW.has_dnx = true OR v_dnx_so_ct IS NOT NULL) THEN 'Đã có phiếu điều chuyển DNX: ' || COALESCE(v_dnx_so_ct, 'DNX')
        ELSE NULL
    END;

    -- BƯỚC 1: Luôn cập nhật thông tin DNX / TD4 vào bảng donhang nếu đơn đang tồn tại
    UPDATE public.donhang
    SET 
        so_ct_dnx = COALESCE(v_dnx_so_ct, so_ct_dnx),
        so_ct_td4 = COALESCE(v_td4_so_ct, so_ct_td4),
        ghi_chu_xuat_xe = COALESCE(v_note, ghi_chu_xuat_xe)
    WHERE UPPER(TRIM(vin)) = UPPER(TRIM(NEW.vin));

    -- BƯỚC 2: CHỈ TỰ ĐỘNG XÓA KHỎI donhang KHI ĐƠN THUỘC VỀ THÁNG TRƯỚC (ngay_xuat_hoa_don < date_trunc('month', CURRENT_DATE)) VÀ ĐÃ CÓ TD4
    -- Đơn hàng trong tháng hiện tại VẪN GIỮ LẠI trong donhang cho dù đã có TD4 để theo dõi doanh số!
    IF v_has_td4 THEN
        INSERT INTO public.archived_orders (
            so_don_hang, ten_khach_hang, dong_xe, phien_ban, ngoai_that, noi_that,
            tvbh, vin, so_may, ma_dms, ngay_coc, ngay_xuat_hoa_don,
            chinh_sach, ket_qua, so_ct_dnx, so_ct_td4, ghi_chu_xuat_xe,
            created_at, updated_at
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
            d.chinh_sach, 'Đã xuất hóa đơn',
            COALESCE(v_dnx_so_ct, d.so_ct_dnx),
            COALESCE(v_td4_so_ct, d.so_ct_td4),
            COALESCE(v_note, d.ghi_chu_xuat_xe),
            NOW(), NOW()
        FROM public.donhang d
        WHERE UPPER(TRIM(d.vin)) = UPPER(TRIM(NEW.vin))
        AND d.ngay_xuat_hoa_don IS NOT NULL
        AND d.ngay_xuat_hoa_don::DATE < date_trunc('month', CURRENT_DATE)::DATE
        ON CONFLICT (so_don_hang) DO UPDATE SET
            so_ct_dnx = EXCLUDED.so_ct_dnx,
            so_ct_td4 = EXCLUDED.so_ct_td4,
            ghi_chu_xuat_xe = EXCLUDED.ghi_chu_xuat_xe,
            updated_at = NOW();

        -- Chỉ xóa đơn hàng tháng trước
        DELETE FROM public.donhang
        WHERE UPPER(TRIM(vin)) = UPPER(TRIM(NEW.vin))
        AND ngay_xuat_hoa_don IS NOT NULL
        AND ngay_xuat_hoa_don::DATE < date_trunc('month', CURRENT_DATE)::DATE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
"""
print(run_query(sql_update_trigger))

print("\n=== 2. KHÔI PHỤC LẠI ĐƠN HÀNG THÁNG 10 VÀO BẢNG donhang (BAO GỒM ĐƠN ĐÃ CÓ TD4) ===")
sql_restore_october = """
WITH restored AS (
    INSERT INTO public.donhang (
        so_don_hang, ten_khach_hang, dong_xe, phien_ban, ngoai_that, noi_that,
        ten_tu_van_ban_hang, vin, so_may, ma_dms, ngay_coc, ngay_xuat_hoa_don,
        chinh_sach, ket_qua, link_hoa_don_da_xuat, trang_thai_vc,
        so_ct_dnx, so_ct_td4, ghi_chu_xuat_xe, created_at
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
        COALESCE(NULLIF(TRIM(cs.so_ct_dnx), ''), a.so_ct_dnx),
        COALESCE(NULLIF(TRIM(cs.so_ct_td4), ''), a.so_ct_td4),
        CASE 
            WHEN (cs.has_td4 = true OR (cs.so_ct_td4 IS NOT NULL AND TRIM(cs.so_ct_td4) <> '')) 
                THEN 'Đã có phiếu giao xe TD4: ' || COALESCE(NULLIF(TRIM(cs.so_ct_td4), ''), 'TD4')
            WHEN (cs.has_dnx = true OR (cs.so_ct_dnx IS NOT NULL AND TRIM(cs.so_ct_dnx) <> '')) 
                THEN 'Đã có phiếu điều chuyển DNX: ' || COALESCE(NULLIF(TRIM(cs.so_ct_dnx), ''), 'DNX')
            ELSE a.ghi_chu_xuat_xe
        END,
        a.created_at
    FROM public.archived_orders a
    LEFT JOIN public.donhang d ON d.so_don_hang = a.so_don_hang
    LEFT JOIN public.cyber_car_status cs ON UPPER(TRIM(cs.vin)) = UPPER(TRIM(a.vin))
    WHERE d.so_don_hang IS NULL
      AND (
          a.ngay_xuat_hoa_don IS NULL 
          OR a.ngay_xuat_hoa_don::DATE >= date_trunc('month', CURRENT_DATE)::DATE
          OR a.so_don_hang LIKE '%-26-10-%'
      )
    ON CONFLICT (so_don_hang) DO UPDATE SET
        so_ct_dnx = EXCLUDED.so_ct_dnx,
        so_ct_td4 = EXCLUDED.so_ct_td4,
        ghi_chu_xuat_xe = EXCLUDED.ghi_chu_xuat_xe
    RETURNING so_don_hang, vin, ten_khach_hang, so_ct_td4
)
SELECT * FROM restored;
"""
res_restored = run_query(sql_restore_october)
print(f"Số lượng đơn tháng 10 vừa được khôi phục về donhang: {len(res_restored)}")
for r in res_restored:
    print(" ->", r)

print("\n=== 3. KIỂM TRA LẠI ĐƠN N31913-VSO-26-10-0002 TRONG donhang ===")
sql_check = """
SELECT so_don_hang, vin, ten_khach_hang, ngay_xuat_hoa_don, ket_qua, so_ct_td4, ghi_chu_xuat_xe
FROM public.donhang
WHERE so_don_hang = 'N31913-VSO-26-10-0002';
"""
print(run_query(sql_check))

print("\nTổng số đơn hàng trong bảng donhang hiện tại:")
print(run_query("SELECT COUNT(*) as total_donhang FROM public.donhang;"))
