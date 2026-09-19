-- Migration: Bảo vệ Mã DMS & Số máy của kho xe không bị file kế hoạch ghi đè
-- Quy tắc:
-- 1. Vị trí kho (vi_tri): Luôn cập nhật theo kế hoạch mới nhất (hoặc Đang vận tải).
-- 2. Mã DMS (ma_dms): CHỈ điền nếu xe trong kho chưa có mã DMS (NULL hoặc rỗng).
-- 3. Số máy (so_may): CHỈ điền nếu xe trong kho chưa có số máy (NULL hoặc rỗng).

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
            ELSE ma_dms 
        END,
        so_may = CASE 
            WHEN (so_may IS NULL OR so_may = '') AND NEW.so_may IS NOT NULL AND NEW.so_may != '' THEN NEW.so_may 
            ELSE so_may 
        END
    WHERE vin = NEW.vin;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
