-- Migration: Add Flex-Match options to donhang table
-- Description: Cho phép TVBH cấu hình các màu ngoại thất/nội thất phụ chấp nhận ghép xe (Biên độ mở)

ALTER TABLE public.donhang
ADD COLUMN IF NOT EXISTS is_flex_match BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ngoai_that_flex TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS noi_that_flex TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.donhang.is_flex_match IS 'Cho phép ghép xe biên độ mở với màu phụ chấp nhận';
COMMENT ON COLUMN public.donhang.ngoai_that_flex IS 'Danh sách màu ngoại thất phụ chấp nhận ghép xe';
COMMENT ON COLUMN public.donhang.noi_that_flex IS 'Danh sách màu nội thất phụ chấp nhận ghép xe';
