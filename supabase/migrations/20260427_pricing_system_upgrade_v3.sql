-- Add optional equipment prices and more policies

INSERT INTO public.policy_deduction_rules (name, category, deduct_from_invoice, value, is_percentage, apply_to_models) VALUES
('HUD (Hiển thị kính lái)', 'Trang bị tùy chọn', TRUE, 10000000, FALSE, ARRAY['VF 7']),
('Hai cầu (AWD)', 'Trang bị tùy chọn', TRUE, 50000000, FALSE, ARRAY['VF 7']),
('6 chỗ ghế cơ trưởng', 'Trang bị tùy chọn', TRUE, 32000000, FALSE, ARRAY['VF 9 - pin CATL']),
('Điều hòa 2 vùng (giảm)', 'Trang bị tùy chọn', TRUE, -15000000, FALSE, ARRAY['VF 9 - pin CATL']),
('Tiêu điểm VPoint (quy đổi)', 'Thanh toán', FALSE, 1, FALSE, NULL) -- Value will be custom in UI usually, but keep placeholder
ON CONFLICT (name) DO UPDATE SET 
    category = EXCLUDED.category,
    deduct_from_invoice = EXCLUDED.deduct_from_invoice,
    value = EXCLUDED.value,
    is_percentage = EXCLUDED.is_percentage,
    apply_to_models = EXCLUDED.apply_to_models;
