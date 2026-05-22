import fetch from 'node-fetch';

const supabaseUrl = 'https://txcivsdgjkmlrjxramos.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4Y2l2c2RnamttbHJqeHJhbW9zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODY1MDYwOCwiZXhwIjoyMDk0MjI2NjA4fQ.zJhHCyEvpJQF3yKoxokYpJlY4dJY96sJBpB3IdQ5WcQ'; 

const sql = `
-- Hàm helper để Title Case (Viết hoa chữ cái đầu mỗi từ)
CREATE OR REPLACE FUNCTION title_case(str text) RETURNS text AS $$
DECLARE
    result text;
BEGIN
    IF str IS NULL THEN RETURN NULL; END IF;
    -- Chuyển tất cả về chữ thường trước, sau đó viết hoa chữ cái đầu mỗi từ (sử dụng initcap)
    RETURN initcap(lower(trim(str)));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 1. Hàm Trigger dùng chung để chuẩn hóa dữ liệu
CREATE OR REPLACE FUNCTION trg_normalize_data() RETURNS trigger AS $$
BEGIN
    -- IN HOA cho các trường VIN, Số máy, Số đơn hàng
    IF TG_TABLE_NAME = 'khoxe' THEN
        IF NEW.vin IS NOT NULL THEN NEW.vin = upper(trim(NEW.vin)); END IF;
        IF NEW.so_may IS NOT NULL THEN NEW.so_may = upper(trim(NEW.so_may)); END IF;
        IF NEW.nguoi_giu_xe IS NOT NULL THEN NEW.nguoi_giu_xe = title_case(NEW.nguoi_giu_xe); END IF;
    END IF;

    IF TG_TABLE_NAME = 'donhang' THEN
        IF NEW.so_don_hang IS NOT NULL THEN NEW.so_don_hang = upper(trim(NEW.so_don_hang)); END IF;
        IF NEW.vin IS NOT NULL THEN NEW.vin = upper(trim(NEW.vin)); END IF;
        IF NEW.ten_khach_hang IS NOT NULL THEN NEW.ten_khach_hang = title_case(NEW.ten_khach_hang); END IF;
        IF NEW.ten_tu_van_ban_hang IS NOT NULL THEN NEW.ten_tu_van_ban_hang = title_case(NEW.ten_tu_van_ban_hang); END IF;
    END IF;

    IF TG_TABLE_NAME = 'yeucauxhd' THEN
        IF NEW.so_don_hang IS NOT NULL THEN NEW.so_don_hang = upper(trim(NEW.so_don_hang)); END IF;
        IF NEW.vin IS NOT NULL THEN NEW.vin = upper(trim(NEW.vin)); END IF;
        IF NEW.so_may IS NOT NULL THEN NEW.so_may = upper(trim(NEW.so_may)); END IF;
        IF NEW.ten_khach_hang IS NOT NULL THEN NEW.ten_khach_hang = title_case(NEW.ten_khach_hang); END IF;
        IF NEW.tvbh IS NOT NULL THEN NEW.tvbh = title_case(NEW.tvbh); END IF;
    END IF;

    IF TG_TABLE_NAME = 'profiles' THEN
        IF NEW.full_name IS NOT NULL THEN NEW.full_name = title_case(NEW.full_name); END IF;
        IF NEW.department IS NOT NULL THEN NEW.department = title_case(NEW.department); END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Gắn Triggers (Xóa cũ nếu có rồi tạo mới)
DROP TRIGGER IF EXISTS trg_khoxe_normalize ON public.khoxe;
CREATE TRIGGER trg_khoxe_normalize BEFORE INSERT OR UPDATE ON public.khoxe FOR EACH ROW EXECUTE FUNCTION trg_normalize_data();

DROP TRIGGER IF EXISTS trg_donhang_normalize ON public.donhang;
CREATE TRIGGER trg_donhang_normalize BEFORE INSERT OR UPDATE ON public.donhang FOR EACH ROW EXECUTE FUNCTION trg_normalize_data();

DROP TRIGGER IF EXISTS trg_yeucauxhd_normalize ON public.yeucauxhd;
CREATE TRIGGER trg_yeucauxhd_normalize BEFORE INSERT OR UPDATE ON public.yeucauxhd FOR EACH ROW EXECUTE FUNCTION trg_normalize_data();

DROP TRIGGER IF EXISTS trg_profiles_normalize ON public.profiles;
CREATE TRIGGER trg_profiles_normalize BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION trg_normalize_data();

-- 3. Chạy cập nhật tự động toàn bộ dữ liệu hiện tại trong DB
UPDATE public.khoxe 
SET 
    vin = upper(trim(vin)),
    so_may = upper(trim(so_may)),
    nguoi_giu_xe = title_case(nguoi_giu_xe)
WHERE vin != upper(trim(vin)) OR so_may != upper(trim(so_may)) OR nguoi_giu_xe != title_case(nguoi_giu_xe);

UPDATE public.donhang 
SET 
    so_don_hang = upper(trim(so_don_hang)),
    vin = upper(trim(vin)),
    ten_khach_hang = title_case(ten_khach_hang),
    ten_tu_van_ban_hang = title_case(ten_tu_van_ban_hang)
WHERE so_don_hang != upper(trim(so_don_hang)) OR vin != upper(trim(vin)) OR ten_khach_hang != title_case(ten_khach_hang) OR ten_tu_van_ban_hang != title_case(ten_tu_van_ban_hang);

UPDATE public.yeucauxhd 
SET 
    so_don_hang = upper(trim(so_don_hang)),
    vin = upper(trim(vin)),
    so_may = upper(trim(so_may)),
    ten_khach_hang = title_case(ten_khach_hang),
    tvbh = title_case(tvbh)
WHERE so_don_hang != upper(trim(so_don_hang)) OR vin != upper(trim(vin)) OR so_may != upper(trim(so_may)) OR ten_khach_hang != title_case(ten_khach_hang) OR tvbh != title_case(tvbh);

UPDATE public.profiles 
SET 
    full_name = title_case(full_name),
    department = title_case(department)
WHERE full_name != title_case(full_name) OR department != title_case(department);

NOTIFY pgrst, 'reload schema';
`;

async function main() {
  console.log('Running normalization script...');
  const response = await fetch(`${supabaseUrl}/functions/v1/run-sql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
    body: JSON.stringify({ sqlString: sql })
  });
  
  const text = await response.text();
  console.log('Response:', response.status, text);
}

main();
