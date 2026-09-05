-- Migration: Enable Full RLS Policies for All System Tables (Fail-safe Edition)
-- File: supabase/migrations/20260723_enable_all_tables_rls_policies.sql

DO $$ 
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'khoxe', 
        'donhang', 
        'yeucauxhd', 
        'archived_orders', 
        'users', 
        'donhang_ton', 
        'donhanghienhuu', 
        'car_inquiries', 
        'ai_knowledge_base', 
        'vehicle_configs', 
        'tvbh_maintenance_fees', 
        'tvbh_emails', 
        'app_settings',
        'car_prices_master',
        'car_color_prices',
        'policy_deduction_rules'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        -- Kiểm tra xem bảng có tồn tại trong Database hay không trước khi bật RLS
        IF to_regclass(format('public.%I', tbl)) IS NOT NULL THEN
            -- Kích hoạt RLS
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
            
            -- Tạo chính sách cho phép tài khoản đã đăng nhập có toàn quyền Thêm/Sửa/Xóa
            EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated full access to %I" ON public.%I;', tbl, tbl);
            EXECUTE format('CREATE POLICY "Allow authenticated full access to %I" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', tbl, tbl);
            
            -- Tạo chính sách cho phép Anon đọc dữ liệu
            EXECUTE format('DROP POLICY IF EXISTS "Allow anon read access to %I" ON public.%I;', tbl, tbl);
            EXECUTE format('CREATE POLICY "Allow anon read access to %I" ON public.%I FOR SELECT TO anon USING (true);', tbl, tbl);
        END IF;
    END LOOP;
END $$;
