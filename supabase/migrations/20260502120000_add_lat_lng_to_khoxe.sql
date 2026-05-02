-- Migration: Thêm vĩ độ và kinh độ cho khoxe
-- Ngày: 2026-05-02

ALTER TABLE public.khoxe 
ADD COLUMN IF NOT EXISTS latitude NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS longitude NUMERIC DEFAULT NULL;
