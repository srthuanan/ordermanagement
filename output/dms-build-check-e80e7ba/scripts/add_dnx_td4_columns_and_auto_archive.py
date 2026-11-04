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

print("=== 1. THÊM CỘT so_ct_dnx, so_ct_td4, ghi_chu_xuat_xe VÀO BẢNG donhang VÀ archived_orders ===")
sql_add_cols = """
-- 1. Thêm cột vào bảng donhang
ALTER TABLE public.donhang 
ADD COLUMN IF NOT EXISTS so_ct_dnx TEXT,
ADD COLUMN IF NOT EXISTS so_ct_td4 TEXT,
ADD COLUMN IF NOT EXISTS ghi_chu_xuat_xe TEXT;

-- 2. Thêm cột vào bảng archived_orders
ALTER TABLE public.archived_orders 
ADD COLUMN IF NOT EXISTS so_ct_dnx TEXT,
ADD COLUMN IF NOT EXISTS so_ct_td4 TEXT,
ADD COLUMN IF NOT EXISTS ghi_chu_xuat_xe TEXT;

-- Tạo index tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_donhang_so_ct_dnx ON public.donhang(so_ct_dnx);
CREATE INDEX IF NOT EXISTS idx_donhang_so_ct_td4 ON public.donhang(so_ct_td4);
CREATE INDEX IF NOT EXISTS idx_archived_orders_so_ct_dnx ON public.archived_orders(so_ct_dnx);
CREATE INDEX IF NOT EXISTS idx_archived_orders_so_ct_td4 ON public.archived_orders(so_ct_td4);
"""
print(run_query(sql_add_cols))

print("\n=== 2. ĐỒNG BỘ DỮ LIỆU HIỆN CÓ TỪ cyber_car_status SANG donhang ===")
sql_backfill = """
UPDATE public.donhang d
SET 
    so_ct_dnx = NULLIF(TRIM(cs.so_ct_dnx), ''),
    so_ct_td4 = NULLIF(TRIM(cs.so_ct_td4), ''),
    ghi_chu_xuat_xe = CASE 
        WHEN (cs.has_td4 = true OR (cs.so_ct_td4 IS NOT NULL AND TRIM(cs.so_ct_td4) <> '')) 
            THEN 'Đã có phiếu giao xe TD4: ' || COALESCE(NULLIF(TRIM(cs.so_ct_td4), ''), 'TD4')
        WHEN (cs.has_dnx = true OR (cs.so_ct_dnx IS NOT NULL AND TRIM(cs.so_ct_dnx) <> '')) 
            THEN 'Đã có phiếu điều chuyển DNX: ' || COALESCE(NULLIF(TRIM(cs.so_ct_dnx), ''), 'DNX')
        ELSE d.ghi_chu_xuat_xe
    END
FROM public.cyber_car_status cs
WHERE UPPER(TRIM(cs.vin)) = UPPER(TRIM(d.vin));
"""
print(run_query(sql_backfill))

print("\n=== 3. CẬP NHẬT TRIGGER TỰ ĐỘNG ĐỒNG BỘ VÀ TỰ ĐỘNG XÓA KHI CÓ TD4 ===")
sql_trigger = """
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

    -- BƯỚC 1: Luôn cập nhật thông tin DNX / TD4 vào bảng donhang nếu đơn vẫn đang tồn tại
    UPDATE public.donhang
    SET 
        so_ct_dnx = COALESCE(v_dnx_so_ct, so_ct_dnx),
        so_ct_td4 = COALESCE(v_td4_so_ct, so_ct_td4),
        ghi_chu_xuat_xe = COALESCE(v_note, ghi_chu_xuat_xe)
    WHERE UPPER(TRIM(vin)) = UPPER(TRIM(NEW.vin));

    -- BƯỚC 2: NẾU XE ĐÃ CÓ PHIẾU TD4 (Đã giao xe cho KH) VÀ ĐÃ XUẤT HÓA ĐƠN
    -- -> TỰ ĐỘNG LƯU TRỮ VÀ XÓA KHỎI BẢNG donhang (áp dụng cho mọi đơn hàng đã hoàn tất giao xe)
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
        ON CONFLICT (so_don_hang) DO UPDATE SET
            so_ct_dnx = EXCLUDED.so_ct_dnx,
            so_ct_td4 = EXCLUDED.so_ct_td4,
            ghi_chu_xuat_xe = EXCLUDED.ghi_chu_xuat_xe,
            updated_at = NOW();

        -- Xóa đơn khỏi bảng donhang vì đã hoàn tất giao xe (đã có TD4)
        DELETE FROM public.donhang
        WHERE UPPER(TRIM(vin)) = UPPER(TRIM(NEW.vin))
        AND ngay_xuat_hoa_don IS NOT NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_cyber_car_status_auto_archive ON public.cyber_car_status;
CREATE TRIGGER trg_cyber_car_status_auto_archive
AFTER INSERT OR UPDATE ON public.cyber_car_status
FOR EACH ROW
EXECUTE FUNCTION trg_auto_archive_retained_order_cyber();
"""
print(run_query(sql_trigger))

print("\n=== 4. DỌN DẸP CÁC ĐƠN ĐÃ CÓ TD4 HIỆN TẠI KHỎI donhang ===")
sql_archive_current_td4 = """
WITH moved AS (
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
        d.so_ct_dnx,
        d.so_ct_td4,
        d.ghi_chu_xuat_xe,
        NOW(), NOW()
    FROM public.donhang d
    JOIN public.cyber_car_status cs ON UPPER(TRIM(cs.vin)) = UPPER(TRIM(d.vin))
    WHERE d.ngay_xuat_hoa_don IS NOT NULL
      AND (cs.has_td4 = true OR (cs.so_ct_td4 IS NOT NULL AND TRIM(cs.so_ct_td4) <> ''))
    ON CONFLICT (so_don_hang) DO UPDATE SET
        so_ct_dnx = EXCLUDED.so_ct_dnx,
        so_ct_td4 = EXCLUDED.so_ct_td4,
        ghi_chu_xuat_xe = EXCLUDED.ghi_chu_xuat_xe,
        updated_at = NOW()
    RETURNING so_don_hang
),
deleted AS (
    DELETE FROM public.donhang d
    USING public.cyber_car_status cs
    WHERE UPPER(TRIM(cs.vin)) = UPPER(TRIM(d.vin))
      AND d.ngay_xuat_hoa_don IS NOT NULL
      AND (cs.has_td4 = true OR (cs.so_ct_td4 IS NOT NULL AND TRIM(cs.so_ct_td4) <> ''))
    RETURNING d.so_don_hang, d.vin, d.ten_khach_hang, cs.so_ct_td4
)
SELECT * FROM deleted;
"""
res_clean = run_query(sql_archive_current_td4)
print(f"Số lượng đơn có TD4 vừa được lưu trữ và xóa khỏi donhang: {len(res_clean)}")
for c in res_clean:
    print(" ->", c)

print("\n=== 5. KIỂM TRA LẠI MẪU DỮ LIỆU CỘT MỚI TRONG donhang ===")
sql_sample = """
SELECT so_don_hang, vin, ten_khach_hang, so_ct_dnx, so_ct_td4, ghi_chu_xuat_xe
FROM public.donhang
WHERE so_ct_dnx IS NOT NULL OR so_ct_td4 IS NOT NULL
LIMIT 5;
"""
for s in run_query(sql_sample):
    print(" ->", s)

print("\nTổng số đơn trong donhang hiện tại:")
print(run_query("SELECT COUNT(*) as total_donhang FROM public.donhang;"))
