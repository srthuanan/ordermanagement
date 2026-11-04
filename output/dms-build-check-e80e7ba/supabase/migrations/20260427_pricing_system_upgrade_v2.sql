-- Update migration to include color pricing and more policies

-- Create table for color prices
CREATE TABLE IF NOT EXISTS public.car_color_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model TEXT NOT NULL,
    color_name TEXT NOT NULL,
    additional_price BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(model, color_name)
);

-- Seed color prices
INSERT INTO public.car_color_prices (model, color_name, additional_price) VALUES
('VF 3', 'Xanh lá nhạt (Urban Mint)', 8000000),
('VF 3', 'Hồng (Rose metallic)', 8000000),
('VF 3', 'Xanh lá (Tropical Jade)', 8000000),
('VF 5 Plus', 'Xanh lá nhạt (Urban Mint)', 8000000),
('VF 6', 'Xanh lá nhạt (Urban Mint)', 8000000),
('VF 7', 'Xanh lá nhạt (Urban Mint)', 12000000),
('VF 9 - pin CATL', 'Xanh lá đậm (Ivy Green)', 12000000),
('VF 9 - pin CATL', 'Bạc (Desat Silver)', 12000000),
('VF MPV 7', 'Xanh dương (Moonlit Ocean)', 10000000),
('VF MPV 7', 'Nâu (Introspective Brown)', 10000000)
ON CONFLICT (model, color_name) DO UPDATE SET additional_price = EXCLUDED.additional_price;

-- Add more policy rules from AI knowledge
INSERT INTO public.policy_deduction_rules (name, category, deduct_from_invoice, value, is_percentage, apply_to_models) VALUES
('Ưu đãi 2 năm bảo hiểm (quy đổi 15tr)', 'Ưu đãi dòng xe', TRUE, 15000000, FALSE, ARRAY['VF MPV 7']),
('Miễn phí màu nâng cao (Cọc tiên phong)', 'Ưu đãi dòng xe', TRUE, 0, FALSE, ARRAY['VF MPV 7']),
('Giảm 3 triệu đồng (Eco)', 'Ưu đãi dòng xe', TRUE, 3000000, FALSE, ARRAY['VF 3']),
('Ưu đãi 100% LPTB (theo chính sách NN)', 'Chính sách nhà nước', FALSE, 0, TRUE, NULL), -- Logic handle in UI or separate
('Voucher Sống Xanh (30tr)', 'Voucher', FALSE, 30000000, FALSE, ARRAY['VF 8 – pin CATL', 'VF 9 - pin CATL']),
('Voucher Sống Xanh (50tr)', 'Voucher', FALSE, 50000000, FALSE, ARRAY['VF 9 - pin CATL'])
ON CONFLICT (name) DO UPDATE SET 
    category = EXCLUDED.category,
    deduct_from_invoice = EXCLUDED.deduct_from_invoice,
    value = EXCLUDED.value,
    is_percentage = EXCLUDED.is_percentage,
    apply_to_models = EXCLUDED.apply_to_models;

-- RLS for color prices
ALTER TABLE public.car_color_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read color prices" ON public.car_color_prices FOR SELECT USING (true);
CREATE POLICY "Admin write color prices" ON public.car_color_prices FOR ALL 
USING (auth.jwt() ->> 'email' IN (SELECT email FROM public.users WHERE role = 'Admin'));
