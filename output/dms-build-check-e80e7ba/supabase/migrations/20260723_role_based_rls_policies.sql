-- Migration: Role-Based Row Level Security (RBAC Enforcement)
-- File: supabase/migrations/20260723_role_based_rls_policies.sql

-- 1. Hàm kiểm tra quyền Admin an toàn trên PostgreSQL
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
    v_user_email TEXT := auth.jwt() ->> 'email';
BEGIN
    -- Nếu không có session auth (anon/public), trả về false
    IF v_user_email IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Kiểm tra vai trò trong bảng users
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE lower(email) = lower(v_user_email) 
          AND (lower(role) IN ('admin', 'quản trị viên') OR lower(username) = 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Khóa phân quyền các BẢNG CHỈ DÀNH CHO ADMIN (Chỉ Admin mới có quyền Thêm / Sửa / Xóa)

DO $$ 
DECLARE
    tbl text;
    admin_tables text[] := ARRAY[
        'ai_knowledge_base', 
        'vehicle_configs', 
        'app_settings',
        'car_prices_master',
        'car_color_prices',
        'policy_deduction_rules',
        'tvbh_maintenance_fees',
        'tvbh_emails'
    ];
BEGIN
    FOREACH tbl IN ARRAY admin_tables LOOP
        IF to_regclass(format('public.%I', tbl)) IS NOT NULL THEN
            -- Bật RLS
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
            
            -- Xóa policy cũ
            EXECUTE format('DROP POLICY IF EXISTS "Allow full access for admin only" ON public.%I;', tbl);
            EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated full access to %I" ON public.%I;', tbl, tbl);
            
            -- Đọc: Cho phép mọi người dùng đã đăng nhập xem dữ liệu
            EXECUTE format('DROP POLICY IF EXISTS "Allow read access for authenticated" ON public.%I;', tbl);
            EXECUTE format('CREATE POLICY "Allow read access for authenticated" ON public.%I FOR SELECT TO authenticated USING (true);', tbl);
            
            -- Thêm / Sửa / Xóa: BẮT BUỘC VAI TRÒ ADMIN
            EXECUTE format('CREATE POLICY "Allow write access for admin only" ON public.%I FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());', tbl);
        END IF;
    END LOOP;
END $$;
