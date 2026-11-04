-- CONSOLIDATED PRICING SYSTEM MIGRATION (2026-04-27)
-- This file merges all pricing data, color surcharges, and policy rules from AI knowledge.

-- 1. TABLES SETUP
CREATE TABLE IF NOT EXISTS public.car_prices_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model TEXT NOT NULL,
    version TEXT NOT NULL,
    type TEXT NOT NULL, -- SOP1, SOP2, NC (Nâng cấp)
    msrp_price BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(model, version, type)
);

CREATE TABLE IF NOT EXISTS public.car_color_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model TEXT NOT NULL,
    color_name TEXT NOT NULL,
    additional_price BIGINT NOT NULL, -- Negative for discounts
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(model, color_name)
);

CREATE TABLE IF NOT EXISTS public.policy_deduction_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL, -- Giảm giá trực tiếp, Phân hạng VinClub, Đối tượng đặc biệt, Voucher, Trang bị tùy chọn, Chương trình 2026, CSBH
    rule_type TEXT DEFAULT 'DISCOUNT', -- 'DISCOUNT' or 'SURCHARGE'
    deduct_from_invoice BOOLEAN DEFAULT TRUE,
    value NUMERIC NOT NULL,
    is_percentage BOOLEAN DEFAULT FALSE,
    apply_to_models TEXT[], -- Array of model names, NULL means all
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure description and rule_type columns exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='policy_deduction_rules' AND column_name='description') THEN
        ALTER TABLE public.policy_deduction_rules ADD COLUMN description TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='policy_deduction_rules' AND column_name='rule_type') THEN
        ALTER TABLE public.policy_deduction_rules ADD COLUMN rule_type TEXT DEFAULT 'DISCOUNT';
    END IF;
END $$;

-- 2. RLS & POLICIES
ALTER TABLE public.car_prices_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_color_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_deduction_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read car prices" ON public.car_prices_master;
CREATE POLICY "Public read car prices" ON public.car_prices_master FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin write car prices" ON public.car_prices_master;
CREATE POLICY "Admin write car prices" ON public.car_prices_master FOR ALL 
USING (auth.jwt() ->> 'email' IN (SELECT email FROM public.users WHERE role = 'Admin'));

DROP POLICY IF EXISTS "Public read color prices" ON public.car_color_prices;
CREATE POLICY "Public read color prices" ON public.car_color_prices FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin write color prices" ON public.car_color_prices;
CREATE POLICY "Admin write color prices" ON public.car_color_prices FOR ALL 
USING (auth.jwt() ->> 'email' IN (SELECT email FROM public.users WHERE role = 'Admin'));

DROP POLICY IF EXISTS "Public read policy rules" ON public.policy_deduction_rules;
CREATE POLICY "Public read policy rules" ON public.policy_deduction_rules FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin write policy rules" ON public.policy_deduction_rules;
CREATE POLICY "Admin write policy rules" ON public.policy_deduction_rules FOR ALL 
USING (auth.jwt() ->> 'email' IN (SELECT email FROM public.users WHERE role = 'Admin'));

-- 3. SEED DATA: MASTER CAR PRICES
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
('VF 9 - pin CATL', 'Plus - trần thép', 'SOP1', 1699000000),
('Lạc Hồng 900', 'Base', 'SOP1', 5000000000),
('Lạc Hồng 900', 'Chống đạn', 'SOP1', 36000000000),
('Minio Green', 'Base', 'SOP1', 269000000),
('EC Van', 'Tiêu chuẩn', 'SOP1', 285000000),
('EC Van', 'Nâng cao', 'SOP1', 305000000),
('EC Van', 'Nâng cao + cửa trượt', 'SOP1', 325000000),
('Herio Green', 'Base', 'SOP2', 479000000),
('Herio Green', 'Base', 'SOP1', 499000000),
('Nerio Green', 'Base', 'SOP1', 668000000),
('Limo Green', 'Base', 'SOP1', 749000000)
ON CONFLICT (model, version, type) DO UPDATE SET msrp_price = EXCLUDED.msrp_price;

-- 4. SEED DATA: COLOR PRICES
INSERT INTO public.car_color_prices (model, color_name, additional_price) VALUES
('VF 3', 'Xanh lá nhạt (Urban Mint)', 8000000),
('VF 3', 'Hồng (Rose metallic)', 8000000),
('VF 3', 'Xanh lá (Tropical Jade)', 8000000),
('VF 5 Plus', 'Xanh lá nhạt (Urban Mint)', 8000000),
('VF 6', 'Xanh lá nhạt (Urban Mint)', 8000000),
('VF 7', 'Xanh lá nhạt (Urban Mint)', 12000000),
('VF 7', 'Xanh (Đặc biệt)', -20000000), -- Giảm 20tr cho màu xanh so với tiêu chuẩn? logic check needed
('VF 8 – pin CATL', 'Xanh lá nhạt (Urban Mint)', 12000000),
('VF 8 – pin CATL', 'Bạc (Desat Silver)', 12000000),
('VF 9 - pin CATL', 'Xanh lá đậm (Ivy Green)', 12000000),
('VF 9 - pin CATL', 'Bạc (Desat Silver)', 12000000),
('VF MPV 7', 'Xanh dương (Moonlit Ocean)', 10000000),
('VF MPV 7', 'Nâu (Introspective Brown)', 10000000)
ON CONFLICT (model, color_name) DO UPDATE SET additional_price = EXCLUDED.additional_price;

-- 5. SEED DATA: POLICY RULES
INSERT INTO public.policy_deduction_rules (name, category, rule_type, deduct_from_invoice, value, is_percentage, apply_to_models, description) VALUES
-- Giảm giá trực tiếp (Cố định)
('Giảm giá VF 8 Eco (104tr)', 'Giảm giá trực tiếp', 'DISCOUNT', TRUE, 104000000, FALSE, ARRAY['VF 8 – pin CATL'], NULL),
('Giảm giá VF 8 Plus (110tr)', 'Giảm giá trực tiếp', 'DISCOUNT', TRUE, 110000000, FALSE, ARRAY['VF 8 – pin CATL'], NULL),
('Giảm giá VF 9 Eco (125tr)', 'Giảm giá trực tiếp', 'DISCOUNT', TRUE, 125000000, FALSE, ARRAY['VF 9 - pin CATL'], NULL),
('Giảm giá VF 9 Plus (135tr)', 'Giảm giá trực tiếp', 'DISCOUNT', TRUE, 135000000, FALSE, ARRAY['VF 9 - pin CATL'], NULL),
('Giảm giá VF 7 Plus (50tr)', 'Giảm giá trực tiếp', 'DISCOUNT', TRUE, 50000000, FALSE, ARRAY['VF 7'], NULL),
('Giảm giá VF 8 Eco 2 cầu (50tr)', 'Giảm giá trực tiếp', 'DISCOUNT', TRUE, 50000000, FALSE, ARRAY['VF 8 – pin CATL'], NULL),
('Giảm giá VF 8 Eco 1 cầu (20tr)', 'Giảm giá trực tiếp', 'DISCOUNT', TRUE, 20000000, FALSE, ARRAY['VF 8 – pin CATL'], NULL),
('Giảm giá VF 3 Eco (3tr)', 'Giảm giá trực tiếp', 'DISCOUNT', TRUE, 3000000, FALSE, ARRAY['VF 3'], 'Dành cho bản Eco - Tiêu chuẩn 1'),

-- Chương trình 2026 (Mãnh liệt Việt Nam)
('Mãnh liệt vì tương lai xanh (6%)', 'Chương trình 2026', 'DISCOUNT', TRUE, 6, TRUE, ARRAY['VF 3', 'VF 5', 'VF 6', 'VF 7', 'VF MPV 7', 'EC Van', 'Minio Green', 'Herio Green', 'Nerio Green', 'Limo Green'], 'Ưu đãi 6% MSRP'),
('Mãnh liệt vì tương lai xanh (10%)', 'Chương trình 2026', 'DISCOUNT', TRUE, 10, TRUE, ARRAY['VF 8 – pin CATL', 'VF 9 - pin CATL'], 'Ưu đãi 10% MSRP'),
('Thu xăng đổi điện (3%)', 'Chương trình 2026', 'DISCOUNT', TRUE, 3, TRUE, NULL, 'Giảm 3% MSRP cho KH chuyển đổi'),

-- Phân hạng VinClub
('Hạng Diamond (1.5%)', 'Phân hạng VinClub', 'DISCOUNT', TRUE, 1.5, TRUE, NULL, NULL),
('Hạng Platinum (1%)', 'Phân hạng VinClub', 'DISCOUNT', TRUE, 1, TRUE, NULL, NULL),
('Hạng Gold (0.5%)', 'Phân hạng VinClub', 'DISCOUNT', TRUE, 0.5, TRUE, NULL, NULL),

-- Đối tượng đặc biệt
('Ưu đãi Công an/Quân đội (5%)', 'Đối tượng đặc biệt', 'DISCOUNT', TRUE, 5, TRUE, NULL, 'Giảm 5% MSRP gồm VAT'),

-- Chính sách bán hàng (Lộc về nhà)
('Lái xe mới - Lộc về nhà (8tr)', 'CSBH', 'DISCOUNT', FALSE, 8000000, FALSE, NULL, 'Tặng tiền mặt (không trừ hóa đơn)'),

-- Ưu đãi dòng xe & Trang bị
('Ưu đãi 2 năm bảo hiểm (quy đổi 15tr)', 'Ưu đãi dòng xe', 'DISCOUNT', TRUE, 15000000, FALSE, ARRAY['VF MPV 7'], 'Quy đổi 15 triệu tiền mặt'),
('Miễn phí màu nâng cao (Cọc tiên phong)', 'Ưu đãi dòng xe', 'DISCOUNT', TRUE, 0, FALSE, ARRAY['VF MPV 7', 'VF 3'], 'Dành cho cọc tiên phong'),
('6 chỗ ghế cơ trưởng (VF 9)', 'Trang bị tùy chọn', 'SURCHARGE', TRUE, 32000000, FALSE, ARRAY['VF 9 - pin CATL'], 'Cộng thêm 32 triệu'),
('Trần kính toàn cảnh (VF 9)', 'Trang bị tùy chọn', 'SURCHARGE', TRUE, 29000000, FALSE, ARRAY['VF 9 - pin CATL'], 'Cộng thêm 29 triệu'),
('HUD (Hiển thị kính lái)', 'Trang bị tùy chọn', 'SURCHARGE', TRUE, 10000000, FALSE, ARRAY['VF 7'], 'Cộng thêm 10 triệu cho Eco'),
('Hai cầu (AWD)', 'Trang bị tùy chọn', 'SURCHARGE', TRUE, 50000000, FALSE, ARRAY['VF 7'], 'Cộng thêm 50 triệu cho Plus Tiêu chuẩn'),
('Điều hòa 2 vùng (giảm)', 'Trang bị tùy chọn', 'DISCOUNT', TRUE, 15000000, FALSE, ARRAY['VF 9 - pin CATL'], 'Giảm 15 triệu so với 3 vùng'),

-- Voucher (Giảm thu)
('Voucher Giờ Trái Đất (5tr)', 'Voucher', 'DISCOUNT', FALSE, 5000000, FALSE, ARRAY['VF 3', 'Minio Green', 'EC Van'], NULL),
('Voucher Giờ Trái Đất (7tr)', 'Voucher', 'DISCOUNT', FALSE, 7000000, FALSE, ARRAY['VF 5', 'Herio Green'], NULL),
('Voucher Giờ Trái Đất (10tr)', 'Voucher', 'DISCOUNT', FALSE, 10000000, FALSE, ARRAY['VF 6', 'Limo Green', 'VF MPV 7'], NULL),
('Voucher Giờ Trái Đất (15tr)', 'Voucher', 'DISCOUNT', FALSE, 15000000, FALSE, ARRAY['VF 7', 'VF 8 – pin CATL'], NULL),
('Voucher Giờ Trái Đất (20tr)', 'Voucher', 'DISCOUNT', FALSE, 20000000, FALSE, ARRAY['VF 9 - pin CATL'], NULL),
('Voucher Sống Xanh (30tr)', 'Voucher', 'DISCOUNT', FALSE, 30000000, FALSE, ARRAY['VF 8 – pin CATL', 'VF 9 - pin CATL'], NULL),
('Voucher Sống Xanh (50tr)', 'Voucher', 'DISCOUNT', FALSE, 50000000, FALSE, ARRAY['VF 9 - pin CATL'], NULL)
ON CONFLICT (name) DO UPDATE SET 
    category = EXCLUDED.category,
    rule_type = EXCLUDED.rule_type,
    deduct_from_invoice = EXCLUDED.deduct_from_invoice,
    value = EXCLUDED.value,
    is_percentage = EXCLUDED.is_percentage,
    apply_to_models = EXCLUDED.apply_to_models,
    description = EXCLUDED.description;
