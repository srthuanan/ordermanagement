import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = Object.fromEntries(
  envFile.split('\n')
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const idx = line.indexOf('=');
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    })
);

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing credentials in .env.local', { supabaseUrl, supabaseKey });
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Checking yeucauxhd...');
  
  // Try inserting a dummy row to see the exact error
  const { data, error } = await supabase.from('yeucauxhd').insert({
    so_don_hang: 'TEST-123',
    ten_khach_hang: 'Test',
    status: 'pending'
  });
  
  console.log('Insert Result:', data);
  console.log('Insert Error:', error);
}

check();
