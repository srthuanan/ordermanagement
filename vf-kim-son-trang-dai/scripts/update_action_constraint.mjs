import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://txcivsdgjkmlrjxramos.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_ACCESS_TOKEN || process.env.VITE_SUPABASE_ANON_KEY; 

const sql = `
do $$
begin
  alter table public.car_hold_activities drop constraint if exists car_hold_activities_action_check;
exception
  when others then null;
end $$;
`;

async function applySql() {
  console.log('Applying SQL constraint drop...');
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/run-sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        sqlString: sql
      })
    });
    const text = await response.text();
    console.log('Response:', response.status, text);
  } catch (err) {
    console.error('Exception:', err);
  }
}

applySql();
