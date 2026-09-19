-- Migration: Tạo bảng kehoach_giaoxe và trigger 2 chiều với khoxe

-- 1. Bảng lưu trữ Kế hoạch giao xe nhà máy
CREATE TABLE IF NOT EXISTS public.kehoach_giaoxe (
    vin TEXT PRIMARY KEY,
    vi_tri TEXT,
    raw_kho TEXT,
    ma_dms TEXT,
    so_may TEXT,
    dong_xe TEXT,
    phien_ban TEXT,
    ngoai_that TEXT,
    noi_that TEXT,
    ngay_phan_bo TEXT,
    ngay_nhap_kho TEXT,
    ngay_van_tai TEXT,
    don_vi_van_tai TEXT,
    ghi_chu TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index cho số VIN để tra cứu siêu tốc
CREATE INDEX IF NOT EXISTS idx_kehoach_giaoxe_vin ON public.kehoach_giaoxe (vin);

-- Phân quyền RLS
ALTER TABLE public.kehoach_giaoxe ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.kehoach_giaoxe;
CREATE POLICY "Allow all for authenticated users" ON public.kehoach_giaoxe FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anon read" ON public.kehoach_giaoxe;
CREATE POLICY "Allow anon read" ON public.kehoach_giaoxe FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Allow anon all" ON public.kehoach_giaoxe;
CREATE POLICY "Allow anon all" ON public.kehoach_giaoxe FOR ALL TO anon USING (true) WITH CHECK (true);

-- 2. Trigger Function: Khi có xe MỚI nhập vào khoxe, tự động tra cứu và điền Vị trí, DMS, Số máy từ kehoach_giaoxe
CREATE OR REPLACE FUNCTION public.sync_khoxe_from_kehoach()
RETURNS TRIGGER AS $$
DECLARE
    plan RECORD;
BEGIN
    SELECT * INTO plan FROM public.kehoach_giaoxe WHERE vin = NEW.vin LIMIT 1;
    
    IF plan IS NOT NULL THEN
        -- Vị trí kho (nếu chưa có thì lấy từ kế hoạch)
        IF NEW.vi_tri IS NULL OR NEW.vi_tri = '' THEN
            NEW.vi_tri := plan.vi_tri;
        END IF;

        -- Mã DMS (Mã XHĐ)
        IF (NEW.ma_dms IS NULL OR NEW.ma_dms = '') AND plan.ma_dms IS NOT NULL AND plan.ma_dms != '' THEN
            NEW.ma_dms := plan.ma_dms;
        END IF;

        -- Số máy (Số động cơ)
        IF (NEW.so_may IS NULL OR NEW.so_may = '') AND plan.so_may IS NOT NULL AND plan.so_may != '' THEN
            NEW.so_may := plan.so_may;
        END IF;

        -- Dòng xe (nếu chưa có)
        IF (NEW.dong_xe IS NULL OR NEW.dong_xe = '') AND plan.dong_xe IS NOT NULL AND plan.dong_xe != '' THEN
            NEW.dong_xe := plan.dong_xe;
        END IF;

        -- Phiên bản (nếu chưa có)
        IF (NEW.phien_ban IS NULL OR NEW.phien_ban = '') AND plan.phien_ban IS NOT NULL AND plan.phien_ban != '' THEN
            NEW.phien_ban := plan.phien_ban;
        END IF;

        -- Ngoại thất (nếu chưa có)
        IF (NEW.ngoai_that IS NULL OR NEW.ngoai_that = '') AND plan.ngoai_that IS NOT NULL AND plan.ngoai_that != '' THEN
            NEW.ngoai_that := plan.ngoai_that;
        END IF;

        -- Nội thất (nếu chưa có)
        IF (NEW.noi_that IS NULL OR NEW.noi_that = '') AND plan.noi_that IS NOT NULL AND plan.noi_that != '' THEN
            NEW.noi_that := plan.noi_that;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn Trigger vào bảng khoxe (BEFORE INSERT)
DROP TRIGGER IF EXISTS trg_sync_khoxe_from_kehoach ON public.khoxe;
CREATE TRIGGER trg_sync_khoxe_from_kehoach
BEFORE INSERT ON public.khoxe
FOR EACH ROW
EXECUTE FUNCTION public.sync_khoxe_from_kehoach();

-- 3. Trigger Function: Khi kehoach_giaoxe có thông tin mới/cập nhật, tự động cập nhật vị trí mới cho các xe đang có trong khoxe
CREATE OR REPLACE FUNCTION public.sync_kehoach_to_existing_khoxe()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.khoxe
    SET 
        vi_tri = CASE 
            WHEN NEW.vi_tri IS NOT NULL AND NEW.vi_tri != '' THEN NEW.vi_tri 
            ELSE vi_tri 
        END,
        ma_dms = CASE 
            WHEN (ma_dms IS NULL OR ma_dms = '') AND NEW.ma_dms IS NOT NULL AND NEW.ma_dms != '' THEN NEW.ma_dms 
            WHEN NEW.ma_dms IS NOT NULL AND NEW.ma_dms != '' THEN NEW.ma_dms
            ELSE ma_dms 
        END,
        so_may = CASE 
            WHEN (so_may IS NULL OR so_may = '') AND NEW.so_may IS NOT NULL AND NEW.so_may != '' THEN NEW.so_may 
            WHEN NEW.so_may IS NOT NULL AND NEW.so_may != '' THEN NEW.so_may
            ELSE so_may 
        END
    WHERE vin = NEW.vin;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn Trigger vào bảng kehoach_giaoxe (AFTER INSERT OR UPDATE)
DROP TRIGGER IF EXISTS trg_sync_kehoach_to_khoxe ON public.kehoach_giaoxe;
CREATE TRIGGER trg_sync_kehoach_to_khoxe
AFTER INSERT OR UPDATE ON public.kehoach_giaoxe
FOR EACH ROW
EXECUTE FUNCTION public.sync_kehoach_to_existing_khoxe();
