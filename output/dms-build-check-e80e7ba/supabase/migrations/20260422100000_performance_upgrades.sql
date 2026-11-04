-- Migration: Cập nhật hiệu năng chuyên sâu cho toàn bộ truy vấn dữ liệu lớn
-- Tác dụng:
-- 1. Indexing giúp Frontend lọc và Order dữ liệu cực nhanh không sợ Table Scan.
-- 2. Trigger auto tự map số máy từ Kho Tổng về đơn hàng giúp trình duyệt k phải load 20.000 dòng.

-- 1. Indexes
CREATE INDEX IF NOT EXISTS idx_donhang_tvbh ON public.donhang (ten_tu_van_ban_hang);
CREATE INDEX IF NOT EXISTS idx_yeucauxhd_ngay_yc ON public.yeucauxhd (ngay_yeu_cau DESC);

-- 2. Trigger Auto Map Engine Number (Số máy)
CREATE OR REPLACE FUNCTION set_engine_from_thongtinxe() RETURNS TRIGGER AS $$
BEGIN
   -- Chỉ map khi có số VIN mà số máy thì đang trống hoặc null
   IF NEW.vin IS NOT NULL AND (NEW.so_may IS NULL OR NEW.so_may = '') THEN
      SELECT so_may INTO NEW.so_may FROM thongtinxe WHERE vin = NEW.vin LIMIT 1;
   END IF;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_engine ON public.donhang;

CREATE TRIGGER trigger_update_engine
BEFORE INSERT OR UPDATE OF vin ON public.donhang
FOR EACH ROW EXECUTE PROCEDURE set_engine_from_thongtinxe();

-- 3. Backfill Data (Chạy lại cho tất cả các bản ghi đơn hàng đã tồn tại mã chưa có số máy)
UPDATE public.donhang 
SET so_may = thongtinxe.so_may 
FROM public.thongtinxe 
WHERE public.donhang.vin = public.thongtinxe.vin AND (public.donhang.so_may IS NULL OR public.donhang.so_may = '');
