const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

async function searchGlobal() {
  const target = '739648';
  console.log(`Searching for "${target}" in all columns...`);

  const { data, error } = await supabase
    .from('donhang')
    .select('*');

  if (error) {
    console.error('Error fetching all data:', error);
    return;
  }

  const results = data.filter(row => {
    return Object.values(row).some(val => String(val).includes(target));
  });

  console.log('Search results:', results);
}

searchGlobal();
