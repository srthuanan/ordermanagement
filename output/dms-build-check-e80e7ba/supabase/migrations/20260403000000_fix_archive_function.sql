-- Migration: Sửa hàm archive_old_orders để lưu trữ đơn hàng đã XHĐ của tháng trước
-- Ngày: 2026-04-03
-- Dùng NULLIF để xử lý chuỗi rỗng "" trước khi cast

CREATE OR REPLACE FUNCTION archive_old_orders()
RETURNS JSON AS $$
DECLARE
    archived_count INTEGER := 0;
    deleted_count INTEGER := 0;
    first_of_month DATE := date_trunc('month', CURRENT_DATE)::DATE;
BEGIN
    -- 1. Insert into archived_orders from yeucauxhd
    INSERT INTO archived_orders (
        so_don_hang, ten_khach_hang, dong_xe, phien_ban, ngoai_that, noi_that,
        tvbh, vin, so_may, ngay_coc, ngay_yeu_cau, ngay_xuat_hoa_don,
        chinh_sach, hoa_hong_ung, vpoint, url_hop_dong, url_de_nghi_xhd,
        url_hoa_don_da_xuat, trang_thai_vc, ket_qua, created_at
    )
    SELECT 
        y.so_don_hang, 
        y.ten_khach_hang, 
        y.dong_xe, 
        y.phien_ban, 
        y.ngoai_that, 
        y.noi_that,
        y.tvbh, 
        y.vin, 
        y.so_may, 
        (NULLIF(y.ngay_coc, ''))::DATE,
        (NULLIF(y.ngay_yeu_cau, ''))::TIMESTAMPTZ,
        (NULLIF(y.ngay_xuat_hoa_don, ''))::DATE,
        y.chinh_sach, 
        COALESCE(y.hoa_hong_ung, 0), 
        COALESCE(y.vpoint, 0), 
        y.url_hop_dong, 
        y.url_de_nghi_xhd,
        y.url_hoa_don_da_xuat, 
        y.trang_thai_vc, 
        'Đã xuất hóa đơn', 
        y.created_at
    FROM yeucauxhd y
    WHERE NULLIF(y.ngay_xuat_hoa_don, '') IS NOT NULL
    AND (NULLIF(y.ngay_xuat_hoa_don, ''))::DATE < first_of_month
    AND NOT EXISTS (
        SELECT 1 FROM archived_orders a WHERE a.so_don_hang = y.so_don_hang
    );

    GET DIAGNOSTICS archived_count = ROW_COUNT;

    -- 2. Delete from yeucauxhd once archived
    DELETE FROM yeucauxhd 
    WHERE NULLIF(ngay_xuat_hoa_don, '') IS NOT NULL
    AND (NULLIF(ngay_xuat_hoa_don, ''))::DATE < first_of_month
    AND EXISTS (
        SELECT 1 FROM archived_orders a WHERE a.so_don_hang = yeucauxhd.so_don_hang
    );

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- 3. Cũng xóa trong donhang các đơn đã lưu trữ
    DELETE FROM donhang
    WHERE so_don_hang IN (
        SELECT a.so_don_hang FROM archived_orders a
    )
    AND ngay_xuat_hoa_don IS NOT NULL;

    RETURN json_build_object(
        'status', 'SUCCESS',
        'archived_count', archived_count,
        'deleted_from_yeucauxhd', deleted_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
