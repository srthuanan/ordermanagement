-- Migration: Create khachhang_vinclub table for storing DMS VinClub verified customer profiles
CREATE TABLE IF NOT EXISTS public.khachhang_vinclub (
    ma_khach_hang TEXT PRIMARY KEY,
    ten_khach_hang TEXT,
    so_dien_thoai TEXT,
    ma_oneid TEXT,
    vclub_user_id TEXT,
    hang_vinclub TEXT,
    da_xac_thuc BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.khachhang_vinclub ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated & anon users
CREATE POLICY "Allow public read on khachhang_vinclub"
ON public.khachhang_vinclub
FOR SELECT
TO public
USING (true);

-- Allow full write/insert/update access for service_role and authenticated users
CREATE POLICY "Allow full access for service_role on khachhang_vinclub"
ON public.khachhang_vinclub
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow write access for authenticated users on khachhang_vinclub"
ON public.khachhang_vinclub
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow insert/update for anon on khachhang_vinclub"
ON public.khachhang_vinclub
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_khachhang_vinclub_phone ON public.khachhang_vinclub(so_dien_thoai);
CREATE INDEX IF NOT EXISTS idx_khachhang_vinclub_vclub_id ON public.khachhang_vinclub(vclub_user_id);
CREATE INDEX IF NOT EXISTS idx_khachhang_vinclub_verified ON public.khachhang_vinclub(da_xac_thuc);
