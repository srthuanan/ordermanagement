-- Migration: Bổ sung Ma DMS cho quy trình xuất hóa đơn và lưu trữ
-- Ngày: 2026-04-08

-- 1. Thêm cột ma_dms vào các bảng nếu chưa có
ALTER TABLE public.yeucauxhd ADD COLUMN IF NOT EXISTS ma_dms TEXT;
ALTER TABLE public.archived_orders ADD COLUMN IF NOT EXISTS ma_dms TEXT;

-- 2. Cập nhật Trigger: Đồng bộ từ donhang SANG yeucauxhd (khi Sales gửi yêu cầu hoặc sửa thông tin)
CREATE OR REPLACE FUNCTION public.sync_donhang_to_yeucauxhd()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.yeucauxhd
    SET 
        ten_khach_hang = NEW.ten_khach_hang,
        vin = NEW.vin,
        so_may = NEW.so_may,
        ma_dms = NEW.ma_dms,
        dong_xe = NEW.dong_xe,
        phien_ban = NEW.phien_ban,
        ngoai_that = NEW.ngoai_that,
        noi_that = NEW.noi_that,
        ngay_coc = NEW.ngay_coc,
        tvbh = NEW.ten_tu_van_ban_hang,
        ngay_xuat_hoa_don = NEW.ngay_xuat_hoa_don
    WHERE so_don_hang = NEW.so_don_hang;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Cập nhật Trigger: Đồng bộ từ yeucauxhd VỀ donhang (khi Admin sửa thông tin trong tab Hóa đơn)
CREATE OR REPLACE FUNCTION public.sync_yeucauxhd_to_donhang()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.donhang
    SET 
        ten_khach_hang = NEW.ten_khach_hang,
        vin = NEW.vin,
        so_may = NEW.so_may,
        ma_dms = NEW.ma_dms,
        dong_xe = NEW.dong_xe,
        phien_ban = NEW.phien_ban,
        ngoai_that = NEW.ngoai_that,
        noi_that = NEW.noi_that,
        ngay_coc = NEW.ngay_coc,
        ten_tu_van_ban_hang = NEW.tvbh,
        link_hoa_don_da_xuat = NEW.url_hoa_don_da_xuat,
        ngay_xuat_hoa_don = NEW.ngay_xuat_hoa_don
    WHERE so_don_hang = NEW.so_don_hang;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Cập nhật function lưu trữ (archive) để không mất Mã DMS
CREATE OR REPLACE FUNCTION archive_old_orders()
RETURNS JSON AS $$
DECLARE
    archived_count INTEGER := 0;
BEGIN
    -- 1. Insert into archived_orders from yeucauxhd
    INSERT INTO archived_orders (
        so_don_hang, ten_khach_hang, dong_xe, phien_ban, ngoai_that, noi_that,
        tvbh, vin, so_may, ma_dms, ngay_coc, ngay_yeu_cau, ngay_xuat_hoa_don,
        chinh_sach, hoa_hong_ung, vpoint, url_hop_dong, url_de_nghi_xhd,
        trang_thai_vc, ket_qua, created_at, updated_at
    )
    SELECT 
        y.so_don_hang, y.ten_khach_hang, y.dong_xe, y.phien_ban, y.ngoai_that, y.noi_that,
        y.tvbh, y.vin, y.so_may, y.ma_dms, y.ngay_coc, y.ngay_yeu_cau, y.ngay_xuat_hoa_don,
        y.chinh_sach, y.hoa_hong_ung, y.vpoint, y.url_hop_dong, y.url_de_nghi_xhd,
        y.trang_thai_vc, 'Đã xuất hóa đơn', y.created_at, y.updated_at
    FROM yeucauxhd y
    WHERE y.ngay_xuat_hoa_don IS NOT NULL 
    AND y.ngay_xuat_hoa_don < (CURRENT_DATE - INTERVAL '1 month')
    ON CONFLICT (so_don_hang) DO NOTHING;

    GET DIAGNOSTICS archived_count = ROW_COUNT;

    -- 2. Delete ONLY from yeucauxhd once moved
    DELETE FROM yeucauxhd 
    WHERE ngay_xuat_hoa_don IS NOT NULL 
    AND ngay_xuat_hoa_don < (CURRENT_DATE - INTERVAL '1 month');

    RETURN json_build_object(
        'status', 'SUCCESS',
        'archived_count', archived_count
    );
END;
$$ LANGUAGE plpgsql;

-- 5. Đồng bộ ngược lại cho các dữ liệu hiện có đang bị trống Ma DMS trong yeucauxhd
UPDATE public.yeucauxhd y
SET ma_dms = d.ma_dms
FROM public.donhang d
WHERE y.so_don_hang = d.so_don_hang
AND (y.ma_dms IS NULL OR y.ma_dms = '')
AND (d.ma_dms IS NOT NULL AND d.ma_dms <> '');
