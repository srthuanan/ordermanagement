CREATE TABLE IF NOT EXISTS public.crm_lead_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ten_tvbh TEXT NOT NULL,
    lead_count INTEGER NOT NULL DEFAULT 61,
    amount NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'completed')),
    sepay_transaction_id TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.crm_lead_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations for anon" ON public.crm_lead_orders;
CREATE POLICY "Allow all operations for anon" ON public.crm_lead_orders FOR ALL USING (true) WITH CHECK (true);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'crm_lead_orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_lead_orders;
    END IF;
END $$;
