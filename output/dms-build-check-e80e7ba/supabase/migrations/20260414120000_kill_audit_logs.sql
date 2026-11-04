-- Migration: Xóa bỏ hoàn toàn hệ thống Audit Logs để tăng tốc hệ thống
-- Mục đích: Loại bỏ các bảng dữ liệu cồng kềnh và các lệnh ghi ngầm gây chậm máy.

-- 1. Xóa các bảng nhật ký
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.ai_audit_logs CASCADE;
DROP TABLE IF EXISTS public.ai_audit_results CASCADE;

-- 2. Xóa các function ghi log tự động (nếu có)
DROP FUNCTION IF EXISTS public.log_ai_activity() CASCADE;
DROP FUNCTION IF EXISTS public.handle_audit_log() CASCADE;

-- 3. Thông báo hoàn tất
COMMENT ON SCHEMA public IS 'Hệ thống đã được tối ưu hóa, loại bỏ Audit Logs để tăng tốc độ xử lý.';
