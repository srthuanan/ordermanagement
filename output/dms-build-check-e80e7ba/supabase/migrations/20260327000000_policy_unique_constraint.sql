-- Add case-insensitive unique index on ten_chinh_sach to prevent duplicates 
-- Use lower() to make it case-insensitive
CREATE UNIQUE INDEX IF NOT EXISTS idx_chinhsach_name_unique_ci ON public.chinhsach (LOWER(ten_chinh_sach));
