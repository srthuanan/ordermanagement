-- Migration: Tăng tốc độ truy vấn bằng Indexing
-- Giúp các bảng lớn tìm kiếm dữ liệu ngay lập tức mà không gây tải CPU

-- 1. Index cho bảng đơn hàng
CREATE INDEX IF NOT EXISTS idx_donhang_thoi_gian_nhap ON public.donhang (thoi_gian_nhap DESC);
CREATE INDEX IF NOT EXISTS idx_donhang_ket_qua ON public.donhang (ket_qua);
CREATE INDEX IF NOT EXISTS idx_donhang_vin ON public.donhang (vin);

-- 2. Index cho bảng kho xe
CREATE INDEX IF NOT EXISTS idx_khoxe_trang_thai ON public.khoxe (trang_thai);
CREATE INDEX IF NOT EXISTS idx_khoxe_vin ON public.khoxe (vin);

-- 3. Phân quyền truy cập nhanh cho các hàm RPC
GRANT EXECUTE ON FUNCTION get_ai_dashboard_stats() TO anon, authenticated, service_role;
