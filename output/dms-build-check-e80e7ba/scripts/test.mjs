import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Testing...');
  const res = await supabase.from('vehicle_configs').insert([{ type: 'color_mapping_exterior', value: 'Test', parent_value: 'EC Van___Base' }]);
  console.log(JSON.stringify(res, null, 2));
}
run().catch(console.error);
