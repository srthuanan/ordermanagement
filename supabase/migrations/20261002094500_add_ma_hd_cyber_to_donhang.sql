-- Migration: Bổ sung cột ma_hd_cyber cho bảng donhang, archived_orders, yeucauxhd
-- Ngày: 2026-10-02
-- Mục đích: Bắt buộc TVBH nhập/chọn mã hợp đồng Cyber khi tạo yêu cầu ghép xe

ALTER TABLE public.donhang 
ADD COLUMN IF NOT EXISTS ma_hd_cyber TEXT;

ALTER TABLE public.archived_orders 
ADD COLUMN IF NOT EXISTS ma_hd_cyber TEXT;

ALTER TABLE public.yeucauxhd 
ADD COLUMN IF NOT EXISTS ma_hd_cyber TEXT;

CREATE INDEX IF NOT EXISTS idx_donhang_ma_hd_cyber ON public.donhang(ma_hd_cyber);
CREATE INDEX IF NOT EXISTS idx_archived_orders_ma_hd_cyber ON public.archived_orders(ma_hd_cyber);
