-- Migration: Temporarily disable reputation trigger to save Disk IO
-- Created: 2026-04-14 08:55

ALTER TABLE IF EXISTS public.car_hold_activities DISABLE TRIGGER on_activity_reputation_change;
