-- Migration: Tạo bảng lưu trữ Đơn hàng tồn (do TVBH báo cáo)
-- Ngày: 2026-03-25

CREATE TABLE IF NOT EXISTS public.donhang_ton (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    so_don_hang text NOT NULL REFERENCES public.donhanghienhuu(so_don_hang_ban) ON DELETE CASCADE,
    tvbh_name text NOT NULL,
    ghi_chu text,
    status text DEFAULT 'Đang theo dõi',
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Index cho số đơn hàng
CREATE UNIQUE INDEX IF NOT EXISTS idx_donhang_ton_so_don_hang ON public.donhang_ton(so_don_hang);

-- Enable RLS
ALTER TABLE public.donhang_ton ENABLE ROW LEVEL SECURITY;

-- Policies (Cho phép đọc ghi thoải mái do admin và TVBH đều cần dùng)
CREATE POLICY "Allow all read" ON public.donhang_ton FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON public.donhang_ton FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON public.donhang_ton FOR UPDATE USING (true);
CREATE POLICY "Allow all delete" ON public.donhang_ton FOR DELETE USING (true);

-- Trigger tự cập nhật updated_at
DROP TRIGGER IF EXISTS set_donhang_ton_updated_at ON public.donhang_ton;
CREATE TRIGGER set_donhang_ton_updated_at
BEFORE UPDATE ON public.donhang_ton
FOR EACH ROW
EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

-- Bật Realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'donhang_ton'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.donhang_ton;
    END IF;
END $$;
