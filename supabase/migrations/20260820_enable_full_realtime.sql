-- Migration: Kích hoạt Supabase Realtime toàn diện cho Kho xe, Đơn hàng, Giữ xe và Thông báo
-- File: supabase/migrations/20260820_enable_full_realtime.sql

DO $$
DECLARE
    tbl text;
    realtime_tables text[] := ARRAY[
        'khoxe', 
        'donhang', 
        'yeucauxhd', 
        'yeucauvc', 
        'archived_orders', 
        'car_hold_activities', 
        'interactions', 
        'app_settings',
        'chat_messages',
        'car_inquiries'
    ];
BEGIN
    -- 1. Đảm bảo publication 'supabase_realtime' tồn tại
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    -- 2. Thêm từng bảng vào publication supabase_realtime và bật REPLICA IDENTITY FULL (để nhận đủ dữ liệu cũ & mới khi UPDATE/DELETE)
    FOREACH tbl IN ARRAY realtime_tables LOOP
        IF to_regclass(format('public.%I', tbl)) IS NOT NULL THEN
            -- Bật REPLICA IDENTITY FULL để payload Realtime trả về đầy đủ thông tin
            EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL;', tbl);

            -- Thêm bảng vào supabase_realtime nếu chưa có
            IF NOT EXISTS (
                SELECT 1 FROM pg_publication_tables 
                WHERE pubname = 'supabase_realtime' 
                  AND schemaname = 'public' 
                  AND tablename = tbl
            ) THEN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
            END IF;
        END IF;
    END LOOP;
END $$;
