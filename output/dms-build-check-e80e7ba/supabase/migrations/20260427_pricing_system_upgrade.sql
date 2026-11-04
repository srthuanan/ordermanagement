-- Migration to upgrade pricing system with database-driven rules

-- Create table for master car prices
CREATE TABLE IF NOT EXISTS public.car_prices_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model TEXT NOT NULL,
    version TEXT NOT NULL,
    type TEXT NOT NULL, -- SOP1, SOP2, NC
    msrp_price BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(model, version, type)
);

-- Create table for policy deduction rules
CREATE TABLE IF NOT EXISTS public.policy_deduction_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    deduct_from_invoice BOOLEAN DEFAULT TRUE,
    value NUMERIC NOT NULL,
    is_percentage BOOLEAN DEFAULT FALSE,
    apply_to_models TEXT[], -- Array of model names, NULL means all
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.car_prices_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_deduction_rules ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read car prices" ON public.car_prices_master FOR SELECT USING (true);
CREATE POLICY "Public read policy rules" ON public.policy_deduction_rules FOR SELECT USING (true);

-- Admin write access
CREATE POLICY "Admin write car prices" ON public.car_prices_master FOR ALL 
USING (auth.jwt() ->> 'email' IN (SELECT email FROM public.users WHERE role = 'Admin'));

CREATE POLICY "Admin write policy rules" ON public.policy_deduction_rules FOR ALL 
USING (auth.jwt() ->> 'email' IN (SELECT email FROM public.users WHERE role = 'Admin'));

-- Seed data for car prices
INSERT INTO public.car_prices_master (model, version, type, msrp_price) VALUES
('VF 3', 'Eco', 'SOP2', 302000000),
('VF 3', 'Eco', 'SOP1', 299000000),
('VF 3', 'Plus', 'SOP2', 315000000),
('VF 5', 'Plus', 'SOP1', 529000000),
('VF 6', 'Eco', 'SOP1', 689000000),
('VF 6', 'Eco', 'NC', 694000000),
('VF 6', 'Plus', 'SOP2', 745000000),
('VF 6', 'Plus', 'SOP1', 749000000),
('VF 6', 'Plus', 'NC', 759000000),
('VF MPV 7', 'Base', 'SOP2', 819000000),
('VF 7', 'Eco', 'SOP2', 789000000),
('VF 7', 'Eco', 'SOP1', 799000000),
('VF 7', 'Plus - trần thép', 'SOP2', 889000000),
('VF 7', 'Plus - trần thép', 'SOP1', 949000000),
('VF 7', 'Plus - trần thép', 'NC', 999000000),
('VF 7', 'Plus - trần kính', 'SOP2', 909000000),
('VF 7', 'Plus - trần kính', 'SOP1', 969000000),
('VF 7', 'Plus - trần kính', 'NC', 1019000000),
('VF 8 – pin CATL', 'Eco', 'SOP1', 1019000000),
('VF 8 – pin CATL', 'Eco', 'NC', 1069000000),
('VF 8 – pin CATL', 'Plus', 'SOP1', 1199000000),
('VF 9 - pin CATL', 'Eco', 'SOP1', 1499000000),
('VF 9 - pin CATL', 'Plus - trần thép', 'SOP1', 1699000000)
ON CONFLICT (model, version, type) DO UPDATE SET msrp_price = EXCLUDED.msrp_price;

-- Seed data for policy rules
INSERT INTO public.policy_deduction_rules (name, category, deduct_from_invoice, value, is_percentage, apply_to_models) VALUES
('Giảm giá VF 8 Eco (104tr)', 'Giảm giá trực tiếp', TRUE, 104000000, FALSE, ARRAY['VF 8 – pin CATL']),
('Giảm giá VF 8 Plus (110tr)', 'Giảm giá trực tiếp', TRUE, 110000000, FALSE, ARRAY['VF 8 – pin CATL']),
('Giảm giá VF 9 Eco (125tr)', 'Giảm giá trực tiếp', TRUE, 125000000, FALSE, ARRAY['VF 9 - pin CATL']),
('Giảm giá VF 9 Plus (135tr)', 'Giảm giá trực tiếp', TRUE, 135000000, FALSE, ARRAY['VF 9 - pin CATL']),
('Hạng Diamond (1.5%)', 'Phân hạng VinClub', TRUE, 1.5, TRUE, NULL),
('Hạng Platinum (1%)', 'Phân hạng VinClub', TRUE, 1, TRUE, NULL),
('Hạng Gold (0.5%)', 'Phân hạng VinClub', TRUE, 0.5, TRUE, NULL),
('Ưu đãi Công an/Quân đội (5%)', 'Đối tượng đặc biệt', TRUE, 5, TRUE, NULL),
('Ưu đãi tiền mặt MPV7 (15tr)', 'Ưu đãi dòng xe', TRUE, 15000000, FALSE, ARRAY['VF MPV 7']),
('Giảm giá VF 3 Eco (3tr)', 'Ưu đãi dòng xe', TRUE, 3000000, FALSE, ARRAY['VF 3']),
('Voucher Giờ Trái Đất (5tr)', 'Voucher', FALSE, 5000000, FALSE, ARRAY['VF 3']),
('Voucher Giờ Trái Đất (7tr)', 'Voucher', FALSE, 7000000, FALSE, ARRAY['VF 5']),
('Voucher Giờ Trái Đất (10tr)', 'Voucher', FALSE, 10000000, FALSE, ARRAY['VF 6', 'VF MPV 7']),
('Voucher Giờ Trái Đất (15tr)', 'Voucher', FALSE, 15000000, FALSE, ARRAY['VF 7', 'VF 8 – pin CATL']),
('Voucher Giờ Trái Đất (20tr)', 'Voucher', FALSE, 20000000, FALSE, ARRAY['VF 9 - pin CATL'])
ON CONFLICT (name) DO UPDATE SET 
    category = EXCLUDED.category,
    deduct_from_invoice = EXCLUDED.deduct_from_invoice,
    value = EXCLUDED.value,
    is_percentage = EXCLUDED.is_percentage,
    apply_to_models = EXCLUDED.apply_to_models;
