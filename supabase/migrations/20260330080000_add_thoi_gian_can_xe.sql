-- Migration: Thêm cột thoi_gian_can_xe vào bảng donhang
-- Ngày: 2026-03-30
-- Mục đích: Cho phép Sales chọn thời gian cần ghép xe/nhận xe để Admin ưu tiên.

ALTER TABLE public.donhang ADD COLUMN IF NOT EXISTS thoi_gian_can_xe DATE;

-- Đồng bộ sang bảng yeucauxhd nếu cần (vì 2 bảng này sync với nhau)
ALTER TABLE public.yeucauxhd ADD COLUMN IF NOT EXISTS thoi_gian_can_xe DATE;

-- Cập nhật trigger sync nếu cần
-- Lưu ý: Trigger sync_donhang_to_yeucauxhd và ngược lại hiện tại đang sync cứng các cột.
-- Ta nên cập nhật chúng để sync cả cột mới này.

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
        thoi_gian_can_xe = NEW.thoi_gian_can_xe
    WHERE so_don_hang = NEW.so_don_hang;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
        thoi_gian_can_xe = NEW.thoi_gian_can_xe
    WHERE so_don_hang = NEW.so_don_hang;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
