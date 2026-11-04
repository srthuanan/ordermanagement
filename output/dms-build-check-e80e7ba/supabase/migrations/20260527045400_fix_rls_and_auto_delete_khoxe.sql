-- =========================================================
-- FIX 1: RLS policy yeucauxhd - cho phép INSERT (fix lỗi 403)
-- =========================================================
DROP POLICY IF EXISTS "Allow public full access on yeucauxhd" ON public.yeucauxhd;

CREATE POLICY "Allow public full access on yeucauxhd"
  ON public.yeucauxhd
  FOR ALL
  USING (true)
  WITH CHECK (true);


-- =========================================================
-- FIX 2: Trigger tự động xóa xe khỏi khoxe khi gửi YC XHĐ
-- =========================================================

-- Function xóa xe khỏi kho ngay khi INSERT vào yeucauxhd
CREATE OR REPLACE FUNCTION public.auto_delete_khoxe_on_yeucauxhd()
RETURNS TRIGGER AS $$
BEGIN
    -- Chỉ xóa khi có VIN hợp lệ
    IF (NEW.vin IS NOT NULL AND trim(NEW.vin) <> '') THEN
        DELETE FROM public.khoxe 
        WHERE trim(vin) = trim(NEW.vin);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gắn trigger: chạy AFTER INSERT hoặc UPDATE cột vin
DROP TRIGGER IF EXISTS trg_auto_delete_khoxe_on_yeucauxhd ON public.yeucauxhd;

CREATE TRIGGER trg_auto_delete_khoxe_on_yeucauxhd
  AFTER INSERT OR UPDATE OF vin ON public.yeucauxhd
  FOR EACH ROW
  WHEN (NEW.vin IS NOT NULL AND trim(NEW.vin) <> '')
  EXECUTE FUNCTION public.auto_delete_khoxe_on_yeucauxhd();

COMMENT ON TRIGGER trg_auto_delete_khoxe_on_yeucauxhd ON public.yeucauxhd 
  IS 'Tự động xóa xe khỏi kho ngay khi TVBH gửi yêu cầu xuất hóa đơn.';


-- =========================================================
-- DỌN DẸP: Xóa xe hiện tại đang có YC XHĐ nhưng vẫn còn trong kho
-- =========================================================
DELETE FROM public.khoxe 
WHERE trim(vin) IN (
    SELECT trim(vin) 
    FROM public.yeucauxhd 
    WHERE vin IS NOT NULL AND trim(vin) <> ''
);
