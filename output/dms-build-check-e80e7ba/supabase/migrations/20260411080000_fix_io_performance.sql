-- Migration: Fix Disk IO performance issues for NANO tier
-- Date: 2026-04-11
-- Objective: Optimize triggers and indexes to reduce Disk IO usage and prevent connection timeouts.

-- 1. Optimize cleanup_old_notifications trigger
-- Performance: Reducing frequency from 100% to ~2% of inserts.
-- This prevents heavy table scans and deletes on every single notification/message.
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS TRIGGER AS $$
BEGIN
    -- Only run cleanup approximately 1 in 50 times (2% probability)
    -- This significantly reduces Disk IO while still keeping the table clean over time.
    IF random() > 0.02 THEN
        RETURN NEW;
    END IF;

    -- Part A: Delete notifications older than 14 days
    DELETE FROM public.interactions
    WHERE category = 'NOTIFICATION'
    AND created_at < NOW() - INTERVAL '14 days';

    -- Part B: Limit each recipient to 200 notifications
    -- We use a more efficient subquery if possible, but keeping logic consistent.
    DELETE FROM public.interactions
    WHERE id IN (
        SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY recipient ORDER BY created_at DESC) as rn
            FROM public.interactions
            WHERE category = 'NOTIFICATION'
            AND recipient = NEW.recipient
        ) t
        WHERE t.rn > 200
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Remove high-volume/non-critical tables from Google Sheets Sync
-- These tables generate frequent writes and syncing them via pg_net consumes massive Disk IO and Network credits.
-- Interactions (Logs/Notifications) and User Presence are the primary IO consumers.
DROP TRIGGER IF EXISTS trg_sync_interactions_to_gas ON public.interactions;
DROP TRIGGER IF EXISTS trg_sync_user_presence_to_gas ON public.user_presence;

COMMENT ON TABLE public.interactions IS 'Table for logs and notifications. Sync to GAS disabled to save Disk IO.';

-- 3. Ensure critical indexes exist for fast lookups
-- Indexes reduce Disk IO by avoiding full table scans.
CREATE INDEX IF NOT EXISTS idx_donhang_so_don_hang ON public.donhang (so_don_hang);
CREATE INDEX IF NOT EXISTS idx_yeucauxhd_so_don_hang ON public.yeucauxhd (so_don_hang);
CREATE INDEX IF NOT EXISTS idx_interactions_category_date ON public.interactions (category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_target_lookup ON public.interactions (target_view, target_id);
CREATE INDEX IF NOT EXISTS idx_khoxe_trang_thai ON public.khoxe (trang_thai);

-- 4. Optimize the main sync trigger to skip unnecessary updates
-- If multiple fields are updated but data doesn't change, don't fire.
-- This was already handled in migration 20260410160000 but re-verifying importance.

COMMENT ON FUNCTION public.cleanup_old_notifications IS 'Optimized cleanup: only runs 2% of the time to save Disk IO performance.';
