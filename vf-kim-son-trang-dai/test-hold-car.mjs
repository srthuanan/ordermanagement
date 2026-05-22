import fetch from 'node-fetch';

const supabaseUrl = 'https://txcivsdgjkmlrjxramos.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4Y2l2c2RnamttbHJqeHJhbW9zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODY1MDYwOCwiZXhwIjoyMDk0MjI2NjA4fQ.zJhHCyEvpJQF3yKoxokYpJlY4dJY96sJBpB3IdQ5WcQ'; 

async function testHoldCar() {
  console.log('Testing hold-car Edge Function...');
  const url = 'https://txcivsdgjkmlrjxramos.functions.supabase.co/hold-car';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey,
    },
    body: JSON.stringify({ p_vin: 'TESTVIN123', p_username: 'testuser', p_full_name: 'Test User' })
  });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Body:', text);
}

testHoldCar();
