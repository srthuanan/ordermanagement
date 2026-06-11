CREATE TABLE IF NOT EXISTS public.vehicle_configs (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('line', 'version', 'exterior', 'interior')),
  value text not null,
  parent_value text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

ALTER TABLE public.vehicle_configs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'vehicle_configs' AND policyname = 'Allow public full access on vehicle_configs'
  ) THEN
    CREATE POLICY "Allow public full access on vehicle_configs" ON public.vehicle_configs FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Insert default lines and versions based on constants.ts
INSERT INTO public.vehicle_configs (type, value, parent_value) VALUES
('line', 'VF 3', null),
('version', 'Base', 'VF 3'),
('version', 'Base Tiêu chuẩn 2', 'VF 3'),
('version', 'Plus', 'VF 3'),

('line', 'VF 5', null),
('version', 'Plus', 'VF 5'),

('line', 'VF 6', null),
('version', 'Eco Tiêu chuẩn', 'VF 6'),
('version', 'Plus Tiêu chuẩn 2', 'VF 6'),

('line', 'VF 7', null),
('version', 'Eco', 'VF 7'),
('version', 'Eco_HUD', 'VF 7'),
('version', 'Plus_Metal Nâng cấp', 'VF 7'),
('version', 'Plus_Metal Tiêu chuẩn', 'VF 7'),
('version', 'Plus Tiêu chuẩn', 'VF 7'),
('version', 'Plus Nâng cấp', 'VF 7'),
('version', 'Eco Tiêu chuẩn 1', 'VF 7'),
('version', 'Eco Tiêu chuẩn 2', 'VF 7'),
('version', 'Eco_HUD Tiêu chuẩn 1', 'VF 7'),
('version', 'Eco_HUD Tiêu chuẩn 2', 'VF 7'),
('version', 'Plus_Metal Tiêu chuẩn 1', 'VF 7'),
('version', 'Plus_Metal Tiêu chuẩn 2', 'VF 7'),
('version', 'Plus Tiêu chuẩn 2', 'VF 7'),
('version', 'Plus Tiêu chuẩn 1', 'VF 7'),
('version', 'Plus_Metal Tiêu chuẩn 1 (FWD)', 'VF 7'),
('version', 'Plus_Metal Tiêu chuẩn 1 (AWD)', 'VF 7'),
('version', 'Plus_Metal Tiêu chuẩn 2 (1 Cầu)', 'VF 7'),
('version', 'Plus_Metal Tiêu chuẩn 2 (2 Cầu)', 'VF 7'),

('line', 'VF 8', null),
('version', 'Eco Tiêu chuẩn', 'VF 8'),
('version', 'Eco Nâng cấp', 'VF 8'),
('version', 'Plus', 'VF 8'),
('version', 'Eco_US', 'VF 8'),
('version', 'Plus_US', 'VF 8'),
('version', 'All New', 'VF 8'),

('line', 'VF 9', null),
('version', 'Plus_CAP_Metal_3ZONES', 'VF 9'),
('version', 'Plus_Metal_3ZONES', 'VF 9'),
('version', 'Eco_3ZONES', 'VF 9'),
('version', 'Plus_Metal', 'VF 9'),
('version', 'Plus_CAP_Metal', 'VF 9'),
('version', 'Plus_CAP', 'VF 9'),

('line', 'HERIO', null),
('version', 'HERIO', 'HERIO'),

('line', 'NERIO', null),
('version', 'NERIO', 'NERIO'),

('line', 'LIMO', null),
('version', 'LIMO', 'LIMO'),

('line', 'VF LIMO', null),
('version', 'MPV 7', 'VF LIMO'),

('line', 'MINIO', null),
('version', 'MINIO', 'MINIO'),

('line', 'EC Van', null),
('version', 'Base', 'EC Van'),
('version', 'Plus', 'EC Van'),
('version', 'Plus_Cửa trượt', 'EC Van'),

-- Colors
('exterior', 'Brahminy White (CE18)', null),
('exterior', 'Yellow (CE1U)', null),
('exterior', 'Sunset ORB (CE1A)', null),
('exterior', 'Crimson Red (CE1M)', null),
('exterior', 'Vinfast Blue (CE1N)', null),
('exterior', 'Neptune Grey (CE14)', null),
('exterior', 'Jet Black (CE11)', null),
('exterior', 'Electric Blue (CE1J)', null),
('exterior', 'Zenith Grey (CE1V)', null),
('exterior', 'Jet Black Roof- Summer Yellow Body (111U)', null),
('exterior', 'Brahminy White Roof- Aquatic Azure Body (181Y)', null),
('exterior', 'Brahminy White Roof- Rose Pink Body (1821)', null),
('exterior', 'Brahminy White Roof - Iris Berry Body (181X)', null),
('exterior', 'Urbant Mint (CE1W)', null),
('exterior', 'Vinbus Green (CE2B)', null),
('exterior', 'Deep Ocean (CE1H)', null),
('exterior', 'Brahminy White Roof- Summer Yellow Body (181U)', null),
('exterior', 'Iris Berry (CE1X)', null),
('exterior', 'Zenith Grey-desat Silver Roof (171V)', null),
('exterior', 'Urbant Mint Green - Desat Silv (171W)', null),
('exterior', 'Ivy Green-desat Silver Roof (1722)', null),
('exterior', 'Atlantic Blue-Aquatic Azure Ro (1Y26)', null),
('exterior', 'Jet Black-Champagne Creme Roof (2311)', null),
('exterior', 'Infinity Blanc _ Silky White R (2418)', null),
('exterior', 'Champagne Creme - Matte Champa (2523)', null),
('exterior', 'Jet Black - Graphite Roof (2811)', null),
('exterior', 'Crimson Velvet - Mystery Bronz (2927)', null),
('exterior', 'Ivy_Green_GNE (CE22)', null),
('exterior', 'Champagne_Creme_YLG (CE23)', null),
('exterior', 'Crimson Red - Jet Black Roof (111M)', null),
('exterior', 'Infinity Blanc_Zenith Grey Roof (1v18)', null),
('exterior', 'Deep Ocean_Jet Black Roof (111H)', null),
('exterior', 'Alantic Blue_Denim Blue Roof (2A26)', null),
('exterior', 'Jet Black_Mystery Bronze Roof (2911)', null),
('exterior', 'Champagne Creme_Infinity Blanc Roof (1823)', null),
('exterior', 'Silver (CE17)', null),
('exterior', 'Pink Gold (CE2K)', null),
('exterior', 'Solar Ruby (CE2Q)', null),
('exterior', 'Moonlit Ocean (CE2J)', null),
('exterior', 'Infinity Blanc Roof-Sky Blue (182G)', null),
('exterior', 'Introspective Brown (CE2N)', null),

('interior', 'Black', null),
('interior', 'Brown', null),
('interior', 'Beige', null),
('interior', 'Grey', null)
ON CONFLICT DO NOTHING;
