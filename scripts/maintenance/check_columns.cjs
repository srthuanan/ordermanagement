const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

async function checkColumns() {
  const { data, error } = await supabase.from('donhang').select('*').limit(1);
  if (data && data.length > 0) {
    console.log('Columns in donhang:', Object.keys(data[0]));
  }
}

checkColumns();
