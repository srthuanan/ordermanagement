-- Migration: Vá lỗ hổng bảo mật Storage Buckets (An toàn, không làm gián đoạn xem PDF/ảnh)
-- File: supabase/migrations/20260820_patch_part1_storage_security.sql

-- 1. Giữ các bucket ở trạng thái có thể xem liên kết trực tiếp (Đảm bảo xem Hợp đồng/CCCD/Hóa đơn không bị lỗi 403)
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('yeucauxhd-files', 'yeucauxhd-files', true),
    ('temp_scans', 'temp_scans', true),
    ('vinclub-requests', 'vinclub-requests', true),
    ('car-hold-evidences', 'car-hold-evidences', true),
    ('test-drive-images', 'test-drive-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Xóa các chính sách cũ (loại bỏ chính sách cho phép public toàn quyền xóa/sửa)
DROP POLICY IF EXISTS "Allow public full access on storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated full access to storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload and manage objects" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read objects" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read only for public buckets" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access on storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated insert on storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update on storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete on storage objects" ON storage.objects;

-- 3. CHÍNH SÁCH ĐỌC (SELECT): Cho phép đọc/xem file qua liên kết (phục vụ xem PDF hợp đồng, hóa đơn, CCCD khi bấm link)
CREATE POLICY "Allow public read access on storage objects"
ON storage.objects
FOR SELECT
TO public
USING (true);

-- 4. CHÍNH SÁCH GHI (INSERT): BẮT BUỘC phải là tài khoản đã đăng nhập (Authenticated)
CREATE POLICY "Allow authenticated insert on storage objects"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 5. CHÍNH SÁCH SỬA & XÓA (UPDATE, DELETE): BẮT BUỘC phải là tài khoản đã đăng nhập (Authenticated)
CREATE POLICY "Allow authenticated update on storage objects"
ON storage.objects
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated delete on storage objects"
ON storage.objects
FOR DELETE
TO authenticated
USING (true);
