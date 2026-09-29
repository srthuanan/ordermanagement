-- Migration: Fix and protect VIN & so_may synchronization across donhang, yeucauxhd, thongtinxe, khoxe
-- Date: 2026-09-29

-- 1. Trigger function trên bảng donhang: Đảm bảo số máy luôn đi theo đúng số VIN
CREATE OR REPLACE FUNCTION public.set_engine_from_thongtinxe() RETURNS TRIGGER AS $$
DECLARE
    v_found_so_may TEXT;
BEGIN
    -- 1.1. Nếu đơn hàng không có VIN (hủy ghép hoặc chưa ghép), xóa sạch số máy rác của xe cũ
    IF NEW.vin IS NULL OR TRIM(NEW.vin) = '' THEN
        NEW.so_may := NULL;
        RETURN NEW;
    END IF;

    -- 1.2. Nếu thêm mới (INSERT), hoặc cập nhật mà đổi sang VIN khác, hoặc đơn chưa có số máy
    IF TG_OP = 'INSERT' 
       OR (TG_OP = 'UPDATE' AND (NEW.vin IS DISTINCT FROM OLD.vin OR NEW.so_may IS NULL OR TRIM(NEW.so_may) = '')) THEN
        
        -- Ưu tiên tìm số máy chuẩn từ thongtinxe
        SELECT TRIM(so_may) INTO v_found_so_may 
        FROM public.thongtinxe 
        WHERE vin = NEW.vin AND so_may IS NOT NULL AND TRIM(so_may) != '' 
        LIMIT 1;

        -- Fallback tìm trong khoxe nếu thongtinxe chưa có
        IF v_found_so_may IS NULL OR v_found_so_may = '' THEN
            SELECT TRIM(so_may) INTO v_found_so_may 
            FROM public.khoxe 
            WHERE vin = NEW.vin AND so_may IS NOT NULL AND TRIM(so_may) != '' 
            LIMIT 1;
        END IF;

        IF v_found_so_may IS NOT NULL AND v_found_so_may != '' THEN
            NEW.so_may := v_found_so_may;
        ELSIF TG_OP = 'UPDATE' AND NEW.vin IS DISTINCT FROM OLD.vin THEN
            -- Đổi sang VIN mới nhưng xe mới chưa có số máy -> xóa số máy cũ của xe trước
            NEW.so_may := NULL;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_engine ON public.donhang;
CREATE TRIGGER trigger_update_engine
BEFORE INSERT OR UPDATE ON public.donhang
FOR EACH ROW EXECUTE PROCEDURE public.set_engine_from_thongtinxe();


-- 2. Trigger function trên bảng yeucauxhd: Đảm bảo số máy luôn khớp với số VIN của yêu cầu hóa đơn
CREATE OR REPLACE FUNCTION public.set_engine_for_yeucauxhd() RETURNS TRIGGER AS $$
DECLARE
    v_found_so_may TEXT;
BEGIN
    -- 2.1. Nếu hồ sơ không có VIN, xóa số máy
    IF NEW.vin IS NULL OR TRIM(NEW.vin) = '' THEN
        NEW.so_may := NULL;
        RETURN NEW;
    END IF;

    -- 2.2. Nếu thêm mới, hoặc đổi VIN, hoặc số máy rỗng
    IF TG_OP = 'INSERT' 
       OR (TG_OP = 'UPDATE' AND (NEW.vin IS DISTINCT FROM OLD.vin OR NEW.so_may IS NULL OR TRIM(NEW.so_may) = '')) THEN
        
        SELECT TRIM(so_may) INTO v_found_so_may 
        FROM public.thongtinxe 
        WHERE vin = NEW.vin AND so_may IS NOT NULL AND TRIM(so_may) != '' 
        LIMIT 1;

        IF v_found_so_may IS NULL OR v_found_so_may = '' THEN
            SELECT TRIM(so_may) INTO v_found_so_may 
            FROM public.khoxe 
            WHERE vin = NEW.vin AND so_may IS NOT NULL AND TRIM(so_may) != '' 
            LIMIT 1;
        END IF;

        IF v_found_so_may IS NOT NULL AND v_found_so_may != '' THEN
            NEW.so_may := v_found_so_may;
        ELSIF TG_OP = 'UPDATE' AND NEW.vin IS DISTINCT FROM OLD.vin THEN
            NEW.so_may := NULL;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_engine_yeucauxhd ON public.yeucauxhd;
CREATE TRIGGER trigger_update_engine_yeucauxhd
BEFORE INSERT OR UPDATE ON public.yeucauxhd
FOR EACH ROW EXECUTE PROCEDURE public.set_engine_for_yeucauxhd();


-- 3. Trigger function push từ thongtinxe và khoxe sang donhang & yeucauxhd
CREATE OR REPLACE FUNCTION public.push_engine_to_orders() RETURNS TRIGGER AS $$
BEGIN
   IF NEW.so_may IS NOT NULL AND TRIM(NEW.so_may) != '' THEN
      -- Cập nhật đồng bộ số máy chuẩn cho donhang theo đúng VIN
      UPDATE public.donhang 
      SET so_may = TRIM(NEW.so_may) 
      WHERE vin = NEW.vin AND (so_may IS DISTINCT FROM TRIM(NEW.so_may));
      
      -- Cập nhật đồng bộ số máy chuẩn cho yeucauxhd theo đúng VIN
      UPDATE public.yeucauxhd 
      SET so_may = TRIM(NEW.so_may) 
      WHERE vin = NEW.vin AND (so_may IS DISTINCT FROM TRIM(NEW.so_may));
   END IF;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- 4. DỌN DẸP DỮ LIỆU CŨ (DATA BACKFILL)
-- 4.1. Xóa số máy mồ côi ở các đơn không có VIN
UPDATE public.donhang
SET so_may = NULL
WHERE vin IS NULL OR TRIM(vin) = '';

UPDATE public.yeucauxhd
SET so_may = NULL
WHERE vin IS NULL OR TRIM(vin) = '';

-- 4.2. Khôi phục số máy chính xác 100% theo đúng số VIN từ thongtinxe / khoxe
UPDATE public.donhang d
SET so_may = COALESCE(
    (SELECT TRIM(t.so_may) FROM public.thongtinxe t WHERE t.vin = d.vin AND t.so_may IS NOT NULL AND TRIM(t.so_may) != '' LIMIT 1),
    (SELECT TRIM(k.so_may) FROM public.khoxe k WHERE k.vin = d.vin AND k.so_may IS NOT NULL AND TRIM(k.so_may) != '' LIMIT 1)
)
WHERE d.vin IS NOT NULL AND TRIM(d.vin) != '';

UPDATE public.yeucauxhd y
SET so_may = COALESCE(
    (SELECT TRIM(t.so_may) FROM public.thongtinxe t WHERE t.vin = y.vin AND t.so_may IS NOT NULL AND TRIM(t.so_may) != '' LIMIT 1),
    (SELECT TRIM(k.so_may) FROM public.khoxe k WHERE k.vin = y.vin AND k.so_may IS NOT NULL AND TRIM(k.so_may) != '' LIMIT 1)
)
WHERE y.vin IS NOT NULL AND TRIM(y.vin) != '';
