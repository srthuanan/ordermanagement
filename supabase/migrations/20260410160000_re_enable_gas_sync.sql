-- Migration: Re-enable automated sync from Supabase to Google Sheets
-- Date: 2026-04-10
-- Objective: Restore real-time data synchronization between Supabase and Google Sheets via GAS Webhook.

-- 1. Ensure pg_net extension is active (required for http_post)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Restore the generic sync function with the correct GAS Webhook URL
CREATE OR REPLACE FUNCTION public.handle_supabase_sync()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
    -- GAS URL (VINFO SYNC 2.0)
    -- This is the central webhook that updates sheets based on incoming table changes.
    gas_url TEXT := 'https://script.google.com/macros/s/AKfycbwC_Xw8YcudogtxpPJztqjFdttcL4tgDaHIdgFWqGcnZ0M44oH6KVb-2r52OKPtLex0Fg/exec';
BEGIN
    -- Construct payload with table and action info
    payload := jsonb_build_object(
        'action', 'supabase_webhook',
        'type', TG_OP,
        'table', TG_TABLE_NAME,
        'record', CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
        'old_record', CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END
    );

    -- Fire asynchronous POST request via pg_net (low latency for database operations)
    PERFORM net.http_post(
        url := gas_url,
        body := payload,
        headers := '{"Content-Type": "application/json"}'::jsonb
    );

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Restore backward-compatibility alias if any old triggers still point to it
CREATE OR REPLACE FUNCTION public.handle_yeucauxhd_sync()
RETURNS TRIGGER AS $$
BEGIN
    RETURN public.handle_supabase_sync();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-attach triggers to all vital business tables
-- We use a loop to ensure all relevant tables listed in GAS configuration are synchronized.
DO $$
DECLARE
    t TEXT;
    -- List of tables mapped to Google Sheets
    tables_to_sync TEXT[] := ARRAY[
        'yeucauxhd', 'donhang', 'khoxe', 'yeucauvc', 'chinhsach', 
        'car_inquiries', 'thongtinxe', 'users', 'archived_orders', 
        'app_settings', 'interactions', 'donhang_ton', 'donhanghienhuu',
        'reputation_adjustments', 'test_drive_schedule', 'user_presence',
        'user_reputation_cache'
    ];
BEGIN
    FOREACH t IN ARRAY tables_to_sync LOOP
        -- Check if table exists in the public schema before applying trigger
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
            EXECUTE format('DROP TRIGGER IF EXISTS trg_sync_%I_to_gas ON public.%I', t, t);
            EXECUTE format('CREATE TRIGGER trg_sync_%I_to_gas AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.handle_supabase_sync()', t, t);
        END IF;
    END LOOP;
END $$;

COMMENT ON FUNCTION public.handle_supabase_sync IS 'Generic trigger to sync any table change to Google Sheets via GAS Webhook. restored on 2026-04-10.';
