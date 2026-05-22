import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://txcivsdgjkmlrjxramos.supabase.co';
// We use the service_role key to create a user, then log in
const supabaseService = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4Y2l2c2RnamttbHJqeHJhbW9zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODY1MDYwOCwiZXhwIjoyMDk0MjI2NjA4fQ.zJhHCyEvpJQF3yKoxokYpJlY4dJY96sJBpB3IdQ5WcQ');

const supabaseAnon = createClient(supabaseUrl, 'sb_publishable_Tfm5RChLrn3OrFTyD5O81Q_HMf36QBc');

async function testRpcAuthenticated() {
  console.log('Creating a test user...');
  const testEmail = `test_${Date.now()}@example.com`;
  const { data: user, error: createError } = await supabaseService.auth.admin.createUser({
    email: testEmail,
    password: 'password123',
    email_confirm: true
  });
  
  if (createError) {
    console.error('Create user error:', createError);
    return;
  }

  console.log('Logging in...');
  const { data: session, error: loginError } = await supabaseAnon.auth.signInWithPassword({
    email: testEmail,
    password: 'password123'
  });

  if (loginError) {
    console.error('Login error:', loginError);
    return;
  }

  console.log('Testing RPC rpc_hold_car with Authenticated Key...');
  const { data, error } = await supabaseAnon.rpc('rpc_hold_car', {
    p_vin: 'TESTVIN123',
    p_username: testEmail,
    p_full_name: 'Test User'
  });
  
  console.log('Data:', data);
  console.log('Error:', error);

  console.log('Cleaning up...');
  await supabaseService.auth.admin.deleteUser(user.user.id);
}

testRpcAuthenticated();
