-- Migration: Bổ sung các cột theo dõi tiến độ cho bảng donhang_ton
-- Ngày: 2026-10-01
-- Mục đích: Cho phép TVBH quản lý và chọn tiến độ đơn cọc tồn (Chờ xe, Cần xe, Hoàn cọc, Hủy cọc)

ALTER TABLE public.donhang_ton 
ADD COLUMN IF NOT EXISTS tien_do text DEFAULT 'Chờ xe',
ADD COLUMN IF NOT EXISTS ghi_chu_tvbh text,
ADD COLUMN IF NOT EXISTS updated_at_tvbh timestamp with time zone;

-- Index để tối ưu truy vấn theo tiến độ và TVBH
CREATE INDEX IF NOT EXISTS idx_donhang_ton_tvbh_tien_do ON public.donhang_ton(tvbh_name, tien_do);
