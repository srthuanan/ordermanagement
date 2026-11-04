-- ============================================================
-- Migration: sync_so_may_trigger
-- Mục đích: Tự động sync so_may từ thongtinxe → khoxe
--   1. Trigger: chạy ngay khi thongtinxe INSERT/UPDATE
--   2. pg_cron job: chạy mỗi giờ để sync hàng loạt (backup)
-- ============================================================

-- BƯỚC 1: Hàm trigger
CREATE OR REPLACE FUNCTION sync_so_may_to_khoxe()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Chỉ sync khi so_may thực sự có giá trị
  IF NEW.so_may IS NOT NULL AND TRIM(NEW.so_may) != '' THEN
    UPDATE khoxe
    SET so_may = TRIM(NEW.so_may)
    WHERE TRIM(UPPER(vin)) = TRIM(UPPER(NEW.vin))
      AND (so_may IS NULL OR TRIM(so_may) = '');
  END IF;
  RETURN NEW;
END;
$$;

-- BƯỚC 2: Gắn trigger vào bảng thongtinxe
DROP TRIGGER IF EXISTS trg_sync_so_may ON thongtinxe;

CREATE TRIGGER trg_sync_so_may
AFTER INSERT OR UPDATE OF so_may ON thongtinxe
FOR EACH ROW
EXECUTE FUNCTION sync_so_may_to_khoxe();

-- BƯỚC 3: pg_cron job mỗi giờ (chỉ chạy nếu pg_cron đã được bật)
-- Uncomment nếu pg_cron được bật trên project:
-- SELECT cron.unschedule('sync-so-may-hourly') WHERE EXISTS (
--   SELECT 1 FROM cron.job WHERE jobname = 'sync-so-may-hourly'
-- );
-- SELECT cron.schedule(
--   'sync-so-may-hourly',
--   '0 * * * *',
--   $$
--     UPDATE khoxe k
--     SET so_may = TRIM(t.so_may)
--     FROM thongtinxe t
--     WHERE TRIM(UPPER(k.vin)) = TRIM(UPPER(t.vin))
--       AND (k.so_may IS NULL OR TRIM(k.so_may) = '')
--       AND t.so_may IS NOT NULL AND TRIM(t.so_may) != '';
--   $$
-- );
