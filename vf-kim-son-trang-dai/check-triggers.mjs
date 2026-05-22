import fetch from 'node-fetch';

const supabaseUrl = 'https://txcivsdgjkmlrjxramos.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4Y2l2c2RnamttbHJqeHJhbW9zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODY1MDYwOCwiZXhwIjoyMDk0MjI2NjA4fQ.zJhHCyEvpJQF3yKoxokYpJlY4dJY96sJBpB3IdQ5WcQ'; 

async function runSql(sqlString) {
  const response = await fetch(`${supabaseUrl}/functions/v1/run-sql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
    body: JSON.stringify({ sqlString })
  });
  return response.json();
}

async function main() {
  // Check all triggers on car_hold_activities and khoxe
  console.log('=== Triggers ===');
  const triggers = await runSql(`
    SELECT trigger_name, event_object_table, action_statement
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    ORDER BY event_object_table, trigger_name;
  `);
  console.log(JSON.stringify(triggers.result, null, 2));

  // Check all functions that call refresh_user_reputation
  console.log('\n=== Functions calling refresh_user_reputation ===');
  const funcs = await runSql(`
    SELECT proname, prosrc 
    FROM pg_proc 
    WHERE pronamespace = 'public'::regnamespace 
    AND prosrc ILIKE '%refresh_user_reputation%';
  `);
  console.log('Count:', funcs.result?.length);
  funcs.result?.forEach(f => console.log('-', f.proname));

  // Check if refresh_user_reputation still exists
  console.log('\n=== Does refresh_user_reputation exist? ===');
  const exists = await runSql(`
    SELECT proname FROM pg_proc 
    WHERE proname = 'refresh_user_reputation' 
    AND pronamespace = 'public'::regnamespace;
  `);
  console.log(JSON.stringify(exists.result, null, 2));
}

main();
