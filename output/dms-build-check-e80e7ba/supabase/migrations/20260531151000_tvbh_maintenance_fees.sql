CREATE TABLE IF NOT EXISTS public.tvbh_maintenance_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ten_tvbh TEXT NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 50000,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'exempt')),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(ten_tvbh, month, year)
);

-- Bật RLS
ALTER TABLE public.tvbh_maintenance_fees ENABLE ROW LEVEL SECURITY;

-- Policy: Admin có toàn quyền (mặc định bằng anon key nếu không phân quyền khắt khe)
CREATE POLICY "Allow all operations for anon" ON public.tvbh_maintenance_fees FOR ALL USING (true) WITH CHECK (true);

-- Trigger cập nhật updated_at
CREATE OR REPLACE FUNCTION update_tvbh_maintenance_fees_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tvbh_maintenance_fees_updated_at
    BEFORE UPDATE ON public.tvbh_maintenance_fees
    FOR EACH ROW
    EXECUTE FUNCTION update_tvbh_maintenance_fees_updated_at_column();
