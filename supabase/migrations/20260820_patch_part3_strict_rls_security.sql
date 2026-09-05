-- Migration: Vá lỗ hổng Phân quyền Dữ liệu Nghiệp vụ (Strict RLS Enforcement for Core Tables)
-- File: supabase/migrations/20260820_patch_part3_strict_rls_security.sql

-- 1. Đảm bảo hàm public.is_admin() hoạt động ổn định và chính xác
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
    v_user_email TEXT := auth.jwt() ->> 'email';
BEGIN
    IF v_user_email IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE lower(email) = lower(v_user_email) 
          AND (lower(role) IN ('admin', 'quản trị viên', 'quản trị') OR lower(username) = 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. BẢO VỆ BẢNG KHO XE (khoxe)
-- Mọi người dùng đã đăng nhập có thể xem kho xe và cập nhật (giữ xe, ghép xe), nhưng CHỈ ADMIN MỚI ĐƯỢC XÓA XE
ALTER TABLE public.khoxe ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access to khoxe" ON public.khoxe;
DROP POLICY IF EXISTS "Allow authenticated read on khoxe" ON public.khoxe;
DROP POLICY IF EXISTS "Allow authenticated write on khoxe" ON public.khoxe;
DROP POLICY IF EXISTS "Allow authenticated update on khoxe" ON public.khoxe;
DROP POLICY IF EXISTS "Allow admin delete on khoxe" ON public.khoxe;

CREATE POLICY "Allow authenticated read on khoxe" 
ON public.khoxe FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated write on khoxe" 
ON public.khoxe FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow authenticated update on khoxe" 
ON public.khoxe FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow admin delete on khoxe" 
ON public.khoxe FOR DELETE 
TO authenticated 
USING (public.is_admin());

-- 3. BẢO VỆ BẢNG ĐƠN HÀNG (donhang)
-- TVBH có thể tạo và cập nhật đơn hàng của mình, nhưng CHỈ ADMIN MỚI CÓ QUYỀN XÓA VĨNH VIỄN ĐƠN HÀNG
ALTER TABLE public.donhang ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access to donhang" ON public.donhang;
DROP POLICY IF EXISTS "Allow authenticated read on donhang" ON public.donhang;
DROP POLICY IF EXISTS "Allow authenticated insert on donhang" ON public.donhang;
DROP POLICY IF EXISTS "Allow authenticated update on donhang" ON public.donhang;
DROP POLICY IF EXISTS "Allow admin delete on donhang" ON public.donhang;

CREATE POLICY "Allow authenticated read on donhang" 
ON public.donhang FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated insert on donhang" 
ON public.donhang FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow authenticated update on donhang" 
ON public.donhang FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow admin delete on donhang" 
ON public.donhang FOR DELETE 
TO authenticated 
USING (public.is_admin());

-- 4. BẢO VỆ BẢNG ĐƠN HÀNG LƯU TRỮ (archived_orders)
DO $$
BEGIN
    IF to_regclass('public.archived_orders') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.archived_orders ENABLE ROW LEVEL SECURITY;';

        EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated full access to archived_orders" ON public.archived_orders;';
        EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated read on archived_orders" ON public.archived_orders;';
        EXECUTE 'DROP POLICY IF EXISTS "Allow admin modify on archived_orders" ON public.archived_orders;';

        EXECUTE 'CREATE POLICY "Allow authenticated read on archived_orders" ON public.archived_orders FOR SELECT TO authenticated USING (true);';
        EXECUTE 'CREATE POLICY "Allow admin modify on archived_orders" ON public.archived_orders FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());';
    END IF;
END $$;

-- 5. BẢO VỆ BẢNG NHÂN VIÊN / TÀI KHOẢN (users)
-- Mọi nhân viên xem được danh sách đồng nghiệp (chọn TVBH/Leader), nhưng CHỈ ADMIN MỚI CÓ QUYỀN THÊM/XÓA TÀI KHOẢN
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access to users" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated read on users" ON public.users;
DROP POLICY IF EXISTS "Allow user update self or admin modify users" ON public.users;
DROP POLICY IF EXISTS "Allow admin insert on users" ON public.users;
DROP POLICY IF EXISTS "Allow admin delete on users" ON public.users;

CREATE POLICY "Allow authenticated read on users" 
ON public.users FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow user update self or admin modify users" 
ON public.users FOR UPDATE 
TO authenticated 
USING (public.is_admin() OR lower(email) = lower(auth.jwt() ->> 'email'))
WITH CHECK (public.is_admin() OR lower(email) = lower(auth.jwt() ->> 'email'));

CREATE POLICY "Allow admin insert on users" 
ON public.users FOR INSERT 
TO authenticated 
WITH CHECK (public.is_admin());

CREATE POLICY "Allow admin delete on users" 
ON public.users FOR DELETE 
TO authenticated 
USING (public.is_admin());
