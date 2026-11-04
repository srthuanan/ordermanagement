-- Migration: Thêm cột vị trí kho cho bảng khoxe
-- Ngày: 2026-09-12

ALTER TABLE public.khoxe 
ADD COLUMN IF NOT EXISTS vi_tri TEXT DEFAULT NULL;
