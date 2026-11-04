-- Migration: Enable Storage Buckets & Full RLS Access Policies for Storage (Fix owner error)
-- File: supabase/migrations/20260723_enable_storage_rls_policies.sql

-- 1. Tạo hoặc cập nhật các storage buckets của ứng dụng thành PUBLIC = true
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('yeucauxhd-files', 'yeucauxhd-files', true),
    ('temp_scans', 'temp_scans', true),
    ('vinclub-requests', 'vinclub-requests', true),
    ('car-hold-evidences', 'car-hold-evidences', true),
    ('test-drive-images', 'test-drive-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Cấp chính sách TOÀN QUỀN Thêm/Sửa/Xóa/Đọc tệp tin cho tất cả kết nối
DROP POLICY IF EXISTS "Allow public full access on storage objects" ON storage.objects;
CREATE POLICY "Allow public full access on storage objects"
ON storage.objects FOR ALL
TO public
USING (true)
WITH CHECK (true);
