-- Migration: Kích hoạt đồng bộ tự động toàn diện từ Supabase sang Google Sheets
-- Ngày: 2026-04-06

-- 1. Đảm bảo extension pg_net đã được cài đặt
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Tạo hàm xử lý đồng bộ dùng chung (Generic Sync Function)
CREATE OR REPLACE FUNCTION public.handle_supabase_sync()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
    -- GAS URL (VINFO SYNC 2.0)
    gas_url TEXT := 'https://script.google.com/macros/s/AKfycbwC_Xw8YcudogtxpPJztqjFdttcL4tgDaHIdgFWqGcnZ0M44oH6KVb-2r52OKPtLex0Fg/exec';
BEGIN
    -- Tạo payload với thông tin bảng và hành động (INSERT, UPDATE, DELETE)
    payload := jsonb_build_object(
        'action', 'supabase_webhook',
        'type', TG_OP,
        'table', TG_TABLE_NAME,
        'record', CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
        'old_record', CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END
    );

    -- Gửi POST request bất đồng bộ qua pg_net (không làm chậm database)
    PERFORM net.http_post(
        url := gas_url,
        body := payload,
        headers := '{"Content-Type": "application/json"}'::jsonb
    );

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Gắn Trigger cho từng bảng quan trọng

-- Bảng yeucauxhd (Thay thế trigger cũ bằng generic function)
DROP TRIGGER IF EXISTS trg_sync_yeucauxhd_to_gas ON yeucauxhd;
CREATE TRIGGER trg_sync_yeucauxhd_to_gas
AFTER INSERT OR UPDATE OR DELETE ON yeucauxhd
FOR EACH ROW EXECUTE FUNCTION public.handle_supabase_sync();

-- Bảng donhang
DROP TRIGGER IF EXISTS trg_sync_donhang_to_gas ON donhang;
CREATE TRIGGER trg_sync_donhang_to_gas
AFTER INSERT OR UPDATE OR DELETE ON donhang
FOR EACH ROW EXECUTE FUNCTION public.handle_supabase_sync();

-- Bảng khoxe
DROP TRIGGER IF EXISTS trg_sync_khoxe_to_gas ON khoxe;
CREATE TRIGGER trg_sync_khoxe_to_gas
AFTER INSERT OR UPDATE OR DELETE ON khoxe
FOR EACH ROW EXECUTE FUNCTION public.handle_supabase_sync();

-- Bảng yeucauvc
DROP TRIGGER IF EXISTS trg_sync_yeucauvc_to_gas ON yeucauvc;
CREATE TRIGGER trg_sync_yeucauvc_to_gas
AFTER INSERT OR UPDATE OR DELETE ON yeucauvc
FOR EACH ROW EXECUTE FUNCTION public.handle_supabase_sync();

-- Bảng chinhsach
DROP TRIGGER IF EXISTS trg_sync_chinhsach_to_gas ON chinhsach;
CREATE TRIGGER trg_sync_chinhsach_to_gas
AFTER INSERT OR UPDATE OR DELETE ON chinhsach
FOR EACH ROW EXECUTE FUNCTION public.handle_supabase_sync();

-- Bảng car_inquiries
DROP TRIGGER IF EXISTS trg_sync_car_inquiries_to_gas ON car_inquiries;
CREATE TRIGGER trg_sync_car_inquiries_to_gas
AFTER INSERT OR UPDATE OR DELETE ON car_inquiries
FOR EACH ROW EXECUTE FUNCTION public.handle_supabase_sync();

-- Bảng thongtinxe
DROP TRIGGER IF EXISTS trg_sync_thongtinxe_to_gas ON thongtinxe;
CREATE TRIGGER trg_sync_thongtinxe_to_gas
AFTER INSERT OR UPDATE OR DELETE ON thongtinxe
FOR EACH ROW EXECUTE FUNCTION public.handle_supabase_sync();

-- Bảng users
DROP TRIGGER IF EXISTS trg_sync_users_to_gas ON users;
CREATE TRIGGER trg_sync_users_to_gas
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION public.handle_supabase_sync();

-- Bảng archived_orders
DROP TRIGGER IF EXISTS trg_sync_archived_orders_to_gas ON archived_orders;
CREATE TRIGGER trg_sync_archived_orders_to_gas
AFTER INSERT OR UPDATE OR DELETE ON archived_orders
FOR EACH ROW EXECUTE FUNCTION public.handle_supabase_sync();

-- Bảng app_settings
DROP TRIGGER IF EXISTS trg_sync_app_settings_to_gas ON app_settings;
CREATE TRIGGER trg_sync_app_settings_to_gas
AFTER INSERT OR UPDATE OR DELETE ON app_settings
FOR EACH ROW EXECUTE FUNCTION public.handle_supabase_sync();

-- Bảng interactions (Thông báo hệ thống)
DROP TRIGGER IF EXISTS trg_sync_interactions_to_gas ON interactions;
CREATE TRIGGER trg_sync_interactions_to_gas
AFTER INSERT OR UPDATE OR DELETE ON interactions
FOR EACH ROW EXECUTE FUNCTION public.handle_supabase_sync();

-- Comment để lưu chú thích
COMMENT ON FUNCTION public.handle_supabase_sync IS 'Generic trigger to sync any table change to Google Sheets via GAS Webhook.';
