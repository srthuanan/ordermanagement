import fetch from 'node-fetch';

const supabaseUrl = 'https://txcivsdgjkmlrjxramos.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4Y2l2c2RnamttbHJqeHJhbW9zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODY1MDYwOCwiZXhwIjoyMDk0MjI2NjA4fQ.zJhHCyEvpJQF3yKoxokYpJlY4dJY96sJBpB3IdQ5WcQ'; 

const sql = `
-- Cập nhật hàm title_case để xử lý các từ viết tắt như PKD, IT
CREATE OR REPLACE FUNCTION title_case(str text) RETURNS text AS $$
DECLARE
    result text;
BEGIN
    IF str IS NULL THEN RETURN NULL; END IF;
    
    result := initcap(lower(trim(str)));
    
    -- Replace specific acronyms
    result := replace(result, 'Pkd', 'PKD');
    result := replace(result, 'It', 'IT');
    result := replace(result, 'Htv', 'HTV');
    
    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Chạy cập nhật lại bảng profiles
UPDATE public.profiles 
SET department = title_case(department)
WHERE department != title_case(department) OR department ILIKE '%pkd%' OR department ILIKE '%it%';

NOTIFY pgrst, 'reload schema';
`;

async function main() {
  console.log('Running fix script...');
  const response = await fetch(`${supabaseUrl}/functions/v1/run-sql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
    body: JSON.stringify({ sqlString: sql })
  });
  
  const text = await response.text();
  console.log('Response:', response.status, text);
}

main();
