-- Migration: Tối ưu hóa đồng bộ Google Sheets (Chỉ giữ lại 3 bảng cốt lõi)
-- Ngày: 2026-04-14
-- Mục tiêu: Loại bỏ gánh nặng đồng bộ cho các bảng phụ để tăng tốc độ ghi dữ liệu.

DO $$
DECLARE
    t TEXT;
    -- Danh sách tất cả các bảng trước đây từng được đồng bộ
    all_synced_tables TEXT[] := ARRAY[
        'yeucauvc', 'chinhsach', 'car_inquiries', 'thongtinxe', 'users', 
        'archived_orders', 'app_settings', 'interactions', 'donhang_ton', 
        'donhanghienhuu', 'reputation_adjustments', 'test_drive_schedule', 
        'user_presence', 'user_reputation_cache'
    ];
    -- Danh sách 3 bảng GIỮ LẠI theo yêu cầu của anh
    target_tables TEXT[] := ARRAY['donhang', 'khoxe', 'yeucauxhd'];
BEGIN
    -- 1. Gỡ bỏ đồng bộ cho các bảng không còn cần thiết
    FOREACH t IN ARRAY all_synced_tables LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_sync_%I_to_gas ON public.%I', t, t);
    END LOOP;

    -- 2. Đảm bảo 3 bảng chính luôn có Trigger đồng bộ chính xác
    FOREACH t IN ARRAY target_tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
            EXECUTE format('DROP TRIGGER IF EXISTS trg_sync_%I_to_gas ON public.%I', t, t);
            EXECUTE format('CREATE TRIGGER trg_sync_%I_to_gas AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.handle_supabase_sync()', t, t);
        END IF;
    END LOOP;
END $$;

COMMENT ON SCHEMA public IS 'Đồng bộ Google Sheets đã được tối ưu hóa: Chỉ áp dụng cho donhang, khoxe và yeucauxhd.';
