-- Migration: Tự động xóa xe khỏi khoxe khi có yêu cầu xuất hóa đơn (yeucauxhd)
-- Ngày: 2026-03-31
-- Mục đích: Đảm bảo xe đã được yêu cầu xuất hóa đơn sẽ không còn nằm trong kho xe để bán/giữ cho đơn khác.

-- 1. Function tự động xóa xe khỏi kho
CREATE OR REPLACE FUNCTION public.auto_delete_khoxe_on_yeucauxhd()
RETURNS TRIGGER AS $$
BEGIN
    -- Nếu bản ghi mới có VIN (INSERT hoặc UPDATE đổi VIN)
    IF (NEW.vin IS NOT NULL AND NEW.vin <> '') THEN
        DELETE FROM public.khoxe 
        WHERE vin = NEW.vin;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger gắn vào bảng yeucauxhd
-- Chạy AFTER để đảm bảo yeucauxhd đã được lưu thành công trước khi xóa khỏi kho
-- Chèn bản ghi mới là trường hợp chính, cập nhật VIN (nếu có) cũng cần xử lý
DROP TRIGGER IF EXISTS trg_auto_delete_khoxe_on_yeucauxhd ON public.yeucauxhd;
CREATE TRIGGER trg_auto_delete_khoxe_on_yeucauxhd
AFTER INSERT OR UPDATE OF vin ON public.yeucauxhd
FOR EACH ROW
WHEN (NEW.vin IS NOT NULL AND NEW.vin <> '')
EXECUTE FUNCTION public.auto_delete_khoxe_on_yeucauxhd();

COMMENT ON TRIGGER trg_auto_delete_khoxe_on_yeucauxhd ON public.yeucauxhd IS 'Tự động dọn dẹp xe khỏi khoxe khi xe đó được yêu cầu xuất hóa đơn.';

-- 3. [Dọn dẹp một lần] Xóa các xe hiện đang tồn tại song song ở cả 2 bảng
-- Điều này giúp xử lý các dữ liệu cũ chưa được dọn dẹp
DELETE FROM public.khoxe 
WHERE vin IN (
    SELECT vin 
    FROM public.yeucauxhd 
    WHERE vin IS NOT NULL AND vin <> ''
);
