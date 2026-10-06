-- Migration: Quy trình Lưu Trữ Đơn Hàng & Tự Động Hóa Dọn Dẹp (Auto-Archive)
-- Ngày tạo: 2026-10-01
-- Quy tắc nghiệp vụ:
-- 1. Khi chạy Lưu Trữ Hóa Đơn Tháng Trước:
--    - Bảng yeucauxhd: Lưu trữ HẾT sang archived_orders và xóa sạch để lưu dữ liệu tháng mới.
--    - Bảng donhang: Chỉ xóa các đơn mà xe đã có vị trí ở Thuận An (K83) VÀ đã có phiếu TD4.
--    - Các đơn còn lại (chưa về Thuận An HOẶC chưa có TD4): Tiếp tục cho TỒN ở bảng donhang để TVBH theo dõi.
-- 2. Tự Động Hóa (Automation Triggers):
--    - Khi xe có đủ phiếu TD4 HOẶC vị trí xe về Thuận An (K83) (thông qua sync CyberSoft vào cyber_car_status / khoxe):
--    - Hệ thống TỰ ĐỘNG lưu trữ và xóa đơn hàng đó khỏi bảng donhang ngay lập tức.

-- ========================================================
-- PHẦN 1: HÀM LƯU TRỮ HÀNG THÁNG (archive_old_orders)
-- ========================================================
CREATE OR REPLACE FUNCTION archive_old_orders()
RETURNS JSON AS $$
DECLARE
    archived_count INTEGER := 0;
    deleted_yeucauxhd_count INTEGER := 0;
    deleted_donhang_count INTEGER := 0;
    first_of_month DATE := date_trunc('month', CURRENT_DATE)::DATE;
BEGIN
    -- 1. Lưu trữ TOÀN BỘ đơn XHĐ tháng trước từ yeucauxhd sang archived_orders
    INSERT INTO archived_orders (
        so_don_hang, ten_khach_hang, dong_xe, phien_ban, ngoai_that, noi_that,
        tvbh, vin, so_may, ma_dms, ngay_coc, ngay_yeu_cau, ngay_xuat_hoa_don,
        chinh_sach, hoa_hong_ung, vpoint, url_hop_dong, url_de_nghi_xhd,
        url_hoa_don_da_xuat, trang_thai_vc, ket_qua, created_at, updated_at
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
        y.ma_dms,
        CASE 
            WHEN y.ngay_coc IS NULL OR TRIM(y.ngay_coc) = '' THEN NULL
            WHEN y.ngay_coc ~ '^\d{4}-\d{2}-\d{2}' THEN y.ngay_coc::DATE
            WHEN y.ngay_coc ~ '^\d{1,2}/\d{1,2}/\d{4}' THEN to_date(y.ngay_coc, 'DD/MM/YYYY')
            ELSE NULL
        END,
        y.ngay_yeu_cau,
        y.ngay_xuat_hoa_don::DATE,
        y.chinh_sach, 
        COALESCE(y.hoa_hong_ung, 0), 
        COALESCE(y.vpoint, 0), 
        y.url_hop_dong, 
        y.url_de_nghi_xhd,
        y.url_hoa_don_da_xuat, 
        y.trang_thai_vc, 
        'Đã xuất hóa đơn', 
        y.created_at,
        NOW()
    FROM yeucauxhd y
    WHERE y.ngay_xuat_hoa_don IS NOT NULL
    AND y.ngay_xuat_hoa_don::DATE < first_of_month
    ON CONFLICT (so_don_hang) DO NOTHING;

    GET DIAGNOSTICS archived_count = ROW_COUNT;

    -- 2. Xóa TOÀN BỘ các đơn XHĐ tháng trước khỏi yeucauxhd để sẵn sàng cho tháng mới
    DELETE FROM yeucauxhd 
    WHERE ngay_xuat_hoa_don IS NOT NULL
    AND ngay_xuat_hoa_don::DATE < first_of_month;

    GET DIAGNOSTICS deleted_yeucauxhd_count = ROW_COUNT;

    -- 3. Bảng donhang: CHỈ XÓA những đơn mà xe không có VIN HOẶC (xe đã ở Thuận An VÀ đã có TD4)
    --    Các đơn còn lại tiếp tục CHO TỒN ở bảng donhang!
    DELETE FROM donhang
    WHERE ngay_xuat_hoa_don IS NOT NULL
    AND ngay_xuat_hoa_don::DATE < first_of_month
    AND (
        vin IS NULL OR TRIM(vin) = ''
        OR EXISTS (
            SELECT 1 
            FROM cyber_car_status cs
            LEFT JOIN khoxe k ON UPPER(TRIM(k.vin)) = UPPER(TRIM(donhang.vin))
            WHERE UPPER(TRIM(cs.vin)) = UPPER(TRIM(donhang.vin))
            AND (cs.has_td4 = true OR cs.so_ct_td4 IS NOT NULL)
            AND (
                UPPER(TRIM(cs.ma_kho)) = 'K83'
                OR LOWER(COALESCE(k.vi_tri, '')) LIKE '%k83%'
                OR LOWER(COALESCE(k.vi_tri, '')) LIKE '%thuận an%'
                OR LOWER(COALESCE(k.vi_tri, '')) LIKE '%thuan an%'
            )
        )
    );

    GET DIAGNOSTICS deleted_donhang_count = ROW_COUNT;

    RETURN json_build_object(
        'status', 'SUCCESS',
        'archived_count', archived_count,
        'deleted_from_yeucauxhd', deleted_yeucauxhd_count,
        'deleted_from_donhang', deleted_donhang_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ========================================================
-- PHẦN 2: TRIGGER TỰ ĐỘNG DỌN DẸP KHI CÓ TD4 HOẶC VỀ THUẬN AN
-- ========================================================

-- Trigger khi bảng cyber_car_status được cập nhật
CREATE OR REPLACE FUNCTION trg_auto_archive_retained_order_cyber()
RETURNS TRIGGER AS $$
BEGIN
    -- Điều kiện: Nếu xe đã có TD4 HOẶC vị trí xe đã về kho Thuận An (K83)
    IF (NEW.has_td4 = true OR NEW.so_ct_td4 IS NOT NULL OR UPPER(TRIM(NEW.ma_kho)) = 'K83') THEN
        -- 1. Đảm bảo đơn đã có trong archived_orders
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
                WHEN d.ngay_coc ~ '^\d{4}-\d{2}-\d{2}' THEN d.ngay_coc::DATE
                WHEN d.ngay_coc ~ '^\d{1,2}/\d{1,2}/\d{4}' THEN to_date(d.ngay_coc, 'DD/MM/YYYY')
                ELSE NULL
            END,
            d.ngay_xuat_hoa_don::DATE,
            d.chinh_sach, 'Đã xuất hóa đơn', NOW(), NOW()
        FROM donhang d
        WHERE UPPER(TRIM(d.vin)) = UPPER(TRIM(NEW.vin))
        AND d.ngay_xuat_hoa_don IS NOT NULL
        AND d.ngay_xuat_hoa_don::DATE < date_trunc('month', CURRENT_DATE)::DATE
        ON CONFLICT (so_don_hang) DO NOTHING;

        -- 2. Tự động xóa khỏi bảng donhang
        DELETE FROM donhang
        WHERE UPPER(TRIM(vin)) = UPPER(TRIM(NEW.vin))
        AND ngay_xuat_hoa_don IS NOT NULL
        AND ngay_xuat_hoa_don::DATE < date_trunc('month', CURRENT_DATE)::DATE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_cyber_car_status_auto_archive ON public.cyber_car_status;
CREATE TRIGGER trg_cyber_car_status_auto_archive
AFTER INSERT OR UPDATE ON public.cyber_car_status
FOR EACH ROW
EXECUTE FUNCTION trg_auto_archive_retained_order_cyber();


-- Trigger khi bảng khoxe có vị trí xe cập nhật về Thuận An
CREATE OR REPLACE FUNCTION trg_auto_archive_retained_order_khoxe()
RETURNS TRIGGER AS $$
BEGIN
    IF (
        LOWER(COALESCE(NEW.vi_tri, '')) LIKE '%k83%'
        OR LOWER(COALESCE(NEW.vi_tri, '')) LIKE '%thuận an%'
        OR LOWER(COALESCE(NEW.vi_tri, '')) LIKE '%thuan an%'
    ) THEN
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
                WHEN d.ngay_coc ~ '^\d{4}-\d{2}-\d{2}' THEN d.ngay_coc::DATE
                WHEN d.ngay_coc ~ '^\d{1,2}/\d{1,2}/\d{4}' THEN to_date(d.ngay_coc, 'DD/MM/YYYY')
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

DROP TRIGGER IF EXISTS trg_khoxe_auto_archive ON public.khoxe;
CREATE TRIGGER trg_khoxe_auto_archive
AFTER INSERT OR UPDATE OF vi_tri ON public.khoxe
FOR EACH ROW
EXECUTE FUNCTION trg_auto_archive_retained_order_khoxe();
