import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://txcivsdgjkmlrjxramos.supabase.co';
const supabaseKey = 'sb_publishable_Tfm5RChLrn3OrFTyD5O81Q_HMf36QBc'; 

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRpc() {
  console.log('Testing RPC rpc_hold_car with Anon Key...');
  const { data, error } = await supabase.rpc('rpc_hold_car', {
    p_vin: 'TESTVIN123',
    p_username: 'testuser',
    p_full_name: 'Test User'
  });
  console.log('Data:', data);
  console.log('Error:', error);
}

testRpc();
