-- Migration: Tạo 3 bảng đồng bộ dữ liệu CyberSoft lên Supabase
-- 1. cyber_xep_xe: Danh sách hợp đồng xếp xe toàn hệ thống
-- 2. cyber_ton_kho: Báo cáo tồn kho xe các showroom
-- 3. cyber_voucher_tickets: Danh sách và tiến trình duyệt phiếu ĐNX / Phiếu chuyển

-- ─────────────────────────────────────────────────────────────
-- 1. BẢNG cyber_xep_xe
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cyber_xep_xe (
    stt_rec TEXT NOT NULL,
    stt_rec0 TEXT NOT NULL,
    ma_hd TEXT,
    so_ct TEXT,
    ngay_ct DATE,
    ngay_gx DATE,
    ten_kh TEXT,
    dien_thoai TEXT,
    ma_kx TEXT,
    ten_kx TEXT,
    ma_mau TEXT,
    ten_mau TEXT,
    ma_mau_nt TEXT,
    ten_mau_nt TEXT,
    so_khung TEXT,
    ngay_xep DATE,
    tien_nt NUMERIC DEFAULT 0,
    da_tt NUMERIC DEFAULT 0,
    con_no NUMERIC DEFAULT 0,
    ma_dvcs TEXT,
    ten_ttcp TEXT,
    ten_hs TEXT,
    ten_bp TEXT,
    ten_color TEXT,
    back_color TEXT,
    fore_color TEXT,
    bold BOOLEAN DEFAULT FALSE,
    raw_data JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (stt_rec, stt_rec0)
);

CREATE INDEX IF NOT EXISTS idx_cyber_xep_xe_so_khung ON public.cyber_xep_xe (so_khung);
CREATE INDEX IF NOT EXISTS idx_cyber_xep_xe_ma_hd ON public.cyber_xep_xe (ma_hd);
CREATE INDEX IF NOT EXISTS idx_cyber_xep_xe_so_ct ON public.cyber_xep_xe (so_ct);
CREATE INDEX IF NOT EXISTS idx_cyber_xep_xe_ten_kh ON public.cyber_xep_xe (ten_kh);
CREATE INDEX IF NOT EXISTS idx_cyber_xep_xe_ten_ttcp ON public.cyber_xep_xe (ten_ttcp);
CREATE INDEX IF NOT EXISTS idx_cyber_xep_xe_ten_color ON public.cyber_xep_xe (ten_color);
CREATE INDEX IF NOT EXISTS idx_cyber_xep_xe_ngay_ct ON public.cyber_xep_xe (ngay_ct DESC);

ALTER TABLE public.cyber_xep_xe ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cyber_xep_xe' AND policyname = 'Allow read cyber_xep_xe') THEN
        CREATE POLICY "Allow read cyber_xep_xe" ON public.cyber_xep_xe FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cyber_xep_xe' AND policyname = 'Allow service_role cyber_xep_xe') THEN
        CREATE POLICY "Allow service_role cyber_xep_xe" ON public.cyber_xep_xe FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cyber_xep_xe' AND policyname = 'Allow update authenticated cyber_xep_xe') THEN
        CREATE POLICY "Allow update authenticated cyber_xep_xe" ON public.cyber_xep_xe FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cyber_xep_xe' AND policyname = 'Allow anon all cyber_xep_xe') THEN
        CREATE POLICY "Allow anon all cyber_xep_xe" ON public.cyber_xep_xe FOR ALL TO anon USING (true) WITH CHECK (true);
    END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 2. BẢNG cyber_ton_kho
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cyber_ton_kho (
    vin TEXT NOT NULL,
    ma_kho TEXT NOT NULL,
    so_hd TEXT,
    ngay_hd DATE,
    thang_hd TEXT,
    ma_kx TEXT,
    ten_kx TEXT,
    so_may TEXT,
    ma_mau TEXT,
    ten_mau TEXT,
    ma_mau_nt TEXT,
    ten_mau_nt TEXT,
    ten_kho TEXT,
    ngay_ton INTEGER DEFAULT 0,
    nam_sx INTEGER,
    tinh_trang TEXT,
    ten_ttcp TEXT,
    tvbh TEXT,
    ghi_chu TEXT,
    is_invoiced BOOLEAN DEFAULT FALSE,
    raw_data JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (vin, ma_kho)
);

CREATE INDEX IF NOT EXISTS idx_cyber_ton_kho_vin ON public.cyber_ton_kho (vin);
CREATE INDEX IF NOT EXISTS idx_cyber_ton_kho_ma_kho ON public.cyber_ton_kho (ma_kho);
CREATE INDEX IF NOT EXISTS idx_cyber_ton_kho_ten_kx ON public.cyber_ton_kho (ten_kx);
CREATE INDEX IF NOT EXISTS idx_cyber_ton_kho_ten_ttcp ON public.cyber_ton_kho (ten_ttcp);

ALTER TABLE public.cyber_ton_kho ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cyber_ton_kho' AND policyname = 'Allow read cyber_ton_kho') THEN
        CREATE POLICY "Allow read cyber_ton_kho" ON public.cyber_ton_kho FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cyber_ton_kho' AND policyname = 'Allow service_role cyber_ton_kho') THEN
        CREATE POLICY "Allow service_role cyber_ton_kho" ON public.cyber_ton_kho FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cyber_ton_kho' AND policyname = 'Allow anon all cyber_ton_kho') THEN
        CREATE POLICY "Allow anon all cyber_ton_kho" ON public.cyber_ton_kho FOR ALL TO anon USING (true) WITH CHECK (true);
    END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 3. BẢNG cyber_voucher_tickets
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cyber_voucher_tickets (
    stt_rec TEXT PRIMARY KEY,
    so_ct TEXT,
    ngay_ct DATE,
    ma_ct TEXT,
    ma_post TEXT,
    ten_post TEXT,
    ma_kh TEXT,
    ten_kh TEXT,
    dien_giai TEXT,
    tien_nt NUMERIC DEFAULT 0,
    ma_ttcp TEXT,
    ten_ttcp TEXT,
    user_name TEXT,
    lines JSONB,
    raw_data JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cyber_voucher_tickets_so_ct ON public.cyber_voucher_tickets (so_ct);
CREATE INDEX IF NOT EXISTS idx_cyber_voucher_tickets_ma_ct ON public.cyber_voucher_tickets (ma_ct);
CREATE INDEX IF NOT EXISTS idx_cyber_voucher_tickets_ma_post ON public.cyber_voucher_tickets (ma_post);
CREATE INDEX IF NOT EXISTS idx_cyber_voucher_tickets_ngay_ct ON public.cyber_voucher_tickets (ngay_ct DESC);

ALTER TABLE public.cyber_voucher_tickets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cyber_voucher_tickets' AND policyname = 'Allow read cyber_voucher_tickets') THEN
        CREATE POLICY "Allow read cyber_voucher_tickets" ON public.cyber_voucher_tickets FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cyber_voucher_tickets' AND policyname = 'Allow service_role cyber_voucher_tickets') THEN
        CREATE POLICY "Allow service_role cyber_voucher_tickets" ON public.cyber_voucher_tickets FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cyber_voucher_tickets' AND policyname = 'Allow anon all cyber_voucher_tickets') THEN
        CREATE POLICY "Allow anon all cyber_voucher_tickets" ON public.cyber_voucher_tickets FOR ALL TO anon USING (true) WITH CHECK (true);
    END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 4. REALTIME PUBLICATION
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.cyber_xep_xe;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.cyber_ton_kho;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.cyber_voucher_tickets;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;
