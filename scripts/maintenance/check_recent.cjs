const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

async function checkRecent() {
  console.log('Checking last 50 orders...');

  const { data, error } = await supabase
    .from('donhang')
    .select('so_don_hang, ten_khach_hang, vin, thoi_gian_nhap')
    .order('thoi_gian_nhap', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching recent orders:', error);
    return;
  }

  // Filter in JS to be sure
  const matches = data.filter(r => r.vin && (r.vin.includes('739648') || r.vin.includes('739589')));
  console.log('Matches in recent 50:', matches);
  
  if (matches.length === 0) {
      console.log('First 5 VINs for context:');
      console.log(data.slice(0, 5).map(r => r.vin));
  }
}

checkRecent();
