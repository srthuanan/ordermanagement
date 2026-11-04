-- Add UNIQUE constraint to so_don_hang on archived_orders to support ON CONFLICT upsert
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'archived_orders_so_don_hang_key'
    ) THEN
        ALTER TABLE public.archived_orders 
        ADD CONSTRAINT archived_orders_so_don_hang_key UNIQUE (so_don_hang);
    END IF;
END $$;
