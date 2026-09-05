-- Migration: Enable RLS Write Policy for Authenticated Admin Operations
-- File: supabase/migrations/20260723_enable_khoxe_rls_policy.sql

-- 1. Cho phép tài khoản đã đăng nhập (Authenticated) được phép Insert/Update/Delete vào bảng khoxe
ALTER TABLE public.khoxe ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access to khoxe" ON public.khoxe;
CREATE POLICY "Allow authenticated full access to khoxe" 
ON public.khoxe 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 2. Cho phép tài khoản đã đăng nhập được phép Insert/Update vào bảng donhang
ALTER TABLE public.donhang ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access to donhang" ON public.donhang;
CREATE POLICY "Allow authenticated full access to donhang" 
ON public.donhang 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
