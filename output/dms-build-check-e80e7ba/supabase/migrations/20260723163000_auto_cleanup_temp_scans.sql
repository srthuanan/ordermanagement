-- Migration: Auto cleanup expired files in temp_scans bucket
CREATE OR REPLACE FUNCTION public.cleanup_temp_scans_bucket()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM storage.objects
    WHERE bucket_id = 'temp_scans'
      AND created_at < NOW() - INTERVAL '2 hours';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN 'Deleted ' || deleted_count || ' expired temporary scan files.';
END;
$$;

-- Schedule automatic cron job every hour
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Remove existing schedule if any to avoid duplication
        PERFORM cron.unschedule('cleanup-temp-scans-hourly');
        PERFORM cron.schedule(
            'cleanup-temp-scans-hourly',
            '0 * * * *',
            $$ SELECT public.cleanup_temp_scans_bucket(); $$
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END;
$$;
