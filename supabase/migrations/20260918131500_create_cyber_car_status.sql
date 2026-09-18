-- Migration: Create cyber_car_status summary cache table and enable Realtime
CREATE TABLE IF NOT EXISTS public.cyber_car_status (
    vin TEXT PRIMARY KEY,
    ma_kho TEXT,
    ten_kho TEXT,
    so_may TEXT,
    ma_kx TEXT,
    ten_kx TEXT,
    ma_mau TEXT,
    ten_mau TEXT,
    has_dnx BOOLEAN DEFAULT FALSE,
    so_ct_dnx TEXT,
    ngay_ct_dnx DATE,
    dnx_data JSONB,
    has_td4 BOOLEAN DEFAULT FALSE,
    so_ct_td4 TEXT,
    ngay_ct_td4 DATE,
    td4_data JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cyber_car_status_updated_at ON public.cyber_car_status (updated_at DESC);

ALTER TABLE public.cyber_car_status ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'cyber_car_status' AND policyname = 'Allow public read cyber_car_status'
    ) THEN
        CREATE POLICY "Allow public read cyber_car_status"
            ON public.cyber_car_status FOR SELECT
            USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'cyber_car_status' AND policyname = 'Allow all for service_role cyber_car_status'
    ) THEN
        CREATE POLICY "Allow all for service_role cyber_car_status"
            ON public.cyber_car_status FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.cyber_car_status;
    EXCEPTION
        WHEN duplicate_object THEN
            NULL;
    END;
END $$;
