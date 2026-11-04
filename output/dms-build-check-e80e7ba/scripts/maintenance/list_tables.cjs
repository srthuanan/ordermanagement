const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

async function listTables() {
  const { data, error } = await supabase.rpc('get_tables'); // If a RPC exists
  if (error) {
    // If RPC fails, try a direct query via a sneaky way or just check known tables
    console.log('RPC get_tables failed. Trying direct query...');
    const { data: tables, error: err } = await supabase
      .from('donhang')
      .select('count')
      .limit(1);
    console.log('Table donhang exists.');
  } else {
    console.log('Tables:', data);
  }
}

async function searchEverywhere() {
    const tables = ['donhang', 'tvbh_emails', 'users', 'history_log']; // Common tables
    for(const table of tables) {
        try {
            const { data, error } = await supabase.from(table).select('*').limit(1);
            if(!error) console.log(`Table ${table} exists.`);
        } catch(e) {}
    }
}

searchEverywhere();
