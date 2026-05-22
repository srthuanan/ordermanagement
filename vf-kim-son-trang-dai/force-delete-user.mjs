import fetch from 'node-fetch';

const supabaseUrl = 'https://txcivsdgjkmlrjxramos.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4Y2l2c2RnamttbHJqeHJhbW9zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODY1MDYwOCwiZXhwIjoyMDk0MjI2NjA4fQ.zJhHCyEvpJQF3yKoxokYpJlY4dJY96sJBpB3IdQ5WcQ'; 

const sql = `
  -- Kiểm tra xem user có tồn tại trong auth.users hay auth.identities không
  -- Nếu có thì xóa sạch đi để tạo lại
  DELETE FROM auth.users WHERE email = 'vinphatmiendong@gmail.com';
`;

async function main() {
  const response = await fetch(`${supabaseUrl}/functions/v1/run-sql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
    body: JSON.stringify({ sqlString: sql })
  });
  console.log('Delete status:', response.status, await response.text());
}

main();
