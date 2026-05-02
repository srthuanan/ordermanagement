-- Migration: Tách biệt cột chinh_sach giữa donhang và yeucauxhd
-- Ngày: 2026-04-30

-- 1. Cập nhật hàm sync_donhang_to_yeucauxhd để loại bỏ việc cập nhật chinh_sach
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

-- 2. Cập nhật hàm sync_yeucauxhd_to_donhang để loại bỏ việc cập nhật chinh_sach
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
