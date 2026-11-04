-- Migration: Thêm cột chinh_sach vào bảng donhang
-- Ngày: 2026-04-27

-- 1. Thêm cột chinh_sach vào bảng donhang
ALTER TABLE public.donhang ADD COLUMN IF NOT EXISTS chinh_sach TEXT;

-- 2. Cập nhật hàm sync_donhang_to_yeucauxhd để đồng bộ cả chính sách
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
        ngay_xuat_hoa_don = NEW.ngay_xuat_hoa_don,
        chinh_sach = NEW.chinh_sach -- Thêm dòng này
    WHERE so_don_hang = NEW.so_don_hang;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Cập nhật hàm sync_yeucauxhd_to_donhang để đồng bộ ngược lại
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
        ngay_xuat_hoa_don = NEW.ngay_xuat_hoa_don,
        chinh_sach = NEW.chinh_sach -- Thêm dòng này
    WHERE so_don_hang = NEW.so_don_hang;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
