ALTER TABLE public.tvbh_maintenance_fees
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'manual';
