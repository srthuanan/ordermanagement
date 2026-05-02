-- Migration: Sửa lỗi đồng bộ trạng thái giữa donhang và yeucauxhd
-- Ngày: 2026-04-06

-- 1. Cập nhật hàm đồng bộ từ donhang sang yeucauxhd (thêm trường trạng thái)
CREATE OR REPLACE FUNCTION public.sync_donhang_to_yeucauxhd()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.yeucauxhd
    SET 
        ten_khach_hang = NEW.ten_khach_hang,
        vin = NEW.vin,
        dong_xe = NEW.dong_xe,
        phien_ban = NEW.phien_ban,
        ngoai_that = NEW.ngoai_that,
        noi_that = NEW.noi_that,
        ngay_coc = NEW.ngay_coc,
        tvbh = NEW.ten_tu_van_ban_hang,
        ngay_xuat_hoa_don = NEW.ngay_xuat_hoa_don,
        -- Cập nhật trạng thái VC dựa trên kết quả đơn hàng
        trang_thai_vc = CASE 
            WHEN NEW.ket_qua = 'Đã phê duyệt' THEN 'Đã phê duyệt'
            WHEN NEW.ket_qua = 'Đã bổ sung' THEN 'Đã bổ sung'
            WHEN NEW.ket_qua = 'Yêu cầu bổ sung' THEN 'Yêu cầu bổ sung'
            WHEN NEW.ket_qua = 'Đã hủy' THEN 'Đã hủy'
            ELSE trang_thai_vc -- Giữ nguyên nếu không thuộc các case trên
        END
    WHERE so_don_hang = NEW.so_don_hang;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Cập nhật hàm đồng bộ từ yeucauxhd sang donhang (thêm trường trạng thái)
CREATE OR REPLACE FUNCTION public.sync_yeucauxhd_to_donhang()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.donhang
    SET 
        ten_khach_hang = NEW.ten_khach_hang,
        vin = NEW.vin,
        dong_xe = NEW.dong_xe,
        phien_ban = NEW.phien_ban,
        ngoai_that = NEW.ngoai_that,
        noi_that = NEW.noi_that,
        ngay_coc = NEW.ngay_coc,
        ten_tu_van_ban_hang = NEW.tvbh,
        link_hoa_don_da_xuat = NEW.url_hoa_don_da_xuat,
        ngay_xuat_hoa_don = NEW.ngay_xuat_hoa_don,
        -- Đồng bộ ngược trạng thái nếu cần
        ket_qua = CASE 
            WHEN NEW.trang_thai_vc = 'Đã phê duyệt' THEN 'Đã phê duyệt'
            WHEN NEW.trang_thai_vc = 'Đã bổ sung' THEN 'Đã bổ sung'
            WHEN NEW.trang_thai_vc = 'Yêu cầu bổ sung' THEN 'Yêu cầu bổ sung'
            WHEN NEW.trang_thai_vc = 'Đã hủy' THEN 'Đã hủy'
            ELSE ket_qua
        END
    WHERE so_don_hang = NEW.so_don_hang;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.sync_donhang_to_yeucauxhd IS 'Đồng bộ thông tin và TRẠNG THÁI từ donhang sang yeucauxhd.';
COMMENT ON FUNCTION public.sync_yeucauxhd_to_donhang IS 'Đồng bộ thông tin và TRẠNG THÁI từ yeucauxhd sang donhang.';
