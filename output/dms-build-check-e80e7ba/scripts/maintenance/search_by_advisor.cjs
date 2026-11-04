const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

async function searchByAdvisor() {
  const advisor = 'PHẠM THÀNH NHÂN';
  console.log(`Searching for orders by advisor "${advisor}"...`);

  const { data, error } = await supabase
    .from('donhang')
    .select('so_don_hang, ten_khach_hang, vin, ten_tu_van_ban_hang')
    .ilike('ten_tu_van_ban_hang', `%${advisor}%`)
    .order('thoi_gian_nhap', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error searching orders:', error);
    return;
  }

  console.log('Search results:', data);
}

searchByAdvisor();
