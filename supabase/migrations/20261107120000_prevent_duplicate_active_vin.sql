-- Migration: Prevent duplicate VIN pairing for active orders
-- Created: 2026-11-07
-- An active order is one that is NOT cancelled (ket_qua NOT ILIKE 'Đã hủy%') and has a non-empty VIN.

-- 1. Create a partial unique index on donhang(vin) for active orders
CREATE UNIQUE INDEX IF NOT EXISTS uq_donhang_active_vin
ON public.donhang (vin)
WHERE (vin IS NOT NULL AND trim(vin) <> '' AND ket_qua NOT ILIKE 'Đã hủy%');

