-- Migration: Disable synchronous sync from Supabase to Google Sheets (GAS)
-- Date: 2026-04-07

-- Redefine handle_supabase_sync to be a no-op
CREATE OR REPLACE FUNCTION public.handle_supabase_sync()
RETURNS TRIGGER AS $$
BEGIN
    -- Sync is currently disabled by request
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Redefine handle_yeucauxhd_sync to be a no-op just in case it is still used
CREATE OR REPLACE FUNCTION public.handle_yeucauxhd_sync()
RETURNS TRIGGER AS $$
BEGIN
    -- Sync is currently disabled by request
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_supabase_sync IS 'Disables real-time sync to Google Sheets.';
COMMENT ON FUNCTION public.handle_yeucauxhd_sync IS 'Disables old real-time sync to Google Sheets.';
