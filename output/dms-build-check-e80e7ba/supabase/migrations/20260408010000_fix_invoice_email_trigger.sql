-- Migration: Fix cascading triggers that cause false invoice emails during ghép xe
-- Date: 2026-04-08
-- Problem: When TVBH ghép xe, sync_yeucauxhd_to_donhang trigger copies url_hoa_don_da_xuat
--          back into donhang, which then fires handle_supabase_sync and sends unintended
--          invoice emails.

-- 1. Ensure handle_supabase_sync is definitely a no-op (re-apply disable)
CREATE OR REPLACE FUNCTION public.handle_supabase_sync()
RETURNS TRIGGER AS $$
BEGIN
    -- Sync to Google Sheets is permanently disabled. 
    -- Email notifications are handled directly by the frontend via Edge Functions.
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix sync_yeucauxhd_to_donhang to NOT overwrite link_hoa_don_da_xuat
--    This field should ONLY be set by the admin upload process, not by bidirectional sync
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
        -- REMOVED: link_hoa_don_da_xuat = NEW.url_hoa_don_da_xuat
        -- Reason: This was causing false invoice email triggers during ghép xe.
        -- The link_hoa_don_da_xuat should ONLY be set directly by uploadBulkInvoices.
        ngay_xuat_hoa_don = NEW.ngay_xuat_hoa_don
    WHERE so_don_hang = NEW.so_don_hang;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.sync_yeucauxhd_to_donhang IS 'Đồng bộ thông tin từ yeucauxhd sang donhang. KHÔNG đồng bộ link_hoa_don_da_xuat để tránh gửi email phát hành HĐ sai.';
