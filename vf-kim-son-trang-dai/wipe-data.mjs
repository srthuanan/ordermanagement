import fetch from 'node-fetch';

const supabaseUrl = 'https://txcivsdgjkmlrjxramos.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4Y2l2c2RnamttbHJqeHJhbW9zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODY1MDYwOCwiZXhwIjoyMDk0MjI2NjA4fQ.zJhHCyEvpJQF3yKoxokYpJlY4dJY96sJBpB3IdQ5WcQ'; 

const sql = `
-- 1. Xóa các bảng dữ liệu (Trừ khoxe và master_khoxe)
-- (Sử dụng CASCADE nếu cần nhưng TRUNCATE an toàn hơn)

TRUNCATE TABLE public.yeucauxhd CASCADE;
TRUNCATE TABLE public.car_hold_activities CASCADE;
TRUNCATE TABLE public.donhang CASCADE;
TRUNCATE TABLE public.audit_logs CASCADE;
TRUNCATE TABLE public.vehicle_locations CASCADE;

-- 2. Đặt lại trạng thái tất cả các xe trong kho về "Chưa ghép"
UPDATE public.khoxe 
SET 
    trang_thai = 'Chưa ghép',
    nguoi_giu_xe = NULL,
    username_giu_xe = NULL,
    thoi_gian_het_han_giu = NULL,
    hold_until = NULL,
    is_extension_requested = false,
    extension_count = 0;

-- 3. Xóa các user khỏi bảng auth.users trừ Admin
DELETE FROM auth.users 
WHERE id != '446a22a6-0893-4045-b83d-a583f3b4d7ff';
`;

async function main() {
  console.log('Running wipe out script...');
  const response = await fetch(`${supabaseUrl}/functions/v1/run-sql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
    body: JSON.stringify({ sqlString: sql })
  });
  
  const text = await response.text();
  console.log('Response:', response.status, text);
}

main();
