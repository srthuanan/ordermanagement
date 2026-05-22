import fetch from 'node-fetch';

const supabaseUrl = 'https://txcivsdgjkmlrjxramos.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4Y2l2c2RnamttbHJqeHJhbW9zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODY1MDYwOCwiZXhwIjoyMDk0MjI2NjA4fQ.zJhHCyEvpJQF3yKoxokYpJlY4dJY96sJBpB3IdQ5WcQ';

async function fixRLS() {
  const query = `
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    CREATE POLICY "Users can update own profile" 
    ON public.profiles 
    FOR UPDATE 
    USING (auth.uid() = id);
  `;
  
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`
    },
    body: JSON.stringify({ query })
  });

  if (!res.ok) {
    // try direct connection or another rpc if exec_sql doesn't exist
    console.log('exec_sql failed:', await res.text());
  } else {
    console.log('exec_sql success');
  }
}

fixRLS();
